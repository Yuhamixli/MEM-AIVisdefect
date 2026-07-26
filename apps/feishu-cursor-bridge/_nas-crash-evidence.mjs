/**
 * Pull NAS watchdog source + volume log markers (no secrets).
 */
import puppeteer from "puppeteer-core";

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

const out = await page.evaluate(async () => {
  const token = SYNO.SDS.Session.SynoToken;
  async function dl(p) {
    const res = await fetch(
      "/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=" +
        encodeURIComponent(JSON.stringify(p)) +
        "&mode=open&SynoToken=" +
        encodeURIComponent(token),
      { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
    );
    const t = await res.text();
    return { path: p, status: res.status, len: t.length, text: t };
  }

  const watchdog = await dl("/docker/feishu-cursor-bridge/scripts/watchdog.mjs");
  const compose = await dl("/docker/feishu-cursor-bridge/docker-compose.yml");
  const logFile = await dl("/docker/feishu-cursor-bridge/.data/watchdog.log");

  const wd = watchdog.text || "";
  const hasMutex =
    wd.includes("restarting") &&
    (wd.includes("coalesce") || wd.includes("already in progress"));
  const hasOldPattern =
    wd.includes("killChild()") &&
    wd.includes('scheduleRestart("child-exit")') &&
    !hasMutex;
  // Old bug: await sleep then unconditional killChild (double-schedule kills healthy child)
  const sleepThenKill = /await sleep\(BACKOFF_MS\);\s*\n\s*(?:if \(stopping\) return;\s*\n\s*)?killChild\(\)/.test(
    wd,
  );

  const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
  const gb = new URLSearchParams({
    api: "SYNO.Docker.Project",
    version: "1",
    method: "get",
    id: JSON.stringify(id),
    SynoToken: token,
  });
  const gr = await fetch("/webapi/entry.cgi", {
    method: "POST",
    credentials: "include",
    headers: {
      "X-SYNO-TOKEN": token,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: gb,
  });
  const proj = await gr.json();
  const c = proj.data?.containers?.[0] || {};
  const binds =
    c.HostConfig?.Binds ||
    (c.Mounts || []).map(
      (m) => `${m.Source || ""}:${m.Destination || ""}:${m.RW === false ? "ro" : "rw"}`,
    );

  return {
    projectStatus: proj.data?.status,
    binds,
    image: c.Config?.Image,
    cmd: c.Config?.Cmd,
    startedAt: c.State?.StartedAt,
    oom: c.State?.OOMKilled,
    watchdog: {
      len: watchdog.len,
      hasMutex,
      hasOldPattern,
      sleepThenKill,
      usesDist: wd.includes("dist/index.js") || wd.includes("dist\", \"index.js\""),
      usesTsx: wd.includes("--import") && wd.includes("tsx"),
      snippetExit: (() => {
        const i = wd.indexOf('child.on("exit"');
        return i >= 0 ? wd.slice(i, i + 220).replace(/\r/g, "") : null;
      })(),
      snippetRestart: (() => {
        const i = wd.indexOf("async function scheduleRestart");
        return i >= 0 ? wd.slice(i, i + 320).replace(/\r/g, "") : null;
      })(),
    },
    composeHasSrcMount: (compose.text || "").includes("./src:/app/src"),
    log: {
      len: logFile.len,
      status: logFile.status,
      tail: (logFile.text || "").slice(-2000),
    },
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.disconnect();
