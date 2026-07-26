import puppeteer from "puppeteer-core";

const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";
const log = (...a) => console.log(`[fix ${new Date().toISOString()}]`, ...a);

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
  }
}

async function project(method, extra = {}) {
  return page.evaluate(
    async ({ id, method, extra }) => {
      const token = SYNO.SDS.Session.SynoToken;
      const body = new URLSearchParams({
        api: "SYNO.Docker.Project",
        version: "1",
        method,
        id: JSON.stringify(id),
        SynoToken: token,
        ...extra,
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
        return { raw: text.slice(0, 1500), status: res.status };
      }
    },
    { id, method, extra },
  );
}

async function containerLogs() {
  return page.evaluate(async () => {
    const token = SYNO.SDS.Session.SynoToken;
    // list containers
    const list = await (
      await fetch(
        "/webapi/entry.cgi?api=SYNO.Docker.Container&version=1&method=list&limit=-1&SynoToken=" +
          encodeURIComponent(token),
        { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
      )
    ).json();
    const c = (list.data?.containers || list.data || []).find?.(
      (x) =>
        x?.name?.includes?.("feishu") ||
        x?.Names?.some?.((n) => String(n).includes("feishu")),
    );
    // try log api
    const name = "feishu-cursor-bridge";
    const body = new URLSearchParams({
      api: "SYNO.Docker.Container.Log",
      version: "1",
      method: "get",
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
    const text = await res.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      j = { raw: text.slice(0, 2000) };
    }
    return { listOk: list.success, log: j };
  });
}

// Force clean → build (compose up --build) → start
log("clean", JSON.stringify(await project("clean")).slice(0, 300));

// Try update/build with force flags used by Synology
const buildExtraVariants = [
  {},
  { force: "true" },
  { rebuild: "true" },
  { no_cache: "true" },
];
for (const extra of buildExtraVariants) {
  const r = await project("build", extra);
  const logTxt = r.data?.log || r.raw || JSON.stringify(r);
  log("build", JSON.stringify(extra), String(logTxt).slice(0, 500));
  if (/Successfully tagged|Step \d+|npm ci|Building/i.test(String(logTxt))) break;
}

log("start", JSON.stringify(await project("start")).slice(0, 300));
await new Promise((r) => setTimeout(r, 4000));

const logs = await containerLogs();
// redact secrets from logs before printing
const logStr = JSON.stringify(logs).replace(
  /(CURSOR_API_KEY|FEISHU_APP_SECRET|FEISHU_APP_ID)=[^\\"\s&]+/g,
  "$1=***",
);
log("logs", logStr.slice(0, 2500));

for (let i = 0; i < 24; i++) {
  try {
    const hr = await fetch(HEALTH, { signal: AbortSignal.timeout(3000) });
    const ht = await hr.text();
    log("health", hr.status, ht);
    if (hr.ok) {
      await project("start"); // ensure up
      await browser.disconnect();
      process.exit(0);
    }
  } catch (e) {
    log("health wait", e.message);
  }
  if (i === 3 || i === 8) {
    log("re-start", JSON.stringify(await project("start")).slice(0, 200));
  }
  await new Promise((r) => setTimeout(r, 5000));
}

await browser.disconnect();
process.exit(2);
