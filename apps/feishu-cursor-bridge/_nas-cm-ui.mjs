import puppeteer from "puppeteer-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = (...a) => console.log(`[cm ${new Date().toISOString()}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.connect({
  browserURL: "http://127.0.0.1:9333",
  defaultViewport: null,
});
let page;
for (const p of await browser.pages()) {
  if (!p.url().includes("192.168.1.82")) continue;
  if (await p.evaluate(() => !!(window.SYNO?.SDS?.Session?.SynoToken)).catch(() => false)) {
    page = p;
    break;
  }
}
if (!page) {
  console.error("no session");
  process.exit(1);
}
await page.bringToFront();
await page.setViewport({ width: 1280, height: 800 });

async function shot(name) {
  const f = path.join(__dirname, name);
  await page.screenshot({ path: f });
  log("shot", name);
}

// Open main menu (top-left grid)
await page.mouse.click(28, 22);
await sleep(1200);
await shot("_nas-menu.png");

const launched = await page.evaluate(() => {
  const labels = [
    "Container Manager",
    "容器",
    "Docker",
    "Container",
  ];
  const nodes = [...document.querySelectorAll("div,span,a,li")];
  for (const label of labels) {
    const el = nodes.find((e) => {
      const t = (e.textContent || "").trim();
      return t === label && e.children.length <= 2;
    });
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        el.click();
        return { label, x: r.x, y: r.y };
      }
    }
  }
  // AppLaunch fallbacks
  const apps = [
    "SYNO.SDS.Docker.Application",
    "SYNO.SDS.ContainerManager.Application",
  ];
  for (const a of apps) {
    try {
      SYNO.SDS.AppLaunch(a);
      return { launch: a };
    } catch (_) {}
  }
  return {
    menuTexts: nodes
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 40 && r.height > 10 && r.y < 700 && r.x < 400;
      })
      .map((e) => (e.textContent || "").trim())
      .filter((t) => t && t.length < 40)
      .slice(0, 60),
  };
});
log("launch", launched);
await sleep(3000);
await shot("_nas-cm.png");

// Switch to Project tab (项目)
await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => {
    const t = (e.textContent || "").trim();
    return (t === "Project" || t === "项目") && e.children.length === 0;
  });
  el?.click();
});
await sleep(1500);
await shot("_nas-project.png");

// Select project row
await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => {
    const t = (e.textContent || "").trim();
    if (t !== "feishu-cursor-bridge") return false;
    const r = e.getBoundingClientRect();
    return r.width > 50 && r.height > 12;
  });
  if (el) {
    el.click();
    el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  }
});
await sleep(1500);
await shot("_nas-selected.png");

// Click Action / 操作 then Build / 构建
const build = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const findClick = (texts) => {
    const els = [...document.querySelectorAll("button,[role='combobox'],[role='menuitem'],div,span,li")];
    for (const t of texts) {
      const el = els.find((e) => (e.textContent || "").trim() === t);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      el.click();
      return { t, x: r.x, y: r.y, w: r.width, h: r.height };
    }
    return null;
  };
  const action = findClick(["Action", "操作"]);
  await sleep(700);
  const b = findClick(["Build", "构建"]);
  await sleep(500);
  return { action, b, bodyHasBuild: /Terminal|构建|Step \d+/i.test(document.body.innerText || "") };
});
log("build ui", build);
await sleep(2000);
await shot("_nas-building.png");

// Also try API via synowebapi.webapiRequest if present
const api = await page.evaluate(async (id) => {
  const token = SYNO.SDS.Session.SynoToken;
  return new Promise((resolve) => {
    try {
      if (typeof SYNO?.API?.Request === "function") {
        SYNO.API.Request({
          api: "SYNO.Docker.Project",
          method: "build",
          version: 1,
          params: { id: [id] },
          callback: (ok, data, req) => resolve({ via: "SYNO.API.Request", ok, data, req }),
        });
        setTimeout(() => resolve({ via: "SYNO.API.Request", timeout: true }), 5000);
        return;
      }
    } catch (e) {
      resolve({ err: String(e) });
      return;
    }
    // manual
    fetch("/webapi/entry.cgi", {
      method: "POST",
      credentials: "include",
      headers: {
        "X-SYNO-TOKEN": token,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({
        api: "SYNO.Docker.Project",
        version: "1",
        method: "build",
        id: JSON.stringify([id]),
        SynoToken: token,
      }),
    })
      .then(async (r) => {
        const t = await r.text();
        try {
          resolve({ via: "fetch", status: r.status, j: JSON.parse(t) });
        } catch {
          resolve({ via: "fetch", status: r.status, raw: t.slice(0, 200) });
        }
      })
      .catch((e) => resolve({ via: "fetch", err: String(e) }));
  });
}, "568819e8-b81e-47f9-a2b9-5671e18af7b2");
log("api", api);

// Poll project state + health
const HEALTH = "http://192.168.1.82:8787/health";
for (let i = 0; i < 90; i++) {
  const state = await page.evaluate(async () => {
    const token = SYNO.SDS.Session.SynoToken;
    const r = await fetch(
      "/webapi/entry.cgi?api=SYNO.Docker.Project&version=1&method=list&SynoToken=" +
        encodeURIComponent(token),
      { credentials: "include", headers: { "X-SYNO-TOKEN": token } },
    );
    return r.json();
  });
  const proj = state.data?.["568819e8-b81e-47f9-a2b9-5671e18af7b2"];
  log("state", proj?.status, "containers", proj?.containerIds?.length);

  // if still BUILD_FAILED and i==2, try start after manual hope
  if (i === 3 && build?.b) {
    // wait for build
  }

  try {
    const hr = await fetch(HEALTH, { signal: AbortSignal.timeout(3000) });
    const ht = await hr.text();
    if (hr.ok) {
      log("HEALTH", ht);
      // try start if needed
      fs.writeFileSync(path.join(__dirname, "_nas-health.json"), ht);
      await browser.disconnect();
      process.exit(0);
    }
  } catch (_) {}

  // After build running, look for success then Start
  const uiText = await page.evaluate(() => (document.body.innerText || "").slice(-1200));
  if (/Successfully tagged|Successfully built/i.test(uiText)) {
    log("build success text seen");
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const findClick = (texts) => {
        const els = [...document.querySelectorAll("button,[role='combobox'],[role='menuitem'],div,span,li")];
        for (const t of texts) {
          const el = els.find((e) => (e.textContent || "").trim() === t);
          if (el) {
            el.click();
            return t;
          }
        }
        return null;
      };
      findClick(["Action", "操作"]);
      await sleep(500);
      findClick(["Start", "启动"]);
    });
  }
  if (proj?.status === "RUNNING" || (proj?.containerIds || []).length > 0) {
    log("project running-ish", proj?.status);
  }
  await sleep(5000);
}

await shot("_nas-final.png");
await browser.disconnect();
process.exit(2);
