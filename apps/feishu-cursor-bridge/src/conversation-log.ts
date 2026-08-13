import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";

export type ConversationEvent = {
  id: string;
  ts: string;
  direction: "in" | "out";
  chatType: string;
  chatId: string;
  messageId?: string;
  senderOpenId?: string;
  /** Display name when known at write time */
  senderName?: string;
  sessionKey: string;
  text: string;
  preview: string;
  kind?: string;
  agentId?: string;
  runId?: string;
  status?: string;
};

type LogStats = {
  enabled: boolean;
  dataDir: string;
  convDir: string;
  writeOk: number;
  writeFail: number;
  lastError: string | null;
  lastWriteAt: string | null;
  lastWriteFile: string | null;
};

const stats: LogStats = {
  enabled: config.conversationLogEnabled,
  dataDir: config.dataDir,
  convDir: path.join(config.dataDir, "conversations"),
  writeOk: 0,
  writeFail: 0,
  lastError: null,
  lastWriteAt: null,
  lastWriteFile: null,
};

function convDir(): string {
  return path.join(config.dataDir, "conversations");
}

function dayFile(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return path.join(convDir(), `${y}-${m}-${day}.jsonl`);
}

function previewOf(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function ensureConversationLog(): void {
  stats.enabled = config.conversationLogEnabled;
  stats.dataDir = config.dataDir;
  stats.convDir = convDir();
  if (!config.conversationLogEnabled) {
    console.log("[conv-log] disabled (CONVERSATION_LOG=false)");
    return;
  }
  try {
    fs.mkdirSync(convDir(), { recursive: true });
    const probe = path.join(convDir(), ".write-probe");
    fs.writeFileSync(probe, new Date().toISOString(), "utf8");
    console.log(`[conv-log] ready dir=${convDir()}`);
  } catch (err) {
    stats.lastError = err instanceof Error ? err.message : String(err);
    console.error("[conv-log] ensure failed", err);
  }
}

/** Append one inbound/outbound turn. Best-effort; never throws to callers. */
export function logConversation(
  partial: Omit<ConversationEvent, "id" | "ts" | "preview"> & {
    preview?: string;
  },
): boolean {
  if (!config.conversationLogEnabled) {
    stats.enabled = false;
    return false;
  }
  try {
    fs.mkdirSync(convDir(), { recursive: true });
    const event: ConversationEvent = {
      ...partial,
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      preview: partial.preview ?? previewOf(partial.text),
    };
    const file = dayFile();
    fs.appendFileSync(file, `${JSON.stringify(event)}\n`, "utf8");
    stats.writeOk += 1;
    stats.lastWriteAt = event.ts;
    stats.lastWriteFile = file;
    stats.lastError = null;
    return true;
  } catch (err) {
    stats.writeFail += 1;
    stats.lastError = err instanceof Error ? err.message : String(err);
    console.error("[conv-log] write failed", err);
    return false;
  }
}

function listDayFiles(): string[] {
  try {
    return fs
      .readdirSync(convDir())
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function readEventsFromFile(file: string, maxLines: number): ConversationEvent[] {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const slice = lines.slice(-maxLines);
    const out: ConversationEvent[] = [];
    for (const line of slice) {
      try {
        out.push(JSON.parse(line) as ConversationEvent);
      } catch {
        /* skip bad line */
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Newest-first events across recent day files. */
export function listRecentEvents(limit = 200): ConversationEvent[] {
  const files = listDayFiles();
  const events: ConversationEvent[] = [];
  for (const name of files) {
    const batch = readEventsFromFile(path.join(convDir(), name), limit);
    events.push(...batch);
    if (events.length >= limit * 2) break;
  }
  events.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return events.slice(0, limit);
}

export type ThreadSummary = {
  sessionKey: string;
  chatType: string;
  chatId: string;
  senderOpenId?: string;
  senderName?: string;
  lastTs: string;
  messageCount: number;
  lastPreview: string;
};

export function listThreads(limit = 100): ThreadSummary[] {
  const events = listRecentEvents(2000);
  const map = new Map<string, ThreadSummary>();
  for (const e of events) {
    const cur = map.get(e.sessionKey);
    if (!cur) {
      map.set(e.sessionKey, {
        sessionKey: e.sessionKey,
        chatType: e.chatType,
        chatId: e.chatId,
        senderOpenId: e.senderOpenId,
        senderName: e.senderName,
        lastTs: e.ts,
        messageCount: 1,
        lastPreview: e.preview || previewOf(e.text),
      });
    } else {
      cur.messageCount += 1;
      if (e.senderName && !cur.senderName) cur.senderName = e.senderName;
      if (e.ts > cur.lastTs) {
        cur.lastTs = e.ts;
        cur.lastPreview = e.preview || previewOf(e.text);
        cur.chatType = e.chatType;
        if (e.senderName) cur.senderName = e.senderName;
        if (e.senderOpenId) cur.senderOpenId = e.senderOpenId;
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => (a.lastTs < b.lastTs ? 1 : -1))
    .slice(0, limit);
}

export function getThreadEvents(sessionKey: string, limit = 500): ConversationEvent[] {
  const events = listRecentEvents(5000).filter((e) => e.sessionKey === sessionKey);
  return events.reverse().slice(-limit);
}

export function getLogStatus(): LogStats & {
  files: string[];
  eventCountSample: number;
  threadCount: number;
} {
  const files = listDayFiles();
  return {
    ...stats,
    enabled: config.conversationLogEnabled,
    dataDir: config.dataDir,
    convDir: convDir(),
    files,
    eventCountSample: listRecentEvents(5000).length,
    threadCount: listThreads(500).length,
  };
}

/** Write a visible probe event so admin UI is never "mystery empty" after deploy. */
export function writeProbeEvent(note = "admin probe"): boolean {
  return logConversation({
    direction: "out",
    chatType: "system",
    chatId: "system",
    sessionKey: "system:probe",
    senderOpenId: "system",
    text: `[conv-log] ${note} @ ${new Date().toISOString()}`,
    kind: "probe",
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderThreadsHtml(
  token: string,
  nameByOpenId: Map<string, string> = new Map(),
): string {
  const threads = listThreads(150);
  const status = getLogStatus();
  const rows = threads
    .map((t) => {
      const href = `/admin/conversations/${encodeURIComponent(t.sessionKey)}?token=${encodeURIComponent(token)}`;
      const resolved =
        t.senderName ||
        (t.senderOpenId ? nameByOpenId.get(t.senderOpenId) : undefined);
      const nameLabel = resolved || "（未知）";
      const idSub = t.senderOpenId
        ? `<div class="oid"><code>${escapeHtml(t.senderOpenId)}</code></div>`
        : "";
      return `<tr>
        <td>${escapeHtml(t.lastTs)}</td>
        <td>${escapeHtml(t.chatType)}</td>
        <td><strong>${escapeHtml(nameLabel)}</strong>${idSub}</td>
        <td>${t.messageCount}</td>
        <td><a href="${href}">${escapeHtml(t.lastPreview || "(empty)")}</a></td>
      </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<title>MEM-AIVisdefect 对话日志</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:24px;background:#f6f7f9;color:#1a1a1a}
  h1{font-size:1.25rem;margin:0 0 8px}
  .meta{color:#666;font-size:0.9rem;margin-bottom:16px}
  table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden}
  th,td{border-bottom:1px solid #eee;padding:10px 12px;text-align:left;vertical-align:top;font-size:0.9rem}
  th{background:#f0f2f5;font-weight:600}
  code{font-size:0.75rem;color:#666}
  .oid{margin-top:4px}
  a{color:#0b57d0;text-decoration:none}
  a:hover{text-decoration:underline}
  .warn{background:#fff3cd;border:1px solid #ffe69c;padding:10px 12px;border-radius:8px;margin-bottom:16px;font-size:0.9rem}
</style></head><body>
<h1>MEM-AIVisdefect-Agent 对话日志</h1>
<p class="meta">组织运维日志（含私聊）。仅持有 ADMIN_TOKEN 可访问。共 ${threads.length} 个会话。
 · <a href="/admin/log-status?token=${encodeURIComponent(token)}">诊断</a>
 · <a href="/admin/backfill?token=${encodeURIComponent(token)}">回填主群历史</a>
</p>
${
  threads.length === 0
    ? `<div class="warn">暂无用户会话。部署前的消息不会自动出现；请<strong>私聊机器人</strong>或群里 <strong>@机器人</strong> 发一句后刷新。
也可点「回填主群历史」。诊断：enabled=${status.enabled} writes=${status.writeOk} fails=${status.writeFail} dir=<code>${escapeHtml(status.convDir)}</code></div>`
    : ""
}
<table>
  <thead><tr><th>最近活动</th><th>类型</th><th>姓名</th><th>条数</th><th>预览</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5">暂无记录</td></tr>'}</tbody>
</table>
</body></html>`;
}

export function renderThreadHtml(
  sessionKey: string,
  token: string,
  nameByOpenId: Map<string, string> = new Map(),
): string {
  const events = getThreadEvents(sessionKey);
  const back = `/admin/conversations?token=${encodeURIComponent(token)}`;
  const bubbles = events
    .map((e) => {
      const resolved =
        e.senderName ||
        (e.senderOpenId ? nameByOpenId.get(e.senderOpenId) : undefined);
      const who =
        e.direction === "out"
          ? "机器人"
          : resolved || e.senderOpenId || "用户";
      const kind = e.kind ? ` · ${escapeHtml(e.kind)}` : "";
      const run = e.runId ? `<div class="run">run=${escapeHtml(e.runId)}</div>` : "";
      return `<div class="msg ${e.direction}">
        <div class="head">${escapeHtml(who)}${kind} · ${escapeHtml(e.ts)}</div>
        <pre>${escapeHtml(e.text)}</pre>
        ${run}
      </div>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<title>会话 ${escapeHtml(sessionKey)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;margin:24px;background:#f6f7f9;color:#1a1a1a;max-width:900px}
  a{color:#0b57d0}
  .msg{background:#fff;border-radius:8px;padding:12px 14px;margin:10px 0;border:1px solid #e8eaed}
  .msg.in{border-left:4px solid #0b57d0}
  .msg.out{border-left:4px solid #0d7a4f}
  .head{font-size:0.8rem;color:#666;margin-bottom:6px}
  pre{white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit}
  .run{font-size:0.75rem;color:#888;margin-top:6px}
  code{font-size:0.85rem}
</style></head><body>
<p><a href="${back}">← 返回列表</a></p>
<h1>会话详情</h1>
<p><code>${escapeHtml(sessionKey)}</code> · ${events.length} 条</p>
${bubbles || "<p>无消息</p>"}
</body></html>`;
}
