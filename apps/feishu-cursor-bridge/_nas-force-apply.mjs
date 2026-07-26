/**
 * Upload compose + hardened watchdog/health, recreate container with bind mounts
 * so NAS files take effect even when DSM "build" skips image rebuild.
 * Optionally try deleting the old image to force a real rebuild.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = "/docker/feishu-cursor-bridge";
const PROJECT_ID = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";
const FILES = [
  "docker-compose.yml",
  "Dockerfile",
  "package.json",
  "scripts/watchdog.mjs",
  "src/health.ts",
  "src/index.ts",
  "src/config.ts",
  "src/cursor-agent.ts",
  "src/session-store.ts",
  "src/intent.ts",
  "src/feishu.ts",
  "src/chat-history.ts",
];

const log = (...a) => console.log(`[force ${new Date().toISOString()}]`, ...a);

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9333",
  defaultViewport: null,
});
let page;
for (const p of await browser.pages()) {
  if (
    await p.evaluate(() => !!(window.SYNO?.SDS?.Session?.SynoToken)).catch(() => false)
  ) {
    page = p;
    break;
  }
}
if (!page) {
  console.error("NO_LOGIN");
  process.exit(1);
}

async function upload(rel) {
  const abs = path.join(__dirname, rel);
  const b64 = fs.readFileSync(abs).toString("base64");
  const destDir = path.posix.dirname(`${DEST}/${rel.replaceAll("\\", "/")}`);
  const r = await page.evaluate(
    async ({ destDir, name, b64 }) => {
      const token = SYNO.SDS.Session.SynoToken;
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.set("api", "SYNO.FileStation.Upload");
      form.set("version", "2");
      form.set("method", "upload");
      form.set("path", destDir);
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
    { destDir, name: path.posix.basename(rel.replaceAll("\\", "/")), b64 },
  );
  if (!r.success) throw new Error(`upload ${rel}: ${JSON.stringify(r)}`);
  log("uploaded", rel);
}

for (const f of FILES) await upload(f);

async function project(method) {
  return page.evaluate(
    async ({ id, method }) => {
      const token = SYNO.SDS.Session.SynoToken;
      const body = new URLSearchParams({
        api: "SYNO.Docker.Project",
        version: "1",
        method,
        id: JSON.stringify(id),
        SynoToken: token,
      });
      const res = await fetch("/webapi/entry.cgi", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-SYNO-TOKEN": token,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text.slice(0, 400) };
      }
    },
    { id: PROJECT_ID, method },
  );
}

// Try remove old image so next build is real
const imgDel = await page.evaluate(async () => {
  const token = SYNO.SDS.Session.SynoToken;
  const names = [
    "feishu-cursor-bridge-feishu-bridge",
    "feishu-cursor-bridge-feishu-bridge:latest",
  ];
  const results = [];
  for (const name of names) {
    for (const method of ["delete", "remove"]) {
      const body = new URLSearchParams({
        api: "SYNO.Docker.Image",
        version: "1",
        method,
        name: JSON.stringify(name),
        SynoToken: token,
      });
      const res = await fetch("/webapi/entry.cgi", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-SYNO-TOKEN": token,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
      });
      results.push({ name, method, text: (await res.text()).slice(0, 200) });
    }
  }
  return results;
});
log("image_delete_tries", JSON.stringify(imgDel).slice(0, 500));

log("clean", JSON.stringify(await project("clean")).slice(0, 250));
log("build", JSON.stringify(await project("build")).slice(0, 500));
log("start", JSON.stringify(await project("start")).slice(0, 200));

// verify mounts + watchdog markers + health shape
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(4000) });
    const t = await r.text();
    log("health", t.replace(/\s+/g, " ").slice(0, 350));
    if (r.ok && t.includes('"ok": true') && t.includes("wsReady")) {
      break;
    }
  } catch (e) {
    log("wait", e.message);
  }
}

const verify = await page.evaluate(async () => {
  const token = SYNO.SDS.Session.SynoToken;
  const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
  const body = new URLSearchParams({
    api: "SYNO.Docker.Project",
    version: "1",
    method: "get",
    id: JSON.stringify(id),
    SynoToken: token,
  });
  const res = await fetch("/webapi/entry.cgi", {
    method: "POST",
    credentials: "include",
    headers: {
      "X-SYNO-TOKEN": token,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });
  const proj = await res.json();
  const c = proj.data?.containers?.[0] || {};
  const binds = c.HostConfig?.Binds || [];
  const wdRes = await fetch(
    "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
      encodeURIComponent(JSON.stringify("/docker/feishu-cursor-bridge/scripts/watchdog.mjs")) +
      "&mode=open&SynoToken=" +
      encodeURIComponent(token),
    { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
  );
  const wd = await wdRes.text();
  return {
    binds,
    hasMutex: wd.includes("already in progress") || wd.includes("coalesce"),
    hasDist: wd.includes("dist"),
    wdLen: wd.length,
  };
});
log("verify", JSON.stringify(verify));

// stability sample ~2 min
const pids = new Set();
let ok = 0;
let fail = 0;
let last = null;
for (let i = 0; i < 24; i++) {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(3000) });
    const j = await r.json();
    ok++;
    pids.add(j.pid);
    last = j;
    log(
      `stab ${i} up=${j.uptimeSec} pid=${j.pid} ok=${j.ok} stale=${j.stale} reason=${j.reason}`,
    );
  } catch {
    fail++;
    log(`stab ${i} FAIL`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
log("summary", JSON.stringify({ ok, fail, pids: [...pids], last }));
await browser.disconnect();
process.exit(ok >= 20 && pids.size === 1 && fail === 0 ? 0 : 2);
