import { Agent, CursorAgentError, type AgentOptions } from "@cursor/sdk";
import { config, SYSTEM_PREAMBLE } from "./config.js";
import { clearAgentId, getAgentId, setAgentId } from "./session-store.js";

export type AgentReply = {
  text: string;
  agentId: string;
  runId: string;
  status: string;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 20)}\n\n…(已截断)`;
}

function baseOptions(): AgentOptions {
  const apiKey = config.cursorApiKey;
  const model = { id: config.modelId };

  if (config.runtime === "local") {
    return {
      apiKey,
      model,
      local: { cwd: config.repoCwd, settingSources: [] },
    };
  }

  return {
    apiKey,
    model,
    cloud: {
      repos: [
        {
          url: config.cloudRepoUrl,
          startingRef: config.cloudStartingRef,
        },
      ],
      skipReviewerRequest: true,
    },
  };
}

export type RunCursorOptions = {
  /** Optional recent group chat excerpt (already formatted). */
  chatContext?: string;
};

/**
 * Run a Cursor agent (cloud by default) for this Feishu session.
 * Resumes prior agentId when present so follow-ups keep context.
 */
export async function runCursorAgent(
  sessionKey: string,
  userText: string,
  options: RunCursorOptions = {},
): Promise<AgentReply> {
  const ctx = options.chatContext?.trim();
  const prompt = [
    SYSTEM_PREAMBLE,
    ctx ? `\n---\n${ctx}\n` : "",
    `---\n用户当前问题：\n${userText}`,
  ].join("\n");
  const opts = baseOptions();

  const existing = getAgentId(sessionKey);
  let agent = existing
    ? await Agent.resume(existing, opts)
    : await Agent.create({
        ...opts,
        name: `feishu:${sessionKey.slice(0, 24)}`,
      });

  try {
    setAgentId(sessionKey, agent.agentId);
    const run = await agent.send(prompt);
    console.log(
      `[cursor] runtime=${config.runtime} agent=${agent.agentId} run=${run.id} ctxChars=${ctx?.length || 0}`,
    );
    const result = await run.wait();

    if (result.status === "error") {
      return {
        text: `Cursor Agent 运行失败（run=${result.id}）。请稍后重试或换个问法。`,
        agentId: agent.agentId,
        runId: result.id,
        status: result.status,
      };
    }

    const text =
      result.result?.trim() ||
      "（Agent 已完成，但没有返回文本。可换个更具体的问题再试。）";

    return {
      text: truncate(text, config.maxReplyChars),
      agentId: agent.agentId,
      runId: result.id,
      status: result.status,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      if (existing && /not found|AgentNotFound/i.test(err.message)) {
        clearAgentId(sessionKey);
        return runCursorAgent(sessionKey, userText, options);
      }
      throw err;
    }
    throw err;
  } finally {
    agent.close();
  }
}
