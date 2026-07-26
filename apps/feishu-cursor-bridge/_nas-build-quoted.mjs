import puppeteer from "puppeteer-core";

const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
const HEALTH = "http://192.168.1.82:8787/health";
const log = (...a) => console.log(`[build ${new Date().toISOString()}]`, ...a);

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
  console.error("no session");
  process.exit(1);
}

async function post(method) {
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
        return { status: res.status, j: JSON.parse(text) };
      } catch {
        return { status: res.status, raw: text.slice(0, 200) };
      }
    },
    { id, method },
  );
}

for (const m of ["build", "build_stream", "start", "start_stream"]) {
  const r = await post(m);
  log(m, JSON.stringify(r).slice(0, 400));
}

// poll state + health
for (let i = 0; i < 100; i++) {
  const state = await page.evaluate(async () => {
    const token = SYNO.SDS.Session.SynoToken;
    const r = await fetch(
      "/webapi/entry.cgi?api=SYNO.Docker.Project&version=1&method=list&SynoToken=" +
        encodeURIComponent(token),
      { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
    );
    return r.json();
  });
  const proj = state.data?.[id];
  log("state", proj?.status, "containers", (proj?.containerIds || []).length);

  if (proj?.status === "BUILD_FAILED" && i === 5) {
    log("retry build_stream");
    log("retry", JSON.stringify(await post("build_stream")).slice(0, 300));
  }

  // once built / stopped with containers, start
  if (
    ["STOP", "STOPPED", "EXITED", "BUILD_SUCCESS", "RUNNING"].includes(proj?.status) ||
    (proj?.containerIds || []).length > 0
  ) {
    if (proj?.status !== "RUNNING") {
      log("starting…", JSON.stringify(await post("start_stream")).slice(0, 300));
      await post("start");
    }
  }

  try {
    const hr = await fetch(HEALTH, { signal: AbortSignal.timeout(3000) });
    const ht = await hr.text();
    if (hr.ok) {
      log("HEALTH", ht);
      await browser.disconnect();
      process.exit(0);
    }
  } catch (_) {}

  await new Promise((r) => setTimeout(r, 5000));
}

await browser.disconnect();
process.exit(2);
