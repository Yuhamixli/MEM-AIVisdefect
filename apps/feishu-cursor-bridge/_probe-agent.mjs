/**
 * One-shot Cloud Agent probe (no secrets printed).
 * Usage: node _probe-agent.mjs "question"
 */
import "dotenv/config";
import { Agent } from "@cursor/sdk";

const q = process.argv[2] || "仓库 README 第一行写了什么？只答一句话。";
const key = process.env.CURSOR_API_KEY;
const modelId = process.env.CURSOR_MODEL || "composer-2.5";
const repo =
  process.env.CURSOR_CLOUD_REPO ||
  "https://github.com/Yuhamixli/MEM-AIVisdefect";
const ref = process.env.CURSOR_CLOUD_REF || "main";

if (!key) {
  console.error("NO_KEY");
  process.exit(1);
}
console.log(
  JSON.stringify({
    keyLen: key.length,
    modelId,
    repoHost: new URL(repo).host,
    ref,
    qLen: q.length,
  }),
);

const agent = await Agent.create({
  apiKey: key,
  model: { id: modelId },
  name: "probe-feishu",
  cloud: {
    repos: [{ url: repo, startingRef: ref }],
    skipReviewerRequest: true,
  },
});

try {
  const run = await agent.send(q);
  console.log("run", run.id, "requestId", run.requestId);
  const result = await run.wait();
  console.log(
    JSON.stringify({
      status: result.status,
      id: result.id,
      requestId: result.requestId,
      durationMs: result.durationMs,
      model: result.model,
      hasResult: !!result.result,
      resultPreview: (result.result || "").slice(0, 200),
      error: result.error || null,
      keys: Object.keys(result || {}),
    }),
  );
} catch (e) {
  console.log(
    "THROW",
    e?.constructor?.name,
    String(e?.message || e).slice(0, 300),
  );
} finally {
  agent.close();
}
