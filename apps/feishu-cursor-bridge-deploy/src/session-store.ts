import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

type SessionMap = Record<string, { agentId: string; updatedAt: string }>;

function filePath(): string {
  return path.join(config.dataDir, "sessions.json");
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

export function getAgentId(sessionKey: string): string | undefined {
  return load()[sessionKey]?.agentId;
}

export function setAgentId(sessionKey: string, agentId: string): void {
  const map = load();
  map[sessionKey] = { agentId, updatedAt: new Date().toISOString() };
  save(map);
}

export function clearAgentId(sessionKey: string): void {
  const map = load();
  delete map[sessionKey];
  save(map);
}
