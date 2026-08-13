import fs from "node:fs";
import path from "node:path";
import type * as lark from "@larksuiteoapi/node-sdk";
import { config } from "./config.js";

type CacheEntry = {
  name: string;
  source: string;
  updatedAt: string;
};

type CacheFile = Record<string, CacheEntry>;

const memory = new Map<string, CacheEntry>();
let loaded = false;
let lastContactError: string | null = null;

function cachePath(): string {
  return path.join(config.dataDir, "user-names.json");
}

function loadCache(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = fs.readFileSync(cachePath(), "utf8");
    const data = JSON.parse(raw) as CacheFile;
    for (const [id, entry] of Object.entries(data)) {
      if (entry?.name) memory.set(id, entry);
    }
  } catch {
    /* first run */
  }
}

function persistCache(): void {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const obj: CacheFile = {};
    for (const [id, entry] of memory) obj[id] = entry;
    fs.writeFileSync(cachePath(), JSON.stringify(obj, null, 2), "utf8");
  } catch (err) {
    console.warn("[user-names] persist failed", err);
  }
}

/** Prefer name / nickname / en_name. */
function pickName(u: {
  name?: string;
  en_name?: string;
  nickname?: string;
  display_name?: string;
}): string | undefined {
  const n =
    u.name?.trim() ||
    u.nickname?.trim() ||
    u.display_name?.trim() ||
    u.en_name?.trim();
  return n || undefined;
}

export function getCachedName(openId?: string): string | undefined {
  if (!openId || openId === "bot" || openId === "system" || openId === "unknown") {
    return openId === "bot" ? "机器人" : openId === "system" ? "系统" : undefined;
  }
  loadCache();
  return memory.get(openId)?.name;
}

export function rememberName(
  openId: string | undefined,
  name: string | undefined,
  source = "hint",
): void {
  if (!openId || !name?.trim()) return;
  if (openId === "bot" || openId === "system" || openId === "unknown") return;
  loadCache();
  const n = name.trim();
  const prev = memory.get(openId);
  if (prev?.name === n) return;
  memory.set(openId, {
    name: n,
    source,
    updatedAt: new Date().toISOString(),
  });
  persistCache();
}

async function fetchViaContact(
  client: lark.Client,
  openId: string,
): Promise<string | undefined> {
  try {
    const res = (await client.contact.v3.user.get({
      path: { user_id: openId },
      params: { user_id_type: "open_id" },
    })) as {
      code?: number;
      msg?: string;
      data?: {
        user?: {
          name?: string;
          en_name?: string;
          nickname?: string;
        };
      };
    };
    if (res.code && res.code !== 0) {
      lastContactError = `${res.code} ${res.msg || ""}`.trim();
      return undefined;
    }
    lastContactError = null;
    return pickName(res.data?.user || {});
  } catch (err) {
    lastContactError = err instanceof Error ? err.message : String(err);
    return undefined;
  }
}

/** Best-effort: scan chat members for matching open_id (needs im:chat member scope). */
async function fetchViaChatMembers(
  client: lark.Client,
  chatId: string,
  openId: string,
): Promise<string | undefined> {
  try {
    let pageToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      const res = (await client.im.v1.chatMembers.get({
        path: { chat_id: chatId },
        params: {
          member_id_type: "open_id",
          page_size: 100,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      })) as {
        code?: number;
        data?: {
          items?: Array<{ member_id?: string; name?: string }>;
          has_more?: boolean;
          page_token?: string;
        };
      };
      if (res.code && res.code !== 0) return undefined;
      for (const m of res.data?.items || []) {
        if (m.member_id === openId && m.name?.trim()) {
          return m.name.trim();
        }
      }
      if (!res.data?.has_more || !res.data.page_token) break;
      pageToken = res.data.page_token;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Resolve open_id → display name.
 * Order: memory/file cache → Contact API → optional chat members → undefined.
 */
export async function resolveUserName(
  client: lark.Client,
  openId: string | undefined,
  opts?: { chatId?: string; hintName?: string },
): Promise<string | undefined> {
  if (!openId) return undefined;
  if (openId === "bot") return "机器人";
  if (openId === "system") return "系统";

  if (opts?.hintName?.trim()) {
    rememberName(openId, opts.hintName, "hint");
    return opts.hintName.trim();
  }

  const cached = getCachedName(openId);
  if (cached) return cached;

  const fromContact = await fetchViaContact(client, openId);
  if (fromContact) {
    rememberName(openId, fromContact, "contact");
    return fromContact;
  }

  if (opts?.chatId && !opts.chatId.startsWith("system")) {
    const fromChat = await fetchViaChatMembers(client, opts.chatId, openId);
    if (fromChat) {
      rememberName(openId, fromChat, "chat_member");
      return fromChat;
    }
  }

  return undefined;
}

/** Resolve many ids (deduped); used when rendering admin list. */
export async function resolveUserNames(
  client: lark.Client,
  items: Array<{ openId?: string; chatId?: string }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const seen = new Set<string>();
  for (const it of items) {
    const id = it.openId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = await resolveUserName(client, id, { chatId: it.chatId });
    if (name) out.set(id, name);
  }
  return out;
}

export function displayName(
  openId: string | undefined,
  resolved?: string,
  stored?: string,
): string {
  const name = stored?.trim() || resolved?.trim() || getCachedName(openId);
  if (name) return name;
  if (!openId) return "-";
  if (openId.length > 12) return `${openId.slice(0, 10)}…`;
  return openId;
}

export function getNameResolverStatus(): {
  cachedCount: number;
  lastContactError: string | null;
} {
  loadCache();
  return { cachedCount: memory.size, lastContactError };
}
