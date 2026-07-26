/**
 * Connect to Chrome CDP (port 9333), wait for DSM login, upload fix files, build+start project.
 * Usage: node _nas-deploy-cdp.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX_DIR = path.join(__dirname, "..", "feishu-cursor-bridge-nas-fix");
const DEST = "/docker/feishu-cursor-bridge";
const FILES = [".npmrc", "Dockerfile", "package-lock.json"];
const HEALTH = "http://192.168.1.82:8787/health";

function log(...a) {
  console.log(`[nas-deploy ${new Date().toISOString()}]`, ...a);
}

async function waitForLogin(page, timeoutMs = 10 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    const loggedIn = await page.evaluate(() => {
      try {
        return !!(window.SYNO && SYNO.SDS && SYNO.SDS.Session && SYNO.SDS.Session.SynoToken);
      } catch {
        return false;
      }
    });
    if (loggedIn && !/#\/signin/.test(url)) {
      const token = await page.evaluate(() => SYNO.SDS.Session.SynoToken);
      log("logged in, SynoToken ok");
      return token;
    }
    log("waiting for DSM login…", url);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("DSM login timeout (10 min)");
}

async function uploadFiles(page) {
  for (const name of FILES) {
    const abs = path.join(FIX_DIR, name);
    const b64 = fs.readFileSync(abs).toString("base64");
    const result = await page.evaluate(
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
        const r = await fetch("/webapi/entry.cgi", {
          method: "POST",
          credentials: "include",
          headers: { "X-SYNO-TOKEN": token },
          body: form,
        });
        return r.json();
      },
      { dest: DEST, name, b64 },
    );
    if (!result.success) throw new Error(`upload ${name}: ${JSON.stringify(result)}`);
    log("uploaded", name);
  }
}

async function openContainerManager(page) {
  // Launch Container Manager app if possible
  await page.evaluate(() => {
    try {
      if (SYNO.SDS.AppLaunch) {
        SYNO.SDS.AppLaunch("SYNO.SDS.Docker.Application", {}, null);
      }
    } catch (_) {}
  });
  await new Promise((r) => setTimeout(r, 2500));
}

async function dockerComposeViaApi(page, action) {
  // Try Synology Docker compose project API (varies by DSM version)
  const result = await page.evaluate(async (action) => {
    const token = SYNO.SDS.Session.SynoToken;
    const tries = [
      {
        api: "SYNO.Docker.Project",
        version: 1,
        method: action, // build / start
        name: "feishu-cursor-bridge",
      },
      {
        api: "SYNO.Docker.Project",
        version: 1,
        method: action,
        id: "feishu-cursor-bridge",
      },
    ];
    const out = [];
    for (const t of tries) {
      const u = new URL("/webapi/entry.cgi", location.origin);
      Object.entries(t).forEach(([k, v]) => u.searchParams.set(k, String(v)));
      u.searchParams.set("SynoToken", token);
      const r = await fetch(u, {
        credentials: "include",
        headers: { "X-SYNO-TOKEN": token },
      });
      const j = await r.json();
      out.push({ try: t, j });
      if (j.success) return { ok: true, out };
    }
    // probe available docker APIs
    const info = await (
      await fetch(
        "/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.Docker",
        { credentials: "include" },
      )
    ).json();
    return { ok: false, out, info };
  }, action);
  return result;
}

async function pollHealth(timeoutMs = 8 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(HEALTH, { signal: AbortSignal.timeout(4000) });
      const text = await r.text();
      if (r.ok) {
        log("health", text);
        return JSON.parse(text);
      }
      log("health status", r.status, text.slice(0, 120));
    } catch (e) {
      log("health wait…", String(e.message || e));
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9333",
  defaultViewport: null,
});
const pages = await browser.pages();
let page =
  pages.find((p) => p.url().includes("192.168.1.82")) ||
  pages.find((p) => p.url().includes("5000")) ||
  pages[0];
if (!page.url().includes("192.168.1.82")) {
  await page.goto("http://192.168.1.82:5000/", { waitUntil: "domcontentloaded" });
}

log("page", page.url());
await waitForLogin(page);
await uploadFiles(page);

const listed = await page.evaluate(async () => {
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
const names = (listed.data?.files || []).map((f) => f.name);
log(
  "folder has",
  FILES.map((f) => `${f}:${names.includes(f)}`).join(" "),
);

await openContainerManager(page);
const build = await dockerComposeViaApi(page, "build");
log("build api", JSON.stringify(build).slice(0, 800));
const start = await dockerComposeViaApi(page, "start");
log("start api", JSON.stringify(start).slice(0, 800));

// Also try docker compose via SYNO.Core.Package or Container Manager websocket — fallback message
if (!build.ok) {
  log(
    "API build unavailable — please click Action→Build then Start in Container Manager UI; script will poll health",
  );
}

const health = await pollHealth();
if (!health) {
  log("FAIL: health not ready");
  process.exit(2);
}
if (health.ok) {
  log("SUCCESS — stop PC npm run watchdog now");
  process.exit(0);
}
log("health not ok", health);
process.exit(3);
