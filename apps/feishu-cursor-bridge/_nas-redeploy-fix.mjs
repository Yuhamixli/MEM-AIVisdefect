/**
 * Upload bridge sources + Dockerfile/compose, rebuild image on Synology.
 * Runtime is image-baked dist/ (no live src mount).
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
  "Dockerfile",
  "docker-compose.yml",
  "package.json",
  "package-lock.json",
  ".npmrc",
  "tsconfig.json",
  "tsconfig.build.json",
  "scripts/watchdog.mjs",
  "src/index.ts",
  "src/config.ts",
  "src/cursor-agent.ts",
  "src/session-store.ts",
  "src/health.ts",
  "src/intent.ts",
  "src/feishu.ts",
  "src/chat-history.ts",
];

const log = (...a) => console.log(`[redeploy ${new Date().toISOString()}]`, ...a);

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

async function ensureDir(dirPath) {
  return page.evaluate(async (dirPath) => {
    const token = SYNO.SDS.Session.SynoToken;
    if (dirPath === "/docker/feishu-cursor-bridge") return;
    const parent = dirPath.replace(/\/[^/]+$/, "");
    const name = dirPath.split("/").pop();
    const url =
      "/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&version=2&method=create&folder_path=" +
      encodeURIComponent(JSON.stringify(parent)) +
      "&name=" +
      encodeURIComponent(JSON.stringify(name)) +
      "&force_parent=true&SynoToken=" +
      encodeURIComponent(token);
    await fetch(url, {
      credentials: "include",
      headers: { "X-SYNO-TOKEN": token },
    });
  }, dirPath);
}

async function upload(rel) {
  const abs = path.join(__dirname, rel);
  if (!fs.existsSync(abs)) {
    log("skip missing", rel);
    return;
  }
  const b64 = fs.readFileSync(abs).toString("base64");
  const destDir = path.posix.dirname(`${DEST}/${rel.replaceAll("\\", "/")}`);
  await ensureDir(destDir);
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

log("clean", JSON.stringify(await project("clean")).slice(0, 300));
// build may take several minutes (npm ci + tsc)
log("build… (image rebuild may take a few minutes)");
const buildRes = await project("build");
log("build", JSON.stringify(buildRes).slice(0, 800));
if (!buildRes.success) {
  console.error("BUILD_FAILED");
  await browser.disconnect();
  process.exit(3);
}
log("start", JSON.stringify(await project("start")).slice(0, 200));

for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(4000) });
    const t = await r.text();
    log("health", t.replace(/\s+/g, " ").slice(0, 280));
    if (r.ok && t.includes('"ok": true') && t.includes('"wsReady": true')) {
      await browser.disconnect();
      process.exit(0);
    }
  } catch (e) {
    log("wait", e.message);
  }
  await new Promise((r) => setTimeout(r, 5000));
}
await browser.disconnect();
process.exit(2);
