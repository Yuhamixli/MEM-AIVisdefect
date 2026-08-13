/**
 * Tidy Feishu shared drive folder into the canonical NN-* tree.
 *
 * Usage (from apps/feishu-cursor-bridge):
 *   npm run tidy-drive              # dry-run
 *   npm run tidy-drive:apply        # create folders + move root dumps
 *
 * Scope (safe defaults):
 * - Ensure canonical top-level folders exist (incl. 98-待整理 inbox)
 * - Relocate non-canonical top folders into a sensible home
 * - Sweep root-level loose files + everything in 98-待整理 into NN folders
 * - Does NOT reshuffle files already inside other canonical folders
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import * as lark from "@larksuiteoapi/node-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const APP_ID = process.env.FEISHU_APP_ID?.trim();
const APP_SECRET = process.env.FEISHU_APP_SECRET?.trim();
const ROOT =
  process.env.FEISHU_SYNC_FOLDER_TOKEN?.trim() ||
  "JviVfMA56lMkzhdVoZdcEVk9nBd";
const APPLY = process.argv.includes("--apply");

if (!APP_ID || !APP_SECRET) {
  console.error("Missing FEISHU_APP_ID / FEISHU_APP_SECRET in .env");
  process.exit(1);
}

const client = new lark.Client({ appId: APP_ID, appSecret: APP_SECRET });

const INBOX = "98-待整理";

const CANONICAL_FOLDERS = [
  "00-入口",
  "01-项目总览",
  "02-需求与验收",
  "03-技术方案",
  "04-算法与模型",
  "05-采集与数据",
  "06-前端与BI",
  "07-现场与交付",
  "08-项目管理",
  "09-会议与纪要",
  "10-知识沉淀",
  "11-对外材料",
  INBOX,
  "99-归档与原始材料",
] as const;

/** Non-canonical top folders → preferred destination (move whole folder). */
const FOLDER_REHOME: Record<string, string> = {
  "02过程记录照片视频等": "07-现场与交付",
  "99-归档": "99-归档与原始材料",
};

type DriveFile = {
  token?: string;
  name?: string;
  type?: string;
};

type TreeNode = DriveFile & { path: string; children?: TreeNode[] };

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

async function walk(
  folderToken: string,
  rel: string,
  depth: number,
): Promise<TreeNode[]> {
  if (depth > 6) return [];
  const files = await listFolder(folderToken);
  const out: TreeNode[] = [];
  for (const f of files) {
    const name = f.name || "(unnamed)";
    const node: TreeNode = {
      ...f,
      path: rel ? `${rel}/${name}` : name,
    };
    if (f.type === "folder" && f.token) {
      node.children = await walk(f.token, node.path, depth + 1);
    }
    out.push(node);
  }
  return out;
}

async function createFolder(
  parentToken: string,
  name: string,
): Promise<string> {
  const res = (await client.drive.v1.file.createFolder({
    data: {
      name,
      folder_token: parentToken,
    },
  })) as {
    code?: number;
    msg?: string;
    data?: { token?: string };
  };
  if (res.code && res.code !== 0) {
    throw new Error(`createFolder ${name}: ${res.code} ${res.msg}`);
  }
  const token = res.data?.token;
  if (!token) throw new Error(`createFolder ${name}: empty token`);
  return token;
}

async function moveFile(
  fileToken: string,
  type: string,
  folderToken: string,
): Promise<void> {
  const res = (await client.drive.v1.file.move({
    path: { file_token: fileToken },
    data: {
      type: type as
        | "doc"
        | "sheet"
        | "mindnote"
        | "bitable"
        | "file"
        | "docx"
        | "folder"
        | "shortcut",
      folder_token: folderToken,
    },
  })) as { code?: number; msg?: string };
  if (res.code && res.code !== 0) {
    throw new Error(`move ${fileToken}: ${res.code} ${res.msg}`);
  }
}

/** Special-case exact / prefix matches for known root dumps from push-docs. */
const EXACT_TARGET: Record<string, string> = {
  "ADR-001-four-layer-vision-stack": "03-技术方案",
  "ADR-002-reuse-xnoavi-capabilities": "03-技术方案",
  "offline-module-interface": "03-技术方案",
  "open-decisions": "02-需求与验收",
  "wbs-and-schedule": "08-项目管理",
  "m-coin-ledger": "08-项目管理",
  "m-coin-cost-system": "08-项目管理",
  "team-roster": "08-项目管理",
  "team-workstreams": "08-项目管理",
  "team-capability-profile": "01-项目总览",
  "bi-metrics-onepager": "06-前端与BI",
  "change-control": "08-项目管理",
  "evaluation-principles": "02-需求与验收",
  "operation-plan-from-proposal": "08-项目管理",
  "REPO-TODO": "00-入口",
  TODO: "00-入口",
  软件拓扑图: "03-技术方案",
};

function stripPushSuffix(name: string): string {
  // push-docs may truncate titles like "ADR-001-four-layer-vis…842f"
  return name.replace(/…[a-z0-9]+$/i, "").replace(/\.\.\.[a-z0-9]+$/i, "");
}

function classifyRootFile(name: string): string {
  const base = stripPushSuffix(name);
  for (const [key, dest] of Object.entries(EXACT_TARGET)) {
    if (base === key || base.startsWith(key) || name.startsWith(key)) {
      return dest;
    }
  }

  const nn = name.match(/^(\d{2})[_组]/);
  if (nn) {
    const map: Record<string, string> = {
      "00": "00-入口",
      "01": "01-项目总览",
      "02": "02-需求与验收",
      "03": "03-技术方案",
      "04": "04-算法与模型",
      "05": "05-采集与数据",
      "06": "06-前端与BI",
      "07": "07-现场与交付",
      "08": "08-项目管理",
      "09": "09-会议与纪要",
      "10": "10-知识沉淀",
      "11": "11-对外材料",
      "99": "99-归档与原始材料",
    };
    if (map[nn[1]]) return map[nn[1]];
  }

  const n = name.toLowerCase();

  if (/^adr[-_]/i.test(name) || /软件拓扑|接口schema|offline.?module|系统架构/i.test(name)) {
    return "03-技术方案";
  }
  if (/详细方案|详细设计|方案设计|详细…|视觉检测_详细/i.test(name)) {
    return "03-技术方案";
  }
  if (
    /离线检测|近线精修|三层智能|算法线|yolo|patchcore|efficientad|实验计划|实施方案/i.test(
      n,
    ) || /离线检测|近线精修|三层智能|算法|实施方案/.test(name)
  ) {
    return "04-算法与模型";
  }
  if (/未决|open.?decision|需求规格|验收|evaluation/i.test(n) || /未决|需求规格/.test(name)) {
    return "02-需求与验收";
  }
  if (
    /wbs|双周报|风险|m.?coin|m币|沟通管理|报销|周会|里程碑|team-|change.?control|operation.?plan/i.test(
      n,
    ) || /WBS|双周报|风险|M币|沟通|报销|周会|人员|项目计划/.test(name)
  ) {
    return "08-项目管理";
  }
  if (/前端|bi-|看板|意见箱|联调|api契约|程昱涵|metrics/i.test(n) || /前端|看板|程昱涵/.test(name)) {
    return "06-前端与BI";
  }
  if (/采集|相机|光学|缺陷定义|标注|布置/i.test(name)) {
    return "05-采集与数据";
  }
  if (/现场|产线|参观|交付|使用说明|流水线/i.test(name)) {
    return "07-现场与交付";
  }
  if (/会议|纪要|逐字稿/i.test(name)) {
    return "09-会议与纪要";
  }
  if (/专利|论文|bp|分享|商业计划|对外|zl\d|p\d{2}_/i.test(n) || /专利|论文|BP|分享|商业计划/.test(name)) {
    return "11-对外材料";
  }
  if (/入口|文档地图|入库|搭建|todo|repo-todo/i.test(n) || /入口|文档地图|TODO/.test(name)) {
    return "00-入口";
  }
  if (/一页纸|总览|章程|任务书|capability|roster/i.test(n) || /一页纸|章程|任务书/.test(name)) {
    return "01-项目总览";
  }
  if (/行业|工艺|onboarding|知识|进度状态|视觉技术|拉挤工艺/i.test(name)) {
    return "10-知识沉淀";
  }
  // Media / loose binaries at root → archive
  if (/\.(mp4|mov|avi|zip|rar|7z|pdf|docx|xlsx|pptx|jpg|jpeg|png)$/i.test(name)) {
    return "99-归档与原始材料";
  }
  return "99-归档与原始材料";
}

function printTree(nodes: TreeNode[], indent = ""): void {
  const sorted = [...nodes].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "zh"),
  );
  for (const n of sorted) {
    const mark = n.type === "folder" ? "📁" : "📄";
    console.log(`${indent}${mark} ${n.name}  (${n.type})`);
    if (n.children?.length) printTree(n.children, indent + "  ");
  }
}

function isCanonical(name: string): boolean {
  return (CANONICAL_FOLDERS as readonly string[]).includes(name);
}

async function main(): Promise<void> {
  console.log(`[tidy] root=${ROOT} mode=${APPLY ? "APPLY" : "dry-run"}`);
  const tree = await walk(ROOT, "", 0);
  console.log("\n=== current tree (top + 1) ===");
  for (const n of [...tree].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "zh"),
  )) {
    const mark = n.type === "folder" ? "📁" : "📄";
    const kids = n.children?.length ?? 0;
    console.log(
      `${mark} ${n.name}  (${n.type}${n.type === "folder" ? `, ${kids} items` : ""})`,
    );
  }

  const folderByName = new Map<string, string>();
  for (const n of tree) {
    if (n.type === "folder" && n.token && n.name) {
      folderByName.set(n.name, n.token);
    }
  }

  type Action = {
    kind: "create" | "move";
    detail: string;
    run: () => Promise<void>;
  };
  const actions: Action[] = [];

  for (const name of CANONICAL_FOLDERS) {
    if (!folderByName.has(name)) {
      actions.push({
        kind: "create",
        detail: `mkdir ${name}`,
        run: async () => {
          const token = await createFolder(ROOT, name);
          folderByName.set(name, token);
          console.log(`  created ${name} → ${token}`);
        },
      });
    }
  }

  const queueMove = (
    item: TreeNode,
    target: string,
    fromLabel: string,
  ): void => {
    actions.push({
      kind: "move",
      detail: `move ${fromLabel}"${item.name}" (${item.type}) → ${target}/`,
      run: async () => {
        const dest = folderByName.get(target);
        if (!dest) throw new Error(`missing dest ${target}`);
        await moveFile(item.token!, item.type || "file", dest);
      },
    });
  };

  for (const n of tree) {
    if (!n.token || !n.name) continue;

    if (n.type === "folder") {
      // Empty inbox contents into classified folders (shallow: direct children only).
      if (n.name === INBOX) {
        for (const child of n.children || []) {
          if (!child.token || !child.name) continue;
          if (child.type === "folder") {
            const target =
              FOLDER_REHOME[child.name] ||
              (child.name.includes("过程") ||
              child.name.includes("照片") ||
              child.name.includes("视频")
                ? "07-现场与交付"
                : child.name.includes("会议") || child.name.includes("纪要")
                  ? "09-会议与纪要"
                  : "99-归档与原始材料");
            if (target === INBOX) continue;
            queueMove(child, target, `${INBOX}/`);
          } else {
            const target = classifyRootFile(child.name);
            if (target === INBOX) continue;
            queueMove(child, target, `${INBOX}/`);
          }
        }
        continue;
      }

      if (isCanonical(n.name)) continue;

      const target =
        FOLDER_REHOME[n.name] ||
        (n.name.includes("过程") || n.name.includes("照片") || n.name.includes("视频")
          ? "07-现场与交付"
          : n.name.includes("会议") || n.name.includes("纪要")
            ? "09-会议与纪要"
            : "99-归档与原始材料");

      actions.push({
        kind: "move",
        detail: `move folder "${n.name}" → ${target}/`,
        run: async () => {
          const dest = folderByName.get(target);
          if (!dest) throw new Error(`missing dest ${target}`);
          if (n.name === "99-归档" && target === "99-归档与原始材料" && n.children?.length) {
            for (const child of n.children) {
              if (!child.token || !child.type) continue;
              await moveFile(child.token, child.type, dest);
              console.log(`    moved child ${child.name}`);
            }
            return;
          }
          await moveFile(n.token!, "folder", dest);
        },
      });
      continue;
    }

    const target = classifyRootFile(n.name);
    queueMove(n, target, "root/");
  }

  console.log(`\n=== plan (${actions.length} actions) ===`);
  if (!actions.length) {
    console.log("(root already tidy)");
  } else {
    for (const a of actions) console.log(`- [${a.kind}] ${a.detail}`);
  }

  if (!APPLY) {
    console.log("\n[tidy] dry-run only. Re-run with --apply to execute.");
    return;
  }

  for (const a of actions.filter((x) => x.kind === "create")) {
    try {
      await a.run();
    } catch (e) {
      console.error(`FAIL ${a.detail}:`, e);
    }
  }
  for (const a of actions.filter((x) => x.kind === "move")) {
    try {
      await a.run();
      console.log(`OK ${a.detail}`);
    } catch (e) {
      console.error(`FAIL ${a.detail}:`, e);
    }
  }

  console.log("\n=== top-level after ===");
  const after = await walk(ROOT, "", 0);
  for (const n of [...after].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "zh"),
  )) {
    const mark = n.type === "folder" ? "📁" : "📄";
    const kids = n.children?.length ?? 0;
    console.log(
      `${mark} ${n.name}  (${n.type}${n.type === "folder" ? `, ${kids} items` : ""})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
