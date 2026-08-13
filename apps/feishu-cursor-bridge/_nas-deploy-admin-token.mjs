/**
 * Upload admin.token + conv-log sources, recreate with compose mount.
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

let token = "";
try {
  token = (fs.readFileSync(path.join(__dirname, ".env"), "utf8").match(/^ADMIN_TOKEN=(.+)$/m) || [])[1]?.trim() || "";
} catch {
  /* ignore */
}
if (!token) {
  try {
    token = fs.readFileSync(path.join(__dirname, "admin.token"), "utf8").trim();
  } catch {
    /* ignore */
  }
}
if (!token || token.length < 16) {
  token = crypto.randomBytes(24).toString("hex");
}
fs.writeFileSync(path.join(__dirname, "admin.token"), `${token}\n`, "utf8");

const FILES = [
  "admin.token",
  "docker-compose.yml",
  "src/config.ts",
  "src/conversation-log.ts",
  "src/health.ts",
  "src/index.ts",
  "README.md",
];

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
  const posix = rel.replaceAll("\\", "/");
  const destDir = path.posix.dirname(`${DEST}/${posix}`);
  const name = path.posix.basename(posix);
  const r = await page.evaluate(
    async ({ destDir, name, b64 }) => {
      const syno = SYNO.SDS.Session.SynoToken;
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
        headers: { "X-SYNO-TOKEN": syno },
        body: form,
      });
      return res.json();
    },
    { destDir, name, b64 },
  );
  if (!r.success) throw new Error(`upload ${rel}: ${JSON.stringify(r)}`);
  console.log("[up]", rel);
}

for (const f of FILES) await upload(f);

// verify admin.token on NAS (length only)
const verify = await page.evaluate(async (dest) => {
  const syno = SYNO.SDS.Session.SynoToken;
  const res = await fetch(
    "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
      encodeURIComponent(JSON.stringify(`${dest}/admin.token`)) +
      "&mode=download&SynoToken=" +
      encodeURIComponent(syno),
    { credentials: "include", headers: { "X-SYNO-TOKEN": syno } },
  );
  const t = (await res.text()).trim();
  return { len: t.length, ok: t.length >= 16 && !t.includes("<html") };
}, DEST);
console.log("[verify-token-file]", JSON.stringify(verify));
if (!verify.ok) {
  await browser.disconnect();
  process.exit(3);
}

async function project(method) {
  return page.evaluate(
    async ({ id, method }) => {
      const syno = SYNO.SDS.Session.SynoToken;
      const body = new URLSearchParams({
        api: "SYNO.Docker.Project",
        version: "1",
        method,
        id: JSON.stringify(id),
        SynoToken: syno,
      });
      const res = await fetch("/webapi/entry.cgi", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-SYNO-TOKEN": syno,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
      });
      return res.json();
    },
    { id: PROJECT_ID, method },
  );
}

console.log("[clean]", JSON.stringify(await project("clean")).slice(0, 180));
console.log("[build]", JSON.stringify(await project("build")).slice(0, 280));
console.log("[start]", JSON.stringify(await project("start")).slice(0, 120));

for (let i = 0; i < 24; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const h = await (await fetch(HEALTH, { signal: AbortSignal.timeout(4000) })).json();
    console.log(`[health] ok=${h.ok} ws=${h.wsReady} up=${h.uptimeSec}`);
    if (h.ok && h.wsReady) break;
  } catch (e) {
    console.log("[wait]", e.message);
  }
}

const probe = await fetch(
  `http://192.168.1.82:8787/admin/conversations?format=json&token=${encodeURIComponent(token)}`,
  { signal: AbortSignal.timeout(5000) },
);
const body = await probe.text();
const denied = await fetch("http://192.168.1.82:8787/admin/conversations", {
  signal: AbortSignal.timeout(4000),
});
console.log(
  JSON.stringify({
    adminStatus: probe.status,
    deniedStatus: denied.status,
    hasThreads: body.includes("threads"),
    healthUrl: HEALTH,
    adminUrl: "http://192.168.1.82:8787/admin/conversations?token=<from admin.token or .env ADMIN_TOKEN>",
  }),
);

await browser.disconnect();
process.exit(probe.status === 200 && denied.status === 401 ? 0 : 2);
