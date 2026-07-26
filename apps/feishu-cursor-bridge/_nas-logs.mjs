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
  const name = "feishu-cursor-bridge";
  // Try several log APIs
  const tries = [];
  for (const [api, method, extra] of [
    ["SYNO.Docker.Container.Log", "get", { name: JSON.stringify(name) }],
    ["SYNO.Docker.Container.Log", "get", { container: JSON.stringify(name) }],
    ["SYNO.Docker.Log", "get", { name: JSON.stringify(name) }],
    ["SYNO.Docker.Container", "get", { name: JSON.stringify(name) }],
  ]) {
    const body = new URLSearchParams({
      api,
      version: "1",
      method,
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
    tries.push({ api, method, status: res.status, text: text.slice(0, 500) });
  }
  // also list containers for id
  const listBody = new URLSearchParams({
    api: "SYNO.Docker.Container",
    version: "1",
    method: "list",
    limit: "-1",
    SynoToken: token,
  });
  const lr = await fetch("/webapi/entry.cgi", {
    method: "POST",
    credentials: "include",
    headers: {
      "X-SYNO-TOKEN": token,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: listBody,
  });
  const lt = await lr.text();
  return { tries, list: lt.slice(0, 1500) };
});

console.log(JSON.stringify(out, null, 2).slice(0, 8000));
await browser.disconnect();
