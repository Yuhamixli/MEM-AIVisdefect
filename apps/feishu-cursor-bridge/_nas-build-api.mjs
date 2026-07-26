import puppeteer from "puppeteer-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const id = "568819e8-b81e-47f9-a2b9-5671e18af7b2";

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9333",
  defaultViewport: null,
});
let page;
for (const p of await browser.pages()) {
  if (!p.url().includes("192.168.1.82")) continue;
  const ok = await p
    .evaluate(() => !!(window.SYNO?.SDS?.Session?.SynoToken))
    .catch(() => false);
  if (ok) {
    page = p;
    break;
  }
}
if (!page) {
  console.error("no session");
  process.exit(1);
}

const r = await page.evaluate(async (id) => {
  const token = SYNO.SDS.Session.SynoToken;
  async function post(params) {
    const body = new URLSearchParams({ ...params, SynoToken: token });
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
      return { raw: text.slice(0, 300), status: res.status };
    }
  }
  const out = {};
  out.arr = await post({
    api: "SYNO.Docker.Project",
    version: "1",
    method: "build",
    id: JSON.stringify([id]),
  });
  out.plain = await post({
    api: "SYNO.Docker.Project",
    version: "1",
    method: "build",
    id,
  });
  out.name = await post({
    api: "SYNO.Docker.Project",
    version: "1",
    method: "build",
    name: "feishu-cursor-bridge",
  });
  out.startArr = await post({
    api: "SYNO.Docker.Project",
    version: "1",
    method: "start",
    id: JSON.stringify([id]),
  });
  try {
    SYNO.SDS.AppLaunch("SYNO.SDS.Docker.Application");
    out.launch = "ok";
  } catch (e) {
    out.launch = String(e);
  }
  return out;
}, id);

console.log(JSON.stringify(r, null, 2));
await page.screenshot({
  path: path.join(__dirname, "_nas-ui.png"),
  fullPage: false,
});
console.log("screenshot ok");

// Wait a bit and try clicking via coordinates from screenshot description later
await new Promise((res) => setTimeout(res, 2500));

const ui = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Prefer Project menu
  const menus = [...document.querySelectorAll('[role="menuitem"],.sds-tree-item,.v-list-item')];
  const projectMenu = menus.find((e) => /^(Project|项目)$/.test((e.textContent || "").trim()));
  projectMenu?.click();
  await sleep(1000);

  // Click row containing project name (larger cell)
  const cells = [...document.querySelectorAll("td,div,span")].filter((e) => {
    const t = (e.textContent || "").trim();
    return t === "feishu-cursor-bridge";
  });
  let clicked = false;
  for (const c of cells.reverse()) {
    const r = c.getBoundingClientRect();
    if (r.width > 40 && r.height > 10) {
      c.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      c.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      c.click();
      clicked = true;
      break;
    }
  }
  await sleep(800);

  // Find Action button that is enabled
  const actionBtns = [...document.querySelectorAll("button,[role='combobox'],div")].filter((e) => {
    const t = (e.textContent || "").trim();
    return t === "Action" || t === "操作";
  });
  let actionHit = null;
  for (const a of actionBtns) {
    const r = a.getBoundingClientRect();
    if (r.width > 20 && r.height > 10 && r.y > 50) {
      a.click();
      actionHit = { t: (a.textContent || "").trim(), x: r.x, y: r.y };
      break;
    }
  }
  await sleep(600);

  const items = [...document.querySelectorAll('[role="menuitem"],li')].map((e) =>
    (e.textContent || "").trim(),
  );
  const build = [...document.querySelectorAll('[role="menuitem"],li,div,span')].find((e) => {
    const t = (e.textContent || "").trim();
    return t === "Build" || t === "构建";
  });
  build?.click();
  await sleep(1000);

  return {
    clicked,
    actionHit,
    items: items.filter(Boolean).slice(0, 20),
    build: build ? (build.textContent || "").trim() : null,
    hasTerminal: /Terminal:\s*Build|Step \d+\//i.test(document.body.innerText || ""),
    textSample: (document.body.innerText || "").slice(0, 400),
  };
});

console.log("ui", JSON.stringify(ui, null, 2));
await page.screenshot({ path: path.join(__dirname, "_nas-ui2.png") });
await browser.disconnect();
