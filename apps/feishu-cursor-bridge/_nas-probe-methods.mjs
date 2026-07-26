import puppeteer from "puppeteer-core";

const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
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

const r = await page.evaluate(async (id) => {
  const token = SYNO.SDS.Session.SynoToken;
  async function call(method, extra = {}) {
    const params = {
      api: "SYNO.Docker.Project",
      version: "1",
      method,
      id: JSON.stringify(id),
      SynoToken: token,
      ...extra,
    };
    const body = new URLSearchParams(params);
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
      return { method, status: res.status, j: JSON.parse(text), extra };
    } catch {
      return { method, status: res.status, raw: text.slice(0, 120), extra };
    }
  }
  const out = [];
  for (const m of [
    "clean",
    "build",
    "build_stream",
    "start",
    "start_stream",
    "stop",
    "stop_stream",
    "get",
    "update",
  ]) {
    out.push(await call(m));
  }
  out.push(
    await call("build", {
      share_path: JSON.stringify("/docker/feishu-cursor-bridge"),
    }),
  );
  out.push(
    await call("build_stream", {
      path: JSON.stringify("/volume1/docker/feishu-cursor-bridge"),
    }),
  );
  // error helper
  try {
    out.push({
      errTpl: SYNO.SDS.Docker.Utils.Helper.getError?.(2101),
      err2104: SYNO.SDS.Docker.Utils.Helper.getError?.(2104),
    });
  } catch (e) {
    out.push({ errHelp: String(e) });
  }
  return out;
}, id);

console.log(JSON.stringify(r, null, 2));
await browser.disconnect();
