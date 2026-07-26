import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

type SessionEntry = {
  agentId: string;
  updatedAt: string;
  /** Model id used when this agent was created / last bound */
  modelId?: string;
};

type SessionMap = Record<string, SessionEntry>;

function filePath(): string {
  return path.join(config.dataDir, "sessions.json");
}

function stampPath(): string {
  return path.join(config.dataDir, "model-stamp.txt");
}

function load(): SessionMap {
  try {
    const raw = fs.readFileSync(filePath(), "utf8");
    return JSON.parse(raw) as SessionMap;
  } catch {
    return {};
  }
}

function save(map: SessionMap): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(map, null, 2), "utf8");
}

/** Drop all sessions when CURSOR_MODEL changes so resume cannot keep an old-model agent. */
export function clearSessionsIfModelChanged(modelId: string): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  let prev = "";
  try {
    prev = fs.readFileSync(stampPath(), "utf8").trim();
  } catch {
    /* first boot */
  }
  if (prev === modelId) return;
  save({});
  fs.writeFileSync(stampPath(), modelId, "utf8");
  console.log(
    `[session] cleared all sessions (model ${prev || "none"} → ${modelId})`,
  );
}

export function getAgentId(sessionKey: string): string | undefined {
  const entry = load()[sessionKey];
  if (!entry?.agentId) return undefined;
  // Missing/mismatched modelId → force Agent.create (resume keeps old model)
  if (!entry.modelId || entry.modelId !== config.modelId) {
    clearAgentId(sessionKey);
    return undefined;
  }
  return entry.agentId;
}

export function setAgentId(sessionKey: string, agentId: string): void {
  const map = load();
  map[sessionKey] = {
    agentId,
    modelId: config.modelId,
    updatedAt: new Date().toISOString(),
  };
  save(map);
}

export function clearAgentId(sessionKey: string): void {
  const map = load();
  delete map[sessionKey];
  save(map);
}

export function clearAllSessions(): void {
  save({});
}
