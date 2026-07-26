import * as lark from "@larksuiteoapi/node-sdk";
import { config } from "./config.js";

export type IncomingMessage = {
  messageId: string;
  chatId: string;
  chatType: string;
  text: string;
  mentionedBot: boolean;
  senderOpenId?: string;
};

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
  };
}

export async function replyText(
  client: lark.Client,
  chatId: string,
  text: string,
  replyToMessageId?: string,
): Promise<void> {
  const content = JSON.stringify({ text });
  if (replyToMessageId) {
    await client.im.v1.message.reply({
      path: { message_id: replyToMessageId },
      data: {
        content,
        msg_type: "text",
      },
    });
    return;
  }
  await client.im.v1.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId,
      msg_type: "text",
      content,
    },
  });
}
