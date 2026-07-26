/**
 * Keep feishu-cursor-bridge alive:
 * - restart if the child exits (mutex + exponential backoff)
 * - restart if /health stops responding
 * - soft recycle after max uptime OR advisory `stale` (Feishu silence)
 * - always log to .data/watchdog.log; serve fallback /health when child is down
 *
 * Usage: npm run watchdog
 */
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const HEALTH_PORT = Number(process.env.HEALTH_PORT || 8787);
const CHECK_MS = Number(process.env.WATCHDOG_CHECK_MS || 30_000);
const FAIL_BEFORE_RESTART = Number(process.env.WATCHDOG_FAILS || 3);
const MAX_UPTIME_MS = Number(
  process.env.WATCHDOG_MAX_UPTIME_MS || 6 * 60 * 60 * 1000,
);
const BACKOFF_MS = Number(process.env.WATCHDOG_BACKOFF_MS || 5_000);
const BACKOFF_MAX_MS = Number(process.env.WATCHDOG_BACKOFF_MAX_MS || 60_000);
const DATA_DIR = path.join(root, ".data");
const LOG_FILE = path.join(DATA_DIR, "watchdog.log");
const STATUS_FILE = path.join(DATA_DIR, "watchdog-status.json");

let child = null;
let startedAt = 0;
let fails = 0;
let stopping = false;
let restarting = false;
let restartGeneration = 0;
let consecutiveExits = 0;
let lastExit = null;
let fallbackServer = null;
let totalRestarts = 0;

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

function log(...args) {
  const line = `[watchdog ${new Date().toISOString()}] ${args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ")}`;
  console.log(line);
  try {
    ensureDataDir();
    fs.appendFileSync(LOG_FILE, `${line}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function writeStatus(extra = {}) {
  ensureDataDir();
  const payload = {
    updatedAt: new Date().toISOString(),
    childPid: child?.pid ?? null,
    startedAt: startedAt ? new Date(startedAt).toISOString() : null,
    consecutiveExits,
    totalRestarts,
    lastExit,
    restarting,
    ...extra,
  };
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function currentBackoffMs() {
  const exp = Math.min(
    BACKOFF_MAX_MS,
    BACKOFF_MS * 2 ** Math.min(consecutiveExits, 6),
  );
  return exp;
}

function bridgeCommand() {
  // BRIDGE_ENTRY=src|tsx → always run TypeScript (NAS bind-mount hotfixes).
  // Default: prefer image-baked dist/index.js when present.
  const entry = (process.env.BRIDGE_ENTRY || "auto").toLowerCase();
  const distEntry = path.join(root, "dist", "index.js");
  const preferSrc = entry === "src" || entry === "tsx";
  if (!preferSrc && fs.existsSync(distEntry)) {
    return { args: [distEntry], label: "dist" };
  }
  return { args: ["--import", "tsx", "src/index.ts"], label: "tsx" };
}

function startFallbackHealth() {
  if (fallbackServer || stopping) return;
  try {
    fallbackServer = http.createServer((req, res) => {
      if (req.url === "/health" || req.url === "/") {
        const body = JSON.stringify(
          {
            ok: false,
            wsReady: false,
            reason: "child_down",
            consecutiveExits,
            totalRestarts,
            lastExit,
            pid: process.pid,
            watchdog: true,
          },
          null,
          2,
        );
        res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
        res.end(body);
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });
    fallbackServer.on("error", (err) => {
      log("fallback health bind error", err.message);
      fallbackServer = null;
    });
    fallbackServer.listen(HEALTH_PORT, "0.0.0.0", () => {
      log(`fallback /health on :${HEALTH_PORT} (child down)`);
    });
  } catch (err) {
    log("fallback health failed", err?.message || err);
    fallbackServer = null;
  }
}

function stopFallbackHealth() {
  return new Promise((resolve) => {
    if (!fallbackServer) {
      resolve();
      return;
    }
    const s = fallbackServer;
    fallbackServer = null;
    s.close(() => resolve());
    // force resolve if close hangs
    setTimeout(resolve, 1000).unref?.();
  });
}

async function startChild() {
  if (child) return;
  await stopFallbackHealth();
  // brief gap so port is released
  await sleep(200);

  startedAt = Date.now();
  fails = 0;
  const { args, label } = bridgeCommand();
  log(`starting bridge (${label})…`, args.join(" "));
  writeStatus({ phase: "starting", runtime: label });

  child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, HEALTH_PORT: String(HEALTH_PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const onChunk = (buf, stream) => {
    const text = buf.toString("utf8");
    process[stream].write(buf);
    try {
      ensureDataDir();
      fs.appendFileSync(LOG_FILE, text, "utf8");
    } catch {
      /* ignore */
    }
  };
  child.stdout?.on("data", (b) => onChunk(b, "stdout"));
  child.stderr?.on("data", (b) => onChunk(b, "stderr"));

  child.on("exit", (code, signal) => {
    lastExit = {
      at: new Date().toISOString(),
      code,
      signal,
      uptimeMs: Date.now() - startedAt,
    };
    consecutiveExits += 1;
    log(
      `bridge exited code=${code} signal=${signal} uptimeMs=${lastExit.uptimeMs} consecutiveExits=${consecutiveExits}`,
    );
    child = null;
    writeStatus({ phase: "exited" });
    startFallbackHealth();
    if (!stopping) {
      void scheduleRestart("child-exit");
    }
  });

  writeStatus({ phase: "running", runtime: label });
}

async function scheduleRestart(reason) {
  if (stopping) return;
  if (restarting) {
    log(`restart already in progress, coalesce (${reason})`);
    return;
  }
  restarting = true;
  const gen = ++restartGeneration;
  const backoff = currentBackoffMs();
  totalRestarts += 1;
  try {
    log(`restart scheduled (${reason}), backoff ${backoff}ms`);
    writeStatus({ phase: "restarting", reason, backoffMs: backoff });
    killChild();
    await sleep(backoff);
    if (stopping || gen !== restartGeneration) return;
    await startChild();
  } finally {
    if (gen === restartGeneration) restarting = false;
  }
}

function killChild() {
  if (!child) return;
  const c = child;
  try {
    c.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  // escalate if needed
  setTimeout(() => {
    try {
      if (child === c) c.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }, 4000).unref?.();
  child = null;
}

async function probeChildHealth() {
  try {
    const res = await fetch(`http://127.0.0.1:${HEALTH_PORT}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, stale: false, raw: null };
    const j = await res.json();
    if (j.watchdog) return { ok: false, stale: false, raw: j };
    return {
      ok: !!j.ok && !!j.wsReady,
      stale: !!j.stale,
      raw: j,
    };
  } catch {
    return { ok: false, stale: false, raw: null };
  }
}

async function loop() {
  ensureDataDir();
  log("watchdog boot", { root, HEALTH_PORT, CHECK_MS, MAX_UPTIME_MS });
  await startChild();
  await sleep(8000);

  while (!stopping) {
    await sleep(CHECK_MS);
    if (stopping) break;

    if (!child) {
      // exit handler schedules restart; just wait
      continue;
    }

    if (MAX_UPTIME_MS > 0 && Date.now() - startedAt > MAX_UPTIME_MS) {
      consecutiveExits = 0; // planned recycle
      await scheduleRestart("max-uptime");
      await sleep(8000);
      continue;
    }

    const health = await probeChildHealth();
    if (health.ok) {
      fails = 0;
      // Successful long run resets crash backoff
      if (health.raw?.uptimeSec >= 60) consecutiveExits = 0;
      writeStatus({ phase: "running", healthOk: true, stale: health.stale });

      // Soft recycle on advisory silence (does not flap external ok while up)
      if (health.stale) {
        log(
          `stale soft-recycle silentMs=${health.raw?.silentMs} max=${health.raw?.maxSilentMs}`,
        );
        consecutiveExits = 0;
        await scheduleRestart("feishu-stale");
        await sleep(8000);
      }
      continue;
    }

    fails += 1;
    log(`health fail ${fails}/${FAIL_BEFORE_RESTART}`);
    writeStatus({ phase: "unhealthy", fails });
    if (fails >= FAIL_BEFORE_RESTART) {
      await scheduleRestart("health-fail");
      await sleep(8000);
    }
  }
}

function shutdown() {
  stopping = true;
  restartGeneration += 1;
  log("shutting down");
  killChild();
  void stopFallbackHealth().finally(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
