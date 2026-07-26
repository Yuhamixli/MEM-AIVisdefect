/**
 * Keep feishu-cursor-bridge alive:
 * - restart if the child exits
 * - restart if /health stops responding
 * - optional soft restart after max uptime (refresh Feishu WS)
 *
 * Usage: npm run watchdog
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const HEALTH_PORT = Number(process.env.HEALTH_PORT || 8787);
const CHECK_MS = Number(process.env.WATCHDOG_CHECK_MS || 30_000);
const FAIL_BEFORE_RESTART = Number(process.env.WATCHDOG_FAILS || 3);
const MAX_UPTIME_MS = Number(
  process.env.WATCHDOG_MAX_UPTIME_MS || 6 * 60 * 60 * 1000,
); // 6h soft recycle
const BACKOFF_MS = Number(process.env.WATCHDOG_BACKOFF_MS || 5_000);

let child = null;
let startedAt = 0;
let fails = 0;
let stopping = false;

function log(...args) {
  console.log(`[watchdog ${new Date().toISOString()}]`, ...args);
}

function startChild() {
  if (child) return;
  startedAt = Date.now();
  fails = 0;
  log("starting bridge…");
  child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: root,
    env: { ...process.env, HEALTH_PORT: String(HEALTH_PORT) },
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    log(`bridge exited code=${code} signal=${signal}`);
    child = null;
    if (!stopping) {
      scheduleRestart("child-exit");
    }
  });
}

async function scheduleRestart(reason) {
  log(`restart scheduled (${reason}), backoff ${BACKOFF_MS}ms`);
  await sleep(BACKOFF_MS);
  if (stopping) return;
  killChild();
  await sleep(500);
  startChild();
}

function killChild() {
  if (!child) return;
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  child = null;
}

async function healthOk() {
  try {
    const res = await fetch(`http://127.0.0.1:${HEALTH_PORT}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const j = await res.json();
    return Boolean(j.ok && j.wsReady);
  } catch {
    return false;
  }
}

async function loop() {
  startChild();
  // give bridge time to bind WS
  await sleep(8000);

  while (!stopping) {
    await sleep(CHECK_MS);
    if (stopping) break;

    if (MAX_UPTIME_MS > 0 && Date.now() - startedAt > MAX_UPTIME_MS) {
      log(`max uptime reached (${MAX_UPTIME_MS}ms), soft recycle`);
      await scheduleRestart("max-uptime");
      await sleep(8000);
      continue;
    }

    const ok = await healthOk();
    if (ok) {
      fails = 0;
      continue;
    }
    fails += 1;
    log(`health fail ${fails}/${FAIL_BEFORE_RESTART}`);
    if (fails >= FAIL_BEFORE_RESTART) {
      await scheduleRestart("health-fail");
      await sleep(8000);
    }
  }
}

function shutdown() {
  stopping = true;
  log("shutting down");
  killChild();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
