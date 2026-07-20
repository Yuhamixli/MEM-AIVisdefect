import * as lark from "@larksuiteoapi/node-sdk";
import { CursorAgentError } from "@cursor/sdk";
import { config } from "./config.js";
import { runCursorAgent } from "./cursor-agent.js";
import {
  createFeishuClient,
  parseReceiveEvent,
  replyText,
  resolveBotOpenId,
} from "./feishu.js";
import { clearAgentId } from "./session-store.js";

const client = createFeishuClient();
const inFlight = new Set<string>();

async function handleUserMessage(params: {
  chatId: string;
  messageId: string;
  chatType: string;
  text: string;
}): Promise<void> {
  const { chatId, messageId, text } = params;
  const sessionKey = chatId;

  if (/^(重置|reset|新会话)$/i.test(text.trim())) {
    clearAgentId(sessionKey);
    await replyText(client, chatId, "已清空本会话的 Cursor Agent 上下文。再问即可开新会话。", messageId);
    return;
  }

  if (inFlight.has(sessionKey)) {
    await replyText(
      client,
      chatId,
      "上一条还在用 Cursor Agent 处理中，请稍后再问。",
      messageId,
    );
    return;
  }

  inFlight.add(sessionKey);
  try {
    await replyText(
      client,
      chatId,
      config.runtime === "cloud"
        ? "收到，正在用 Cursor Cloud Agent 查 GitHub 仓库…（通常 1–3 分钟）"
        : "收到，正在用 Cursor 本地 Agent 查仓库…（通常几十秒）",
      messageId,
    );

    const reply = await runCursorAgent(sessionKey, text);
    const footer = `\n\n— agent ${reply.agentId.slice(0, 12)}… · ${reply.status}`;
    await replyText(client, chatId, `${reply.text}${footer}`, messageId);
  } catch (err) {
    const msg =
      err instanceof CursorAgentError
        ? `Cursor 启动失败：${err.message}${err.isRetryable ? "（可重试）" : ""}`
        : err instanceof Error
          ? err.message
          : String(err);
    console.error("[bridge] error", err);
    await replyText(client, chatId, `出错了：${msg}`, messageId).catch(() => {});
  } finally {
    inFlight.delete(sessionKey);
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

  const dispatcher = new lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      // Must not throw; Cursor work is async (Feishu 3s ACK).
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
