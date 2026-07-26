import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = "/docker/feishu-cursor-bridge";
const PROJECT_ID = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";

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
  console.log("uploaded", rel);
}

await upload("docker-compose.yml");
await upload("src/health.ts");

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

console.log("clean", JSON.stringify(await project("clean")).slice(0, 180));
console.log("build", JSON.stringify(await project("build")).slice(0, 220));
console.log("start", JSON.stringify(await project("start")).slice(0, 120));

for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  try {
    const h = await (await fetch(HEALTH, { signal: AbortSignal.timeout(4000) })).json();
    console.log(
      `health up=${h.uptimeSec} pid=${h.pid} ok=${h.ok} ws=${h.wsReady} maxSilent=${h.maxSilentMs}`,
    );
    if (h.ok && h.wsReady && h.maxSilentMs === 2700000 && h.uptimeSec >= 5) {
      console.log("FINAL", JSON.stringify(h, null, 2));
      await browser.disconnect();
      process.exit(0);
    }
  } catch (e) {
    console.log("wait", e.message);
  }
}
await browser.disconnect();
process.exit(2);
