/**
 * Push selected repo docs → Feishu cloud docs (zero-touch path for CI).
 *
 * Flow per changed file:
 *   1) hash local file
 *   2) upload material (ccm_import_open)
 *   3) create import_task → poll ticket
 *   4) delete previous Feishu file token (if any)
 *   5) write PUSH_STATE.json
 *
 * Usage (repo root or this package):
 *   npm run push-docs
 *   npm run push-docs -- --dry-run
 *   npm run push-docs -- --force
 *
 * Env:
 *   FEISHU_APP_ID / FEISHU_APP_SECRET  (required unless --dry-run)
 *   FEISHU_PUSH_FOLDER_TOKEN           (optional; falls back to manifest / pull folder)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PKG_ROOT, "../..");

dotenv.config({ path: path.join(PKG_ROOT, ".env") });

type Manifest = {
  version: number;
  targetFolderEnv: string;
  targetFolderFallback: string;
  stateFile: string;
  include: string[];
  exclude: string[];
  titleMaxChars: number;
  commitStateInCi?: boolean;
};

type StateEntry = {
  sha256: string;
  bytes: number;
  title: string;
  feishuToken: string;
  feishuUrl?: string;
  updatedAt: string;
};

type StateFile = {
  version: number;
  updatedAt: string;
  files: Record<string, StateEntry>;
};

type ImportResult = {
  token: string;
  url?: string;
  type?: string;
};

const argv = process.argv.slice(2);
const dryRun =
  argv.includes("--dry-run") ||
  process.env.FEISHU_PUSH_DRY_RUN === "1" ||
  process.env.npm_config_dry_run === "true";
const force =
  argv.includes("--force") ||
  process.env.FEISHU_PUSH_FORCE === "1" ||
  process.env.npm_config_force === "true";
const onlyPathArg = argv.find((a) => a.startsWith("--only="));
const onlyPath = onlyPathArg ? onlyPathArg.slice("--only=".length).replace(/\\/g, "/") : "";

function loadManifest(): Manifest {
  const p = path.join(REPO_ROOT, "docs/feishu-push-manifest.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as Manifest;
}

function globToRegExp(glob: string): RegExp {
  const normalized = glob.replace(/\\/g, "/");
  let re = "";
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (c === "*" && normalized[i + 1] === "*") {
      re += ".*";
      i++;
      if (normalized[i + 1] === "/") i++;
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`, "i");
}

function listFiles(manifest: Manifest): string[] {
  const includeRes = manifest.include.map(globToRegExp);
  const excludeRes = manifest.exclude.map(globToRegExp);
  const out: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      if (name === ".git" || name === "node_modules") continue;
      const abs = path.join(dir, name);
      const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/");
      const st = fs.statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!includeRes.some((r) => r.test(rel))) continue;
      if (excludeRes.some((r) => r.test(rel))) continue;
      if (onlyPath && rel !== onlyPath && !rel.endsWith(onlyPath)) continue;
      out.push(rel);
    }
  }

  // Limit walk roots from include prefixes for speed
  const roots = new Set<string>();
  for (const g of manifest.include) {
    if (!g.includes("*")) {
      // exact file path in include
      const abs = path.join(REPO_ROOT, g);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        const rel = g.replace(/\\/g, "/");
        if (!excludeRes.some((r) => r.test(rel))) out.push(rel);
      }
      continue;
    }
    const prefix = g.split("**")[0].replace(/\/$/, "").replace(/\/[^/]*\*$/, "");
    const rootAbs = path.join(REPO_ROOT, prefix || "docs");
    if (fs.existsSync(rootAbs) && fs.statSync(rootAbs).isDirectory()) {
      roots.add(rootAbs);
    } else if (fs.existsSync(rootAbs) && fs.statSync(rootAbs).isFile()) {
      const rel = path.relative(REPO_ROOT, rootAbs).replace(/\\/g, "/");
      if (includeRes.some((r) => r.test(rel)) && !excludeRes.some((r) => r.test(rel))) {
        out.push(rel);
      }
    }
  }
  for (const root of roots) walk(root);
  return [...new Set(out)].sort();
}

function sha256File(abs: string): { sha256: string; bytes: number } {
  const buf = fs.readFileSync(abs);
  return {
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
  };
}

function feishuTitle(rel: string, maxChars: number): string {
  const base = path.basename(rel).replace(/\.(md|markdown|docx|doc)$/i, "");
  const cleaned = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  if (cleaned.length <= maxChars) return cleaned;
  // keep readable head + short hash
  const hash = crypto.createHash("sha1").update(rel).digest("hex").slice(0, 4);
  const head = cleaned.slice(0, Math.max(8, maxChars - 5));
  return `${head}…${hash}`.slice(0, maxChars);
}

function loadState(stateAbs: string): StateFile {
  if (!fs.existsSync(stateAbs)) {
    return { version: 1, updatedAt: new Date(0).toISOString(), files: {} };
  }
  return JSON.parse(fs.readFileSync(stateAbs, "utf8")) as StateFile;
}

function saveState(stateAbs: string, state: StateFile) {
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateAbs), { recursive: true });
  fs.writeFileSync(stateAbs, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function getTenantToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    },
  );
  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
  };
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`tenant_access_token failed: ${data.code} ${data.msg}`);
  }
  return data.tenant_access_token;
}

async function uploadForImport(
  token: string,
  filePath: string,
  fileName: string,
  fileExtension: string,
): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append("file_name", fileName);
  form.append("parent_type", "ccm_import_open");
  form.append("size", String(buf.length));
  form.append(
    "extra",
    JSON.stringify({ obj_type: "docx", file_extension: fileExtension }),
  );
  form.append("file", new Blob([Uint8Array.from(buf)]), fileName);

  const res = await fetch("https://open.feishu.cn/open-apis/drive/v1/medias/upload_all", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: { file_token?: string };
  };
  if (data.code !== 0 || !data.data?.file_token) {
    throw new Error(`upload_all failed: ${data.code} ${data.msg}`);
  }
  return data.data.file_token;
}

async function createImportTask(
  token: string,
  fileToken: string,
  fileExtension: string,
  title: string,
  folderToken: string,
): Promise<string> {
  const res = await fetch("https://open.feishu.cn/open-apis/drive/v1/import_tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      file_extension: fileExtension,
      file_token: fileToken,
      type: "docx",
      file_name: title,
      point: {
        mount_type: 1,
        mount_key: folderToken,
      },
    }),
  });
  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: { ticket?: string };
  };
  if (data.code !== 0 || !data.data?.ticket) {
    throw new Error(`import_tasks create failed: ${data.code} ${data.msg}`);
  }
  return data.data.ticket;
}

async function pollImport(token: string, ticket: string): Promise<ImportResult> {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const res = await fetch(
      `https://open.feishu.cn/open-apis/drive/v1/import_tasks/${encodeURIComponent(ticket)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: {
        result?: {
          job_status?: number;
          job_error_msg?: string;
          token?: string;
          url?: string;
          type?: string;
        };
      };
    };
    if (data.code !== 0) {
      throw new Error(`import_tasks get failed: ${data.code} ${data.msg}`);
    }
    const result = data.data?.result;
    const status = result?.job_status;
    // 0 success, 1 initializing, 2 processing; other = fail
    if (status === 0 && result?.token) {
      return { token: result.token, url: result.url, type: result.type };
    }
    if (status !== undefined && status !== 1 && status !== 2) {
      throw new Error(
        `import failed status=${status} ${result?.job_error_msg || ""}`.trim(),
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("import poll timeout");
}

async function deleteFile(token: string, fileToken: string): Promise<void> {
  const res = await fetch(
    `https://open.feishu.cn/open-apis/drive/v1/files/${encodeURIComponent(fileToken)}?type=docx`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json()) as { code?: number; msg?: string };
  // 忽略已删除/无权限等非致命情况，避免阻断新文档落地
  if (data.code && data.code !== 0) {
    console.warn(`  warn delete ${fileToken}: ${data.code} ${data.msg}`);
  }
}

function extOf(rel: string): "md" | "docx" | "doc" | null {
  const lower = rel.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".doc")) return "doc";
  return null;
}

async function main(): Promise<void> {
  const manifest = loadManifest();
  const folder =
    process.env[manifest.targetFolderEnv]?.trim() ||
    process.env.FEISHU_SYNC_FOLDER_TOKEN?.trim() ||
    manifest.targetFolderFallback;
  const stateAbs = path.join(REPO_ROOT, manifest.stateFile);
  const state = loadState(stateAbs);
  const files = listFiles(manifest);

  console.log(`[push] repo=${REPO_ROOT}`);
  console.log(`[push] folder=${folder}`);
  console.log(`[push] candidates=${files.length} dryRun=${dryRun} force=${force}`);

  const appId = process.env.FEISHU_APP_ID?.trim();
  const appSecret = process.env.FEISHU_APP_SECRET?.trim();
  if (!dryRun && (!appId || !appSecret)) {
    throw new Error("Missing FEISHU_APP_ID / FEISHU_APP_SECRET");
  }

  let tenant = "";
  if (!dryRun) {
    tenant = await getTenantToken(appId!, appSecret!);
  }

  let pushed = 0;
  let skipped = 0;
  let failed = 0;

  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    const ext = extOf(rel);
    if (!ext) {
      skipped += 1;
      continue;
    }
    const { sha256, bytes } = sha256File(abs);
    const prev = state.files[rel];
    if (!force && prev?.sha256 === sha256 && prev.feishuToken) {
      skipped += 1;
      continue;
    }

    const title = feishuTitle(rel, manifest.titleMaxChars);
    const importName = `${title}.${ext === "md" ? "md" : ext}`;
    console.log(`[push] ${rel} → "${title}" (${bytes} bytes)`);

    if (dryRun) {
      pushed += 1;
      continue;
    }

    try {
      const fileToken = await uploadForImport(tenant, abs, importName, ext === "md" ? "md" : ext);
      const ticket = await createImportTask(
        tenant,
        fileToken,
        ext === "md" ? "md" : ext,
        title,
        folder,
      );
      const imported = await pollImport(tenant, ticket);

      if (prev?.feishuToken && prev.feishuToken !== imported.token) {
        await deleteFile(tenant, prev.feishuToken);
      }

      state.files[rel] = {
        sha256,
        bytes,
        title,
        feishuToken: imported.token,
        feishuUrl: imported.url,
        updatedAt: new Date().toISOString(),
      };
      pushed += 1;
      console.log(`  OK token=${imported.token}`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${rel}: ${msg}`);
    }
  }

  if (!dryRun) {
    saveState(stateAbs, state);
  }

  // machine-readable summary for CI
  const summary = {
    pushed,
    skipped,
    failed,
    stateFile: manifest.stateFile,
    dryRun,
  };
  console.log(`[push] done ${JSON.stringify(summary)}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
