import http from "node:http";
import { backfillChatToLog, DEFAULT_GROUP } from "./backfill.js";
import {
  getLogStatus,
  getThreadEvents,
  listRecentEvents,
  listThreads,
  renderThreadHtml,
  renderThreadsHtml,
  writeProbeEvent,
} from "./conversation-log.js";
import { config } from "./config.js";
import { createFeishuClient } from "./feishu.js";
import {
  getNameResolverStatus,
  resolveUserNames,
} from "./user-names.js";

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
    ok: state.wsReady,
    stale,
    uptimeSec,
    silentMs,
    maxSilentMs: MAX_SILENT_MS,
    reason,
  };
}

function readToken(req: http.IncomingMessage, url: URL): string | undefined {
  const q = url.searchParams.get("token")?.trim();
  if (q) return q;
  const auth = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim();
}

function unauthorized(res: http.ServerResponse): void {
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "WWW-Authenticate": 'Bearer realm="feishu-bridge-admin"',
  });
  res.end(JSON.stringify({ error: "unauthorized", hint: "pass ?token= or Authorization: Bearer" }));
}

function wantJson(req: http.IncomingMessage, url: URL): boolean {
  if (url.searchParams.get("format") === "json") return true;
  const accept = req.headers.accept || "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

function handleAdmin(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): void {
  const expected = config.adminToken;
  if (!expected) {
    res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: "admin_disabled",
        hint: "Set ADMIN_TOKEN in .env to enable conversation admin UI",
      }),
    );
    return;
  }
  const got = readToken(req, url);
  if (!got || got !== expected) {
    unauthorized(res);
    return;
  }

  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/admin/conversations") {
    void (async () => {
      try {
        const client = createFeishuClient();
        const threads = listThreads(200);
        const nameByOpenId = await resolveUserNames(
          client,
          threads.map((t) => ({ openId: t.senderOpenId, chatId: t.chatId })),
        );
        const enriched = threads.map((t) => ({
          ...t,
          senderName:
            t.senderName ||
            (t.senderOpenId ? nameByOpenId.get(t.senderOpenId) : undefined),
        }));
        if (wantJson(req, url)) {
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(
            JSON.stringify(
              { threads: enriched, events: listRecentEvents(100) },
              null,
              2,
            ),
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderThreadsHtml(got, nameByOpenId));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    })();
    return;
  }

  const detail = /^\/admin\/conversations\/(.+)$/.exec(pathname);
  if (detail) {
    const sessionKey = decodeURIComponent(detail[1]!);
    void (async () => {
      try {
        const client = createFeishuClient();
        const events = getThreadEvents(sessionKey);
        const nameByOpenId = await resolveUserNames(
          client,
          events.map((e) => ({ openId: e.senderOpenId, chatId: e.chatId })),
        );
        if (wantJson(req, url)) {
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(
            JSON.stringify(
              {
                sessionKey,
                events: events.map((e) => ({
                  ...e,
                  senderName:
                    e.senderName ||
                    (e.senderOpenId
                      ? nameByOpenId.get(e.senderOpenId)
                      : undefined),
                })),
              },
              null,
              2,
            ),
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderThreadHtml(sessionKey, got, nameByOpenId));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    })();
    return;
  }

  if (pathname === "/admin/log-status") {
    const probe = url.searchParams.get("probe") !== "0";
    if (probe) writeProbeEvent("log-status");
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify(
        { ...getLogStatus(), names: getNameResolverStatus() },
        null,
        2,
      ),
    );
    return;
  }

  if (pathname === "/admin/backfill") {
    const chatId = url.searchParams.get("chatId")?.trim() || DEFAULT_GROUP;
    const limit = Number(url.searchParams.get("limit") || 40) || 40;
    void (async () => {
      try {
        const client = createFeishuClient();
        const result = await backfillChatToLog(client, chatId, limit);
        const html = `<!doctype html><meta charset="utf-8"/>
          <p>回填完成：imported=${result.imported} chatId=${result.chatId}
          ${result.error ? ` error=${result.error}` : ""}</p>
          <p><a href="/admin/conversations?token=${encodeURIComponent(got)}">查看对话列表</a></p>`;
        if (wantJson(req, url)) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(result, null, 2));
        } else {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    })();
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "not_found" }));
}

/** Health + local-only admin conversation UI (token required). */
export function startHealthServer(port: number): void {
  const server = http.createServer((req, res) => {
    const host = req.headers.host || `127.0.0.1:${port}`;
    const url = new URL(req.url || "/", `http://${host}`);
    const pathOnly = url.pathname.replace(/\/+$/, "") || "/";

    if (pathOnly === "/health" || pathOnly === "/") {
      const body = JSON.stringify(getHealth(), null, 2);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
      return;
    }

    if (pathOnly.startsWith("/admin")) {
      handleAdmin(req, res, url);
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(
      `[health] http://0.0.0.0:${port}/health (ok=wsReady; stale soft-recycle after ${MAX_SILENT_MS}ms)`,
    );
    if (config.adminToken) {
      console.log(
        `[admin] conversations UI on /admin/conversations?token=*** (ADMIN_TOKEN set)`,
      );
    } else {
      console.log("[admin] disabled (set ADMIN_TOKEN to enable)");
    }
  });
}
