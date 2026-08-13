import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = "/docker/feishu-cursor-bridge";
const PROJECT_ID = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";
const token = fs.readFileSync(path.join(__dirname, "admin.token"), "utf8").trim();
const FILES = [
  "docker-compose.yml",
  "src/conversation-log.ts",
  "src/backfill.ts",
  "src/config.ts",
  "src/health.ts",
  "src/index.ts",
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

console.log("[clean]", JSON.stringify(await project("clean")).slice(0, 160));
console.log("[build]", JSON.stringify(await project("build")).slice(0, 220));
console.log("[start]", JSON.stringify(await project("start")).slice(0, 100));

for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const h = await (await fetch(HEALTH)).json();
    console.log(`[health] ok=${h.ok} ws=${h.wsReady} up=${h.uptimeSec} events=${h.eventsTotal}`);
    if (h.ok && h.wsReady) break;
  } catch (e) {
    console.log("[wait]", e.message);
  }
}

const status = await (
  await fetch(
    `http://192.168.1.82:8787/admin/log-status?token=${encodeURIComponent(token)}`,
  )
).json();
console.log("[log-status]", JSON.stringify(status));

const backfill = await (
  await fetch(
    `http://192.168.1.82:8787/admin/backfill?format=json&token=${encodeURIComponent(token)}&limit=40`,
  )
).json();
console.log("[backfill]", JSON.stringify(backfill));

const list = await (
  await fetch(
    `http://192.168.1.82:8787/admin/conversations?format=json&token=${encodeURIComponent(token)}`,
  )
).json();
console.log(
  "[list]",
  JSON.stringify({
    threads: list.threads?.length,
    events: list.events?.length,
    first: list.threads?.[0]?.lastPreview?.slice(0, 80),
  }),
);

await browser.disconnect();
process.exit(status.writeOk > 0 || (list.threads?.length || 0) > 0 ? 0 : 2);
