/**
 * Sync Feishu shared folder docs → docs/agent-knowledge-base/feishu-sync/
 *
 * Usage (from apps/feishu-cursor-bridge):
 *   npm run sync-docs
 *
 * Requires drive + docx read scopes on the app, then commit & push so Cloud Agent sees them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import * as lark from "@larksuiteoapi/node-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const APP_ID = process.env.FEISHU_APP_ID?.trim();
const APP_SECRET = process.env.FEISHU_APP_SECRET?.trim();
const FOLDER =
  process.env.FEISHU_SYNC_FOLDER_TOKEN?.trim() ||
  "JviVfMA56lMkzhdVoZdcEVk9nBd";
const OUT_DIR = path.resolve(
  process.env.FEISHU_SYNC_OUT?.trim() ||
    path.join(__dirname, "../../../docs/agent-knowledge-base/feishu-sync"),
);
const MAX_DOCS = Number(process.env.FEISHU_SYNC_MAX_DOCS || 80) || 80;
const MAX_CHARS = Number(process.env.FEISHU_SYNC_MAX_CHARS || 80000) || 80000;

if (!APP_ID || !APP_SECRET) {
  console.error("Missing FEISHU_APP_ID / FEISHU_APP_SECRET in .env");
  process.exit(1);
}

const client = new lark.Client({ appId: APP_ID, appSecret: APP_SECRET });

type DriveFile = {
  token?: string;
  name?: string;
  type?: string; // folder | docx | doc | sheet | bitable | file ...
  url?: string;
};

function safeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function listFolder(folderToken: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = (await client.drive.v1.file.list({
      params: {
        folder_token: folderToken,
        page_size: 50,
        page_token: pageToken,
      },
    })) as {
      code?: number;
      msg?: string;
      data?: { files?: DriveFile[]; next_page_token?: string; has_more?: boolean };
    };
    if (res.code && res.code !== 0) {
      throw new Error(`drive list failed: ${res.code} ${res.msg}`);
    }
    files.push(...(res.data?.files || []));
    pageToken = res.data?.has_more ? res.data.next_page_token : undefined;
  } while (pageToken);
  return files;
}

async function rawDocx(documentId: string): Promise<string> {
  const res = (await client.docx.v1.document.rawContent({
    path: { document_id: documentId },
  })) as { code?: number; msg?: string; data?: { content?: string } };
  if (res.code && res.code !== 0) {
    throw new Error(`docx rawContent: ${res.code} ${res.msg}`);
  }
  return res.data?.content || "";
}

type Synced = {
  title: string;
  relPath: string;
  token: string;
  type: string;
  chars: number;
  ok: boolean;
  error?: string;
};

async function walk(
  folderToken: string,
  relParts: string[],
  acc: Synced[],
  counters: { docs: number },
): Promise<void> {
  if (counters.docs >= MAX_DOCS) return;
  const files = await listFolder(folderToken);

  for (const f of files) {
    if (counters.docs >= MAX_DOCS) break;
    const name = f.name || f.token || "untitled";
    const type = f.type || "";

    if (type === "folder" && f.token) {
      await walk(f.token, [...relParts, safeName(name)], acc, counters);
      continue;
    }

    // Feishu new docs are usually docx; skip sheets/binaries for now
    if (type !== "docx" && type !== "doc") {
      acc.push({
        title: name,
        relPath: "",
        token: f.token || "",
        type,
        chars: 0,
        ok: false,
        error: `skip type=${type}`,
      });
      continue;
    }

    if (!f.token) continue;
    counters.docs += 1;
    const dir = path.join(OUT_DIR, ...relParts);
    fs.mkdirSync(dir, { recursive: true });
    const base = safeName(name).replace(/\.docx?$/i, "");
    const outFile = path.join(dir, `${base}.md`);
    const relPath = path.relative(OUT_DIR, outFile).replace(/\\/g, "/");

    try {
      let body = await rawDocx(f.token);
      if (body.length > MAX_CHARS) {
        body = `${body.slice(0, MAX_CHARS)}\n\n…(已截断，原文更长)`;
      }
      const md = [
        `# ${name}`,
        "",
        `> 同步自飞书 · token=\`${f.token}\` · type=${type} · ${new Date().toISOString().slice(0, 10)}`,
        f.url ? `>` : ">",
        f.url ? `> 链接: ${f.url}` : "",
        "",
        body.trim() || "_(空文档)_",
        "",
      ]
        .filter((line, i, arr) => !(line === ">" && arr[i + 1]?.startsWith(">")))
        .join("\n")
        .replace(/>\n\n/g, ">\n");

      fs.writeFileSync(outFile, md, "utf8");
      acc.push({
        title: name,
        relPath,
        token: f.token,
        type,
        chars: body.length,
        ok: true,
      });
      console.log(`OK  ${relPath} (${body.length} chars)`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      acc.push({
        title: name,
        relPath,
        token: f.token,
        type,
        chars: 0,
        ok: false,
        error,
      });
      console.warn(`FAIL ${name}: ${error}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`[sync] folder=${FOLDER}`);
  console.log(`[sync] out=${OUT_DIR}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const synced: Synced[] = [];
  await walk(FOLDER, [], synced, { docs: 0 });

  const ok = synced.filter((s) => s.ok);
  const index = [
    "# 飞书同步索引",
    "",
    `更新时间：${new Date().toISOString()}`,
    `根文件夹 token：\`${FOLDER}\``,
    `成功：${ok.length} / 尝试：${synced.filter((s) => s.type === "docx" || s.type === "doc" || s.ok).length}`,
    "",
    "## 已同步",
    "",
    ...ok.map((s) => `- [${s.title}](./${s.relPath}) (\`${s.token}\`, ${s.chars} chars)`),
    "",
    "## 跳过 / 失败",
    "",
    ...synced
      .filter((s) => !s.ok)
      .map((s) => `- ${s.title} (${s.type}) — ${s.error || "skip"}`),
    "",
    "> Cloud Agent 只读 GitHub：同步后请 `git add docs/agent-knowledge-base/feishu-sync && git commit && git push`。",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "INDEX.md"), index, "utf8");
  console.log(`[sync] done → INDEX.md (${ok.length} docs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
