/**
 * Deploy conversation-log + admin UI; ensure ADMIN_TOKEN on NAS .env (no print).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = "/docker/feishu-cursor-bridge";
const PROJECT_ID = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";
const FILES = [
  "src/conversation-log.ts",
  "src/health.ts",
  "src/config.ts",
  "src/index.ts",
  "README.md",
  ".env.example",
];

const log = (...a) => console.log(`[convlog ${new Date().toISOString()}]`, ...a);

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
  console.error("NO_LOGIN — open http://192.168.1.82:5000 in CDP Chrome and reply 已登录");
  process.exit(1);
}

async function upload(rel) {
  const abs = path.join(__dirname, rel);
  const b64 = fs.readFileSync(abs).toString("base64");
  const posix = rel.replaceAll("\\", "/");
  const destDir = path.posix.dirname(`${DEST}/${posix}`);
  const name = path.posix.basename(posix);
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
    { destDir, name, b64 },
  );
  if (!r.success) throw new Error(`upload ${rel}: ${JSON.stringify(r)}`);
  log("uploaded", rel);
}

for (const f of FILES) await upload(f);

// Patch NAS .env: ensure CONVERSATION_LOG + ADMIN_TOKEN (do not log token)
const adminToken = crypto.randomBytes(24).toString("hex");
const envPatch = await page.evaluate(
  async ({ dest, adminToken }) => {
    const token = SYNO.SDS.Session.SynoToken;
    const envPath = `${dest}/.env`;
    const dl = await fetch(
      "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
        encodeURIComponent(JSON.stringify(envPath)) +
        "&mode=download&SynoToken=" +
        encodeURIComponent(token),
      { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
    );
    let text = await dl.text();
    if (!dl.ok || text.includes("<!doctype html>") || text.includes("<html")) {
      return { ok: false, reason: "env_download_failed" };
    }
    const hasAdmin = /^ADMIN_TOKEN=.+$/m.test(text);
    const hasLog = /^CONVERSATION_LOG=/m.test(text);
    let changed = false;
    if (!hasLog) {
      text = text.replace(/\s*$/, "\nCONVERSATION_LOG=true\n");
      changed = true;
    }
    if (!hasAdmin) {
      text = text.replace(/\s*$/, `\nADMIN_TOKEN=${adminToken}\n`);
      changed = true;
    } else if (/^ADMIN_TOKEN=\s*$/m.test(text)) {
      text = text.replace(/^ADMIN_TOKEN=\s*$/m, `ADMIN_TOKEN=${adminToken}`);
      changed = true;
    }
    if (!changed) {
      return {
        ok: true,
        changed: false,
        hasAdmin: true,
        tokenLen: (text.match(/^ADMIN_TOKEN=(.+)$/m) || [])[1]?.trim()?.length || 0,
      };
    }
    const b64 = btoa(unescape(encodeURIComponent(text)));
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.set("api", "SYNO.FileStation.Upload");
    form.set("version", "2");
    form.set("method", "upload");
    form.set("path", dest);
    form.set("overwrite", "true");
    form.set("file", new Blob([bin]), ".env");
    const up = await fetch("/webapi/entry.cgi", {
      method: "POST",
      credentials: "include",
      headers: { "X-SYNO-TOKEN": token },
      body: form,
    });
    const j = await up.json();
    return {
      ok: !!j.success,
      changed: true,
      tokenLen: adminToken.length,
      upload: j.success,
    };
  },
  { dest: DEST, adminToken },
);
log("env_patch", JSON.stringify(envPatch));

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
      return res.json();
    },
    { id: PROJECT_ID, method },
  );
}

log("stop", JSON.stringify(await project("stop")).slice(0, 160));
await new Promise((r) => setTimeout(r, 1500));
log("start", JSON.stringify(await project("start")).slice(0, 160));

let health = null;
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(4000) });
    health = await r.json();
    log("health", `ok=${health.ok} ws=${health.wsReady} up=${health.uptimeSec}`);
    if (health.ok && health.wsReady) break;
  } catch (e) {
    log("wait", e.message);
  }
}

// Probe admin without token (expect 401) and with wrong token
const noTok = await fetch("http://192.168.1.82:8787/admin/conversations", {
  signal: AbortSignal.timeout(4000),
}).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 120) }));
log("admin_no_token", JSON.stringify(noTok));

// Read token length only from NAS env (not value) via FileStation — confirm set
const tokCheck = await page.evaluate(async (dest) => {
  const token = SYNO.SDS.Session.SynoToken;
  const res = await fetch(
    "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
      encodeURIComponent(JSON.stringify(`${dest}/.env`)) +
      "&mode=download&SynoToken=" +
      encodeURIComponent(token),
    { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
  );
  const text = await res.text();
  const m = text.match(/^ADMIN_TOKEN=(.+)$/m);
  const v = m?.[1]?.trim() || "";
  return {
    hasToken: v.length >= 16,
    tokenLen: v.length,
    hasConvLog: /^CONVERSATION_LOG=true/m.test(text),
  };
}, DEST);
log("nas_env_check", JSON.stringify(tokCheck));

// If we know local ADMIN_TOKEN from host .env and NAS was just set with same... we used random.
// Verify admin works by reading token in-page only for probe then discard
const probe = await page.evaluate(async (dest) => {
  const token = SYNO.SDS.Session.SynoToken;
  const res = await fetch(
    "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
      encodeURIComponent(JSON.stringify(`${dest}/.env`)) +
      "&mode=download&SynoToken=" +
      encodeURIComponent(token),
    { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
  );
  const text = await res.text();
  const admin = (text.match(/^ADMIN_TOKEN=(.+)$/m) || [])[1]?.trim();
  if (!admin) return { ok: false, reason: "no_token" };
  const ar = await fetch(
    "http://192.168.1.82:8787/admin/conversations?format=json&token=" +
      encodeURIComponent(admin),
    { signal: AbortSignal.timeout(5000) },
  );
  const body = await ar.text();
  return {
    ok: ar.status === 200,
    status: ar.status,
    hasThreads: body.includes("threads"),
    snippet: body.slice(0, 80),
  };
}, DEST);
log("admin_probe", JSON.stringify(probe));

console.log(
  JSON.stringify(
    {
      health,
      adminNoTokenStatus: noTok.status,
      adminOk: probe.ok,
      nasHasAdminToken: tokCheck.hasToken,
      urlHint: "http://192.168.1.82:8787/admin/conversations?token=<ADMIN_TOKEN from NAS .env>",
    },
    null,
    2,
  ),
);

await browser.disconnect();
process.exit(health?.ok && probe.ok ? 0 : 2);
