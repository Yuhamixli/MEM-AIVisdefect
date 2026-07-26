import http from "node:http";

export type HealthState = {
  startedAt: string;
  wsReady: boolean;
  lastEventAt: string | null;
  lastEventType: string | null;
  eventsTotal: number;
  pid: number;
};

const state: HealthState = {
  startedAt: new Date().toISOString(),
  wsReady: false,
  lastEventAt: null,
  lastEventType: null,
  eventsTotal: 0,
  pid: process.pid,
};

/**
 * Advisory silence window for soft recycle (watchdog).
 * Does NOT flip health.ok — idle groups must not look "down" or trigger crash loops.
 * Set HEALTH_MAX_SILENT_MS=0 to disable stale soft-recycle signal.
 */
const MAX_SILENT_MS = Number(process.env.HEALTH_MAX_SILENT_MS || 45 * 60 * 1000);

export function markWsReady(): void {
  state.wsReady = true;
}

export function markEvent(type: string): void {
  state.lastEventAt = new Date().toISOString();
  state.lastEventType = type;
  state.eventsTotal += 1;
}

export function getHealth(): HealthState & {
  ok: boolean;
  stale: boolean;
  uptimeSec: number;
  silentMs: number;
  maxSilentMs: number;
  reason: string | null;
} {
  const uptimeSec = Math.floor(
    (Date.now() - Date.parse(state.startedAt)) / 1000,
  );
  const lastActiveMs = state.lastEventAt
    ? Date.parse(state.lastEventAt)
    : Date.parse(state.startedAt);
  const silentMs = Math.max(0, Date.now() - lastActiveMs);
  const stale = MAX_SILENT_MS > 0 && silentMs > MAX_SILENT_MS;

  let reason: string | null = null;
  if (!state.wsReady) reason = "ws_not_ready";

  return {
    ...state,
    // Probe/ok: only WS readiness. Silence is advisory (`stale`).
    ok: state.wsReady,
    stale,
    uptimeSec,
    silentMs,
    maxSilentMs: MAX_SILENT_MS,
    reason,
  };
}

/** Tiny local health endpoint for the watchdog / NAS probes. */
export function startHealthServer(port: number): void {
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const body = JSON.stringify(getHealth(), null, 2);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(
      `[health] http://0.0.0.0:${port}/health (ok=wsReady; stale soft-recycle after ${MAX_SILENT_MS}ms)`,
    );
  });
}
