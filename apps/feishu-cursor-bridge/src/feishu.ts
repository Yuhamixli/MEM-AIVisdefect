import * as lark from "@larksuiteoapi/node-sdk";
import { config } from "./config.js";

export type IncomingMessage = {
  messageId: string;
  chatId: string;
  chatType: string;
  text: string;
  mentionedBot: boolean;
  senderOpenId?: string;
  /** Best-effort display name from event payload (often absent). */
  senderName?: string;
};

/** Feishu post/md tag: keep chunks under this to avoid API rejection. */
const MD_CHUNK_MAX = 2800;

let cachedBotOpenId: string | undefined;

export function createFeishuClient(): lark.Client {
  return new lark.Client({
    appId: config.feishuAppId,
    appSecret: config.feishuAppSecret,
  });
}

export async function resolveBotOpenId(client: lark.Client): Promise<string> {
  if (cachedBotOpenId) return cachedBotOpenId;
  const fromEnv = process.env.FEISHU_BOT_OPEN_ID?.trim();
  if (fromEnv) {
    cachedBotOpenId = fromEnv;
    return fromEnv;
  }
  // GET /open-apis/bot/v3/info — SDK may return {code,bot} or {code,data:{bot}}
  const res = (await client.request({
    url: "/open-apis/bot/v3/info",
    method: "GET",
  })) as {
    code?: number;
    bot?: { open_id?: string };
    data?: { bot?: { open_id?: string }; open_id?: string };
  };
  const openId =
    res.bot?.open_id || res.data?.bot?.open_id || res.data?.open_id;
  if (!openId) {
    throw new Error(
      `Cannot resolve bot open_id from /bot/v3/info (code=${res.code})`,
    );
  }
  cachedBotOpenId = openId;
  return openId;
}

/** Strip @_user_1 style mentions and collapse whitespace. */
export function extractPlainText(contentJson: string, messageType: string): string {
  if (messageType !== "text") {
    // post / interactive etc. — best-effort JSON stringify for now
    try {
      const obj = JSON.parse(contentJson) as Record<string, unknown>;
      if (typeof obj.text === "string") return cleanMentions(obj.text);
      return contentJson;
    } catch {
      return contentJson;
    }
  }
  try {
    const { text } = JSON.parse(contentJson) as { text?: string };
    return cleanMentions(text || "");
  } catch {
    return cleanMentions(contentJson);
  }
}

function cleanMentions(text: string): string {
  return text
    .replace(/@_user_\d+/g, " ")
    .replace(/@\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ReceiveEvent = {
  message?: {
    message_id?: string;
    chat_id?: string;
    chat_type?: string;
    message_type?: string;
    content?: string;
    mentions?: Array<{
      id?: { open_id?: string };
      key?: string;
      name?: string;
    }>;
  };
  sender?: {
    sender_type?: string;
    sender_id?: { open_id?: string };
    name?: string;
  };
};

export function parseReceiveEvent(
  data: ReceiveEvent,
  botOpenId: string,
): IncomingMessage | null {
  const msg = data.message;
  if (!msg?.message_id || !msg.chat_id || !msg.content) return null;
  if (data.sender?.sender_type === "app") return null;

  const mentions = msg.mentions || [];
  const mentionedBot = mentions.some((m) => {
    const oid = m.id?.open_id;
    const name = (m.name || "").toLowerCase();
    // Feishu may tag bot mentions as app/bot, or by open_id / display name
    const type = String(
      (m as { mentioned_type?: string }).mentioned_type || "",
    ).toLowerCase();
    return (
      oid === botOpenId ||
      type === "app" ||
      type === "bot" ||
      name.includes("mem-aivisdefect") ||
      name.includes("aivisdefect")
    );
  });
  const text = extractPlainText(msg.content, msg.message_type || "text");
  if (!text && !mentionedBot) return null;

  return {
    messageId: msg.message_id,
    chatId: msg.chat_id,
    chatType: msg.chat_type || "group",
    text: text || "(无文本)",
    mentionedBot,
    senderOpenId: data.sender?.sender_id?.open_id,
    senderName: data.sender?.name?.trim() || undefined,
  };
}

/** True when content should be sent as Feishu markdown (post/md), not plain text. */
export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.includes("```")) return true;
  if (/^#{1,6}\s/m.test(t)) return true;
  if (/\*\*[^*\n]+\*\*/.test(t) || /__[^_\n]+__/.test(t)) return true;
  if (/^\s*[-*+]\s+\S/m.test(t) || /^\s*\d+\.\s+\S/m.test(t)) return true;
  if (/^\s*\|.+\|/m.test(t)) return true;
  if (/\[[^\]]+\]\([^)]+\)/.test(t)) return true;
  if (/^\s*>\s+\S/m.test(t)) return true;
  // Multi-line agent answers usually benefit from md rendering
  if (t.includes("\n") && t.length > 80) return true;
  return false;
}

/**
 * Split markdown into chunks without breaking fenced code blocks.
 */
export function chunkMarkdown(text: string, max = MD_CHUNK_MAX): string[] {
  const t = text.trim();
  if (t.length <= max) return [t];

  const chunks: string[] = [];
  let buf = "";
  let inFence = false;
  const lines = t.split("\n");

  const pushHard = (s: string) => {
    for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
  };

  const flush = () => {
    const s = buf.trimEnd();
    buf = "";
    if (!s) return;
    if (s.length > max) pushHard(s);
    else chunks.push(s);
  };

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    if (!buf && line.length > max && !inFence) {
      pushHard(line);
      continue;
    }
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length > max && buf && !inFence) {
      flush();
      if (line.length > max) {
        pushHard(line);
        buf = "";
      } else {
        buf = line;
      }
      continue;
    }
    if (next.length > max && inFence && buf) {
      // Close fence, flush, reopen for remainder
      const lang = (buf.match(/^```(\w*)/m) || [])[1] || "";
      buf = `${buf}\n\`\`\``;
      flush();
      buf = `\`\`\`${lang}\n${line}`;
      if (buf.length > max) {
        pushHard(buf);
        buf = "";
        inFence = false;
      }
      continue;
    }
    buf = next;
  }
  if (buf.length > max) {
    pushHard(buf.trimEnd());
    buf = "";
  }
  flush();
  return chunks.length ? chunks : [t.slice(0, max)];
}

function apiErrorMessage(res: unknown): string {
  const r = res as { code?: number; msg?: string; message?: string };
  if (r?.code && r.code !== 0) {
    return `${r.code} ${r.msg || r.message || ""}`.trim();
  }
  return "";
}

async function sendRaw(
  client: lark.Client,
  chatId: string,
  msgType: string,
  contentObj: unknown,
  replyToMessageId?: string,
): Promise<void> {
  const content = JSON.stringify(contentObj);
  let res: unknown;
  if (replyToMessageId) {
    res = await client.im.v1.message.reply({
      path: { message_id: replyToMessageId },
      data: {
        content,
        msg_type: msgType,
      },
    });
  } else {
    res = await client.im.v1.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chatId,
        msg_type: msgType,
        content,
      },
    });
  }
  const err = apiErrorMessage(res);
  if (err) throw new Error(`Feishu send ${msgType} failed: ${err}`);
}

async function sendPlainText(
  client: lark.Client,
  chatId: string,
  text: string,
  replyToMessageId?: string,
): Promise<void> {
  await sendRaw(client, chatId, "text", { text }, replyToMessageId);
}

/** Feishu rich-text post with md tag (CommonMark + GFM). */
async function sendPostMarkdown(
  client: lark.Client,
  chatId: string,
  markdown: string,
  replyToMessageId?: string,
  partLabel?: string,
): Promise<void> {
  const title = partLabel || "MEM-AIVisdefect";
  const content = {
    zh_cn: {
      title,
      content: [[{ tag: "md", text: markdown }]],
    },
  };
  await sendRaw(client, chatId, "post", content, replyToMessageId);
}

/** Fallback: interactive card schema 2.0 markdown element. */
async function sendCardMarkdown(
  client: lark.Client,
  chatId: string,
  markdown: string,
  replyToMessageId?: string,
): Promise<void> {
  const card = {
    schema: "2.0",
    config: { wide_screen_mode: true },
    body: {
      elements: [
        {
          tag: "markdown",
          content: markdown,
        },
      ],
    },
  };
  await sendRaw(client, chatId, "interactive", card, replyToMessageId);
}

/**
 * Reply to a Feishu chat. Uses plain `text` for short acks;
 * markdown-ish agent answers use `post` + `md` (fallback: interactive card).
 */
export async function replyText(
  client: lark.Client,
  chatId: string,
  text: string,
  replyToMessageId?: string,
): Promise<void> {
  const body = text.trim();
  if (!body) return;

  const useMd = looksLikeMarkdown(body);
  if (!useMd) {
    await sendPlainText(client, chatId, body, replyToMessageId);
    return;
  }

  const chunks = chunkMarkdown(body, MD_CHUNK_MAX);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const replyId = i === 0 ? replyToMessageId : undefined;
    const label =
      chunks.length > 1 ? `回复 (${i + 1}/${chunks.length})` : undefined;
    try {
      await sendPostMarkdown(client, chatId, chunk, replyId, label);
      console.log(
        `[feishu] sent post/md chars=${chunk.length} part=${i + 1}/${chunks.length}`,
      );
    } catch (postErr) {
      console.warn("[feishu] post/md failed, try interactive card", postErr);
      try {
        await sendCardMarkdown(client, chatId, chunk, replyId);
        console.log(
          `[feishu] sent interactive/markdown chars=${chunk.length} part=${i + 1}/${chunks.length}`,
        );
      } catch (cardErr) {
        console.warn("[feishu] card failed, fallback text", cardErr);
        await sendPlainText(client, chatId, chunk, replyId);
      }
    }
  }
}
