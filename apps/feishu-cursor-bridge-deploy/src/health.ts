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

export function markWsReady(): void {
  state.wsReady = true;
}

export function markEvent(type: string): void {
  state.lastEventAt = new Date().toISOString();
  state.lastEventType = type;
  state.eventsTotal += 1;
}

export function getHealth(): HealthState & { ok: boolean; uptimeSec: number } {
  const uptimeSec = Math.floor(
    (Date.now() - Date.parse(state.startedAt)) / 1000,
  );
  return {
    ...state,
    ok: state.wsReady,
    uptimeSec,
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
    console.log(`[health] http://0.0.0.0:${port}/health`);
  });
}
