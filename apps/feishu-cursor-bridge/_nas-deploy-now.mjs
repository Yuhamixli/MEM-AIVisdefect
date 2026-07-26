/**
 * Upload fix files + build/start feishu-cursor-bridge on logged-in DSM (CDP :9333).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, "..", "feishu-cursor-bridge-nas-fix");
const DEST = "/docker/feishu-cursor-bridge";
const FILES = [".npmrc", "Dockerfile", "package-lock.json"];
const HEALTH = "http://192.168.1.82:8787/health";
const log = (...a) => console.log(`[nas ${new Date().toISOString()}]`, ...a);

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9333",
  defaultViewport: null,
});
const pages = await browser.pages();
const page = pages.find(async () => false);
let target = null;
for (const p of pages) {
  const ok = await p.evaluate(() => !!(window.SYNO?.SDS?.Session?.SynoToken)).catch(() => false);
  if (ok) {
    target = p;
    break;
  }
}
if (!target) {
  console.error("No logged-in DSM page");
  process.exit(1);
}
log("session", await target.evaluate(() => SYNO.SDS.Session.user));

for (const name of FILES) {
  const b64 = fs.readFileSync(path.join(FIX, name)).toString("base64");
  const r = await target.evaluate(
    async ({ dest, name, b64 }) => {
      const token = SYNO.SDS.Session.SynoToken;
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.set("api", "SYNO.FileStation.Upload");
      form.set("version", "2");
      form.set("method", "upload");
      form.set("path", dest);
      form.set("create_parents", "true");
      form.set("overwrite", "true");
      form.set("file", new Blob([bin]), name);
      const res = await fetch("/webapi/entry.cgi", {
        method: "POST",
        credentials: "include",
        headers: { "X-SYNO-TOKEN": token },
        body: form,
      });
      return res.json();
    },
    { dest: DEST, name, b64 },
  );
  if (!r.success) throw new Error(`upload ${name}: ${JSON.stringify(r)}`);
  log("uploaded", name);
}

const listing = await target.evaluate(async () => {
  const token = SYNO.SDS.Session.SynoToken;
  const r = await fetch(
    "/webapi/entry.cgi?api=SYNO.FileStation.List&version=2&method=list&folder_path=" +
      encodeURIComponent('"/docker/feishu-cursor-bridge"') +
      "&SynoToken=" +
      encodeURIComponent(token),
    { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
  );
  return r.json();
});
const names = (listing.data?.files || []).map((f) => f.name);
log(
  "verify",
  FILES.map((f) => `${f}=${names.includes(f)}`).join(" "),
);

// Discover Docker APIs
const apis = await target.evaluate(async () => {
  const r = await fetch(
    "/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=ALL",
    { credentials: "include" },
  );
  const j = await r.json();
  const keys = Object.keys(j.data || {}).filter((k) => /Docker|Container/i.test(k));
  const pick = {};
  for (const k of keys) pick[k] = j.data[k];
  return pick;
});
log("docker apis", Object.keys(apis).join(", "));

async function callApi(api, version, method, extra = {}) {
  return target.evaluate(
    async ({ api, version, method, extra }) => {
      const token = SYNO.SDS.Session.SynoToken;
      const u = new URL("/webapi/entry.cgi", location.origin);
      u.searchParams.set("api", api);
      u.searchParams.set("version", String(version));
      u.searchParams.set("method", method);
      u.searchParams.set("SynoToken", token);
      for (const [k, v] of Object.entries(extra)) {
        u.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
      const r = await fetch(u.toString(), {
        credentials: "include",
        headers: { "X-SYNO-TOKEN": token },
      });
      return r.json();
    },
    { api, version, method, extra },
  );
}

// List projects
let projects = null;
for (const [api, meta] of Object.entries(apis)) {
  if (!/Project/i.test(api)) continue;
  const ver = meta.maxVersion || 1;
  for (const method of ["list", "get", "list_projects"]) {
    const j = await callApi(api, ver, method, {});
    if (j.success) {
      projects = { api, method, ver, j };
      break;
    }
  }
  if (projects) break;
}
log("projects", JSON.stringify(projects).slice(0, 1200));

// Try build/start with common method names
const name = "feishu-cursor-bridge";
const actions = [];
for (const [api, meta] of Object.entries(apis)) {
  if (!/Project/i.test(api)) continue;
  const ver = meta.maxVersion || 1;
  for (const method of ["build", "start", "compose_build", "compose_up", "up"]) {
    const j = await callApi(api, ver, method, { name, id: name, project_name: name });
    actions.push({ api, method, success: j.success, err: j.error });
    if (j.success) log("ok", api, method);
  }
}
log("actions", JSON.stringify(actions).slice(0, 1500));

// UI fallback: launch Container Manager and click Build
await target.evaluate(() => {
  try {
    SYNO.SDS.AppLaunch("SYNO.SDS.Docker.Application", {}, null);
  } catch (_) {
    try {
      SYNO.SDS.AppLaunch("SYNO.SDS.ContainerManager.Application", {}, null);
    } catch (__) {}
  }
});
await new Promise((r) => setTimeout(r, 3000));

// Poll health while user/UI may build — also try docker socket via Synology
async function pollHealth(ms = 10 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(HEALTH, { signal: AbortSignal.timeout(4000) });
      const t = await r.text();
      if (r.ok) {
        log("HEALTH", t);
        return JSON.parse(t);
      }
      log("health", r.status, t.slice(0, 100));
    } catch (e) {
      log("health wait", e.message || e);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

// If API build failed, drive UI with Puppeteer clicks
const anyOk = actions.some((a) => a.success);
if (!anyOk) {
  log("driving Container Manager UI…");
  await target.bringToFront();
  // Wait for project text
  for (let i = 0; i < 20; i++) {
    const has = await target.evaluate(() =>
      (document.body.innerText || "").includes("feishu-cursor-bridge"),
    );
    if (has) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Click project name
  await target.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find(
      (e) => (e.textContent || "").trim() === "feishu-cursor-bridge" && e.children.length === 0,
    );
    el?.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  // Open Action menu and Build
  const clicked = await target.evaluate(() => {
    const action = [...document.querySelectorAll('[role="combobox"],button,div')].find((e) =>
      /^(Action|操作)$/.test((e.textContent || "").trim()),
    );
    action?.click();
    return !!action;
  });
  log("action menu", clicked);
  await new Promise((r) => setTimeout(r, 800));
  const buildClick = await target.evaluate(() => {
    const item = [...document.querySelectorAll('[role="menuitem"],li,div,span')].find((e) =>
      /^(Build|构建)$/.test((e.textContent || "").trim()),
    );
    item?.click();
    return item ? (item.textContent || "").trim() : null;
  });
  log("build click", buildClick);
}

// Wait for build terminal success then start
const buildDone = await target.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 120; i++) {
    const text = document.body.innerText || "";
    if (/Successfully tagged|Successfully built|Built project/i.test(text) && !/npm ERR|returned a non-zero code|ERROR/i.test(text.slice(-2000))) {
      // still may have old error text — look at recent
      const tail = text.slice(-3000);
      if (/returned a non-zero code|npm ERR|ERROR: failed/i.test(tail) && !/Successfully tagged|Successfully built/i.test(tail)) {
        await sleep(5000);
        continue;
      }
      if (/Successfully tagged|Successfully built/i.test(tail)) return { ok: true, tail };
    }
    if (/returned a non-zero code|npm ERR!|ERROR: failed to/i.test(text.slice(-1500))) {
      // give build more time if still running
      if (/Step \d+\/\d+/i.test(text.slice(-800))) {
        await sleep(5000);
        continue;
      }
    }
    await sleep(5000);
  }
  return { ok: false, tail: (document.body.innerText || "").slice(-2500) };
});
log("buildDone", JSON.stringify(buildDone).slice(0, 2000));

// Start
await target.evaluate(() => {
  const action = [...document.querySelectorAll('[role="combobox"],button,div')].find((e) =>
    /^(Action|操作)$/.test((e.textContent || "").trim()),
  );
  action?.click();
});
await new Promise((r) => setTimeout(r, 600));
await target.evaluate(() => {
  const item = [...document.querySelectorAll('[role="menuitem"],li,div,span')].find((e) =>
    /^(Start|启动)$/.test((e.textContent || "").trim()),
  );
  item?.click();
});
log("start clicked");

const health = await pollHealth();
await browser.disconnect();
if (health?.ok) {
  log("SUCCESS — stop PC npm run watchdog");
  process.exit(0);
}
log("FAILED health");
process.exit(2);
