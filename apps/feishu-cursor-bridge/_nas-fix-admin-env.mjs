/**
 * Ensure NAS .env has ADMIN_TOKEN + CONVERSATION_LOG, recreate container to reload env_file.
 * Never prints token value.
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

// Prefer reusing local .env token so PC and NAS share one admin URL
let adminToken = "";
try {
  const local = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  adminToken = (local.match(/^ADMIN_TOKEN=(.+)$/m) || [])[1]?.trim() || "";
} catch {
  /* ignore */
}
if (!adminToken || adminToken.length < 16) {
  adminToken = crypto.randomBytes(24).toString("hex");
}

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

const result = await page.evaluate(
  async ({ dest, adminToken }) => {
    const syno = SYNO.SDS.Session.SynoToken;

    async function download(p) {
      const res = await fetch(
        "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
          encodeURIComponent(JSON.stringify(p)) +
          "&mode=download&SynoToken=" +
          encodeURIComponent(syno),
        { credentials: "include", headers: { "X-SYNO-TOKEN": syno } },
      );
      const buf = await res.arrayBuffer();
      return new TextDecoder().decode(buf);
    }

    async function uploadText(dir, name, text) {
      const bin = new TextEncoder().encode(text);
      const form = new FormData();
      form.set("api", "SYNO.FileStation.Upload");
      form.set("version", "2");
      form.set("method", "upload");
      form.set("path", dir);
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
    }

    let text = await download(`${dest}/.env`);
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      return { ok: false, reason: "download_html", len: text.length };
    }

    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const map = new Map();
    const order = [];
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith("#")) {
        order.push({ type: "raw", line });
        continue;
      }
      const eq = line.indexOf("=");
      if (eq < 0) {
        order.push({ type: "raw", line });
        continue;
      }
      const k = line.slice(0, eq);
      const v = line.slice(eq + 1);
      if (!map.has(k)) order.push({ type: "key", key: k });
      map.set(k, v);
    }
    map.set("CONVERSATION_LOG", "true");
    map.set("ADMIN_TOKEN", adminToken);
    if (![...order].some((x) => x.type === "key" && x.key === "CONVERSATION_LOG")) {
      order.push({ type: "key", key: "CONVERSATION_LOG" });
    }
    if (![...order].some((x) => x.type === "key" && x.key === "ADMIN_TOKEN")) {
      order.push({ type: "key", key: "ADMIN_TOKEN" });
    }

    const out = order
      .map((x) => (x.type === "raw" ? x.line : `${x.key}=${map.get(x.key)}`))
      .join("\n");
    const normalized = out.endsWith("\n") ? out : `${out}\n`;
    const up = await uploadText(dest, ".env", normalized);

    // verify
    const again = await download(`${dest}/.env`);
    const m = again.match(/^ADMIN_TOKEN=(.+)$/m);
    const tok = m?.[1]?.trim() || "";
    return {
      ok: !!up.success && tok.length >= 16,
      upload: up.success,
      tokenLen: tok.length,
      hasConvLog: /^CONVERSATION_LOG=true/m.test(again),
      envBytes: again.length,
    };
  },
  { dest: DEST, adminToken },
);

console.log("[env]", JSON.stringify(result));
if (!result.ok) {
  await browser.disconnect();
  process.exit(3);
}

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

console.log("[clean]", JSON.stringify(await project("clean")).slice(0, 200));
console.log("[build]", JSON.stringify(await project("build")).slice(0, 250));
console.log("[start]", JSON.stringify(await project("start")).slice(0, 120));

for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  try {
    const h = await (await fetch(HEALTH, { signal: AbortSignal.timeout(4000) })).json();
    console.log(`[health] ok=${h.ok} ws=${h.wsReady} up=${h.uptimeSec}`);
    if (h.ok && h.wsReady && h.uptimeSec >= 1) break;
  } catch (e) {
    console.log("[wait]", e.message);
  }
}

const probe = await page.evaluate(async (adminToken) => {
  const no = await fetch("http://192.168.1.82:8787/admin/conversations");
  const yes = await fetch(
    "http://192.168.1.82:8787/admin/conversations?format=json&token=" +
      encodeURIComponent(adminToken),
  );
  const yesBody = await yes.text();
  return {
    noStatus: no.status,
    yesStatus: yes.status,
    hasThreads: yesBody.includes('"threads"'),
  };
}, adminToken);

console.log("[probe]", JSON.stringify(probe));
console.log(
  JSON.stringify({
    url: "http://192.168.1.82:8787/admin/conversations?token=<ADMIN_TOKEN>",
    tokenSource: "NAS /docker/feishu-cursor-bridge/.env (same as local .env if present)",
    adminEnabled: probe.yesStatus === 200,
  }),
);

await browser.disconnect();
process.exit(probe.yesStatus === 200 ? 0 : 2);
