import type * as lark from "@larksuiteoapi/node-sdk";
import { extractPlainText } from "./feishu.js";
import { logConversation } from "./conversation-log.js";
import { rememberName } from "./user-names.js";

type MsgItem = {
  message_id?: string;
  msg_type?: string;
  body?: { content?: string };
  sender?: {
    id?: string;
    id_type?: string;
    sender_type?: string;
    name?: string;
  };
  create_time?: string;
};

const DEFAULT_GROUP = "oc_0d14d27de38029e451951cdf4e0d4000";

/**
 * Pull recent messages from a Feishu chat into the conversation log.
 * DMs generally cannot be listed unless the bot is in that chat and API allows it;
 * group history works with im:message permission.
 */
export async function backfillChatToLog(
  client: lark.Client,
  chatId = DEFAULT_GROUP,
  limit = 50,
): Promise<{ imported: number; chatId: string; error?: string }> {
  const pageSize = Math.min(Math.max(limit, 1), 50);
  try {
    const res = (await client.im.v1.message.list({
      params: {
        container_id_type: "chat",
        container_id: chatId,
        sort_type: "ByCreateTimeDesc",
        page_size: pageSize,
      },
    })) as {
      code?: number;
      msg?: string;
      data?: { items?: MsgItem[] };
    };

    if (res.code && res.code !== 0) {
      return {
        imported: 0,
        chatId,
        error: `${res.code} ${res.msg || ""}`.trim(),
      };
    }

    const items = (res.data?.items || []).slice(0, limit).reverse();
    let imported = 0;
    for (const m of items) {
      const raw = m.body?.content || "";
      const text = extractPlainText(raw, m.msg_type || "text");
      if (!text) continue;
      const isBot = m.sender?.sender_type === "app";
      const senderOpenId = isBot ? "bot" : m.sender?.id || "unknown";
      const senderName = isBot
        ? "机器人"
        : m.sender?.name?.trim() || undefined;
      if (!isBot && senderName) {
        rememberName(senderOpenId, senderName, "backfill");
      }
      const sessionKey = `${chatId}:${senderOpenId}`;
      const ok = logConversation({
        direction: isBot ? "out" : "in",
        chatType: "group",
        chatId,
        messageId: m.message_id,
        senderOpenId,
        senderName,
        sessionKey,
        text,
        kind: "backfill",
      });
      if (ok) imported += 1;
    }
    return { imported, chatId };
  } catch (err) {
    return {
      imported: 0,
      chatId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export { DEFAULT_GROUP };
