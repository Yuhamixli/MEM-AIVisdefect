/**
 * Restart feishu-cursor-bridge project on Synology (CDP Chrome :9333, logged-in DSM).
 */
import puppeteer from "puppeteer-core";

const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";
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
  console.error("DSM not logged in — open http://192.168.1.82:5000 in the CDP Chrome and login");
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
        return { raw: text.slice(0, 400), status: res.status };
      }
    },
    { id, method },
  );
}

console.log("stop", JSON.stringify(await project("stop")).slice(0, 200));
console.log("start", JSON.stringify(await project("start")).slice(0, 200));

for (let i = 0; i < 20; i++) {
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(3000) });
    const t = await r.text();
    console.log("health", t);
    if (r.ok) {
      await browser.disconnect();
      process.exit(0);
    }
  } catch (e) {
    console.log("wait", e.message);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
await browser.disconnect();
process.exit(2);
