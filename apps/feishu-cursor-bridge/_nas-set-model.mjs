/**
 * Set CURSOR_MODEL on NAS .env and recreate the compose project.
 */
import puppeteer from "puppeteer-core";

const MODEL = "grok-4.5";
const DEST = "/docker/feishu-cursor-bridge";
const PROJECT_ID = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";
const log = (...a) => console.log(`[model ${new Date().toISOString()}]`, ...a);

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
log("session ok");

const updated = await page.evaluate(
  async ({ dest, model }) => {
    const token = SYNO.SDS.Session.SynoToken;
    const path = `${dest}/.env`;
    const dl = await fetch(
      "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&mode=open&path=" +
        encodeURIComponent(JSON.stringify(path)) +
        "&SynoToken=" +
        encodeURIComponent(token),
      { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
    );
    if (!dl.ok) return { ok: false, step: "download", status: dl.status };
    let text = await dl.text();
    const before = (text.match(/^CURSOR_MODEL=.*$/m) || [])[0] || "(missing)";
    if (/^CURSOR_MODEL=/m.test(text)) {
      text = text.replace(/^CURSOR_MODEL=.*$/m, `CURSOR_MODEL=${model}`);
    } else {
      text = text.replace(/\s*$/, `\nCURSOR_MODEL=${model}\n`);
    }
    const after = (text.match(/^CURSOR_MODEL=.*$/m) || [])[0];
    const form = new FormData();
    form.set("api", "SYNO.FileStation.Upload");
    form.set("version", "2");
    form.set("method", "upload");
    form.set("path", dest);
    form.set("create_parents", "true");
    form.set("overwrite", "true");
    form.set("file", new Blob([text]), ".env");
    const up = await fetch("/webapi/entry.cgi", {
      method: "POST",
      credentials: "include",
      headers: { "X-SYNO-TOKEN": token },
      body: form,
    });
    const uj = await up.json();
    return { ok: !!uj.success, before, after, upload: uj };
  },
  { dest: DEST, model: MODEL },
);
log("env", JSON.stringify(updated));
if (!updated.ok) {
  process.exit(1);
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
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text.slice(0, 300) };
      }
    },
    { id: PROJECT_ID, method },
  );
}

// Recreate so env_file is re-read
log("clean", JSON.stringify(await project("clean")).slice(0, 180));
log("build", JSON.stringify(await project("build")).slice(0, 250));
log("start", JSON.stringify(await project("start")).slice(0, 180));

for (let i = 0; i < 20; i++) {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(4000) });
    const t = await r.text();
    log("health", t);
    if (r.ok && t.includes('"ok": true') && t.includes('"wsReady": true')) {
      // Confirm model inside container env if possible
      const envCheck = await page.evaluate(async () => {
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
        const j = await res.json();
        const env = j.data?.containers?.[0]?.Config?.Env || [];
        const modelLine = env.find((e) => String(e).startsWith("CURSOR_MODEL="));
        return { status: j.data?.status, modelLine: modelLine || null };
      });
      log("container", JSON.stringify(envCheck));
      await browser.disconnect();
      process.exit(0);
    }
  } catch (e) {
    log("wait", e.message);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
await browser.disconnect();
process.exit(2);
