import * as lark from "@larksuiteoapi/node-sdk";
import { CursorAgentError } from "@cursor/sdk";
import { fetchRecentChatContext } from "./chat-history.js";
import { config } from "./config.js";
import { runCursorAgent } from "./cursor-agent.js";
import {
  createFeishuClient,
  parseReceiveEvent,
  replyText,
  resolveBotOpenId,
} from "./feishu.js";
import { helpNudge, isNonTaskMention } from "./intent.js";
import { clearAgentId } from "./session-store.js";

const client = createFeishuClient();
const inFlight = new Set<string>();

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function snippet(text: string, max = 24): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function ackMessage(userText: string): string {
  const q = snippet(userText);
  const cloud = config.runtime === "cloud";
  const variants = cloud
    ? [
        `好的，我去翻下仓库，稍等一两分钟～`,
        `收到：「${q}」——我查一下，稍等。`,
        `嗯，这个问题我先看文档和代码，马上回你。`,
        `在的。正在查 GitHub，通常一两分钟有结果。`,
      ]
    : [
        `好的，我先在本地仓库里看看。`,
        `收到：「${q}」——查一下马上回。`,
      ];
  return pick(variants);
}

/** Per-user session so one member's follow-up doesn't hijack the whole group. */
function sessionKey(chatId: string, senderOpenId?: string): string {
  return `${chatId}:${senderOpenId || "unknown"}`;
}

async function handleUserMessage(params: {
  chatId: string;
  messageId: string;
  chatType: string;
  text: string;
  senderOpenId?: string;
}): Promise<void> {
  const { chatId, messageId, text, senderOpenId } = params;
  const key = sessionKey(chatId, senderOpenId);

  if (/^(重置|reset|新会话)$/i.test(text.trim())) {
    clearAgentId(key);
    // Also clear legacy chat-wide session if present
    clearAgentId(chatId);
    await replyText(
      client,
      chatId,
      pick(["好，上下文清掉了，接着问就行。", "已重置，当新对话继续吧。"]),
      messageId,
    );
    return;
  }

  // Meta / empty @ — do NOT call Cloud Agent (prevents topic drift)
  if (isNonTaskMention(text)) {
    console.log(`[bridge] non-task ping, nudge only: ${text.slice(0, 60)}`);
    await replyText(client, chatId, helpNudge(), messageId);
    return;
  }

  if (inFlight.has(key) || inFlight.has(chatId)) {
    await replyText(
      client,
      chatId,
      pick([
        "上一条还在查，稍等我回完再问～",
        "正在忙前一个问题，请等一下再 @ 我。",
      ]),
      messageId,
    );
    return;
  }

  inFlight.add(key);
  try {
    await replyText(client, chatId, ackMessage(text), messageId);

    let chatContext = "";
    if (config.recentChatLimit > 0) {
      chatContext = await fetchRecentChatContext(client, chatId, {
        limit: config.recentChatLimit,
        excludeMessageId: messageId,
      });
      if (chatContext) {
        console.log(`[bridge] attached chat context (${chatContext.length} chars)`);
      }
    }

    const reply = await runCursorAgent(key, text, { chatContext });
    await replyText(client, chatId, reply.text, messageId);
  } catch (err) {
    const detail =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    console.error("[bridge] error", err);
    await replyText(
      client,
      chatId,
      `抱歉，这次没查成：${detail}\n你可以换个说法再试，或发「重置」开新会话。`,
      messageId,
    ).catch(() => {});
  } finally {
    inFlight.delete(key);
  }
}

async function main(): Promise<void> {
  console.log(`[bridge] runtime = ${config.runtime}`);
  if (config.runtime === "cloud") {
    console.log(`[bridge] cloud repo = ${config.cloudRepoUrl}@${config.cloudStartingRef}`);
  } else {
    console.log(`[bridge] repo cwd = ${config.repoCwd}`);
  }
  console.log(`[bridge] model = ${config.modelId}`);
  console.log(`[bridge] requireMention = ${config.requireMention}`);

  const botOpenId = await resolveBotOpenId(client);
  console.log(`[bridge] bot open_id = ${botOpenId}`);

  // Drop legacy chat-wide session that caused cross-user drift
  clearAgentId("oc_0d14d27de38029e451951cdf4e0d4000");

  const dispatcher = new lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      try {
        console.log(
          "[bridge] event im.message.receive_v1",
          JSON.stringify(data).slice(0, 800),
        );
        const incoming = parseReceiveEvent(
          data as Parameters<typeof parseReceiveEvent>[0],
          botOpenId,
        );
        if (!incoming) {
          console.log("[bridge] skip: parse returned null");
          return;
        }
        console.log(
          `[bridge] parsed chat=${incoming.chatType} mention=${incoming.mentionedBot} text=${incoming.text.slice(0, 80)}`,
        );

        const isP2p = incoming.chatType === "p2p";
        if (!isP2p && config.requireMention && !incoming.mentionedBot) {
          console.log("[bridge] skip: group message without @bot");
          return;
        }

        void handleUserMessage({
          chatId: incoming.chatId,
          messageId: incoming.messageId,
          chatType: incoming.chatType,
          text: incoming.text,
          senderOpenId: incoming.senderOpenId,
        });
      } catch (err) {
        console.error("[bridge] event handler error", err);
      }
    },
  });

  const ws = new lark.WSClient({
    appId: config.feishuAppId,
    appSecret: config.feishuAppSecret,
  });

  console.log("[bridge] starting Feishu long connection…");
  await ws.start({ eventDispatcher: dispatcher });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
