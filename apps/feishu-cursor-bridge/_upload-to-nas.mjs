/**
 * Upload deploy folder to Synology File Station.
 * Usage: node _upload-to-nas.mjs <cookie> <synoToken>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "feishu-cursor-bridge-deploy");
const BASE = "http://192.168.1.82:5000";
const DEST = "/docker/feishu-cursor-bridge";

const cookie = process.argv[2];
const token = process.argv[3];
if (!cookie || !token) {
  console.error("Usage: node _upload-to-nas.mjs <cookie> <synoToken>");
  process.exit(1);
}

function walk(dir, base = dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full, base));
    else out.push(path.relative(base, full).replaceAll("\\", "/"));
  }
  return out;
}

async function ensureDir(folderPath) {
  const url = new URL("/webapi/entry.cgi", BASE);
  url.searchParams.set("api", "SYNO.FileStation.CreateFolder");
  url.searchParams.set("version", "2");
  url.searchParams.set("method", "create");
  url.searchParams.set("folder_path", JSON.stringify(path.posix.dirname(folderPath)));
  url.searchParams.set("name", JSON.stringify(path.posix.basename(folderPath)));
  url.searchParams.set("force_parent", "true");
  url.searchParams.set("SynoToken", token);
  const r = await fetch(url, {
    headers: { Cookie: cookie, "X-SYNO-TOKEN": token },
  });
  return r.json();
}

async function uploadFile(relPath) {
  const abs = path.join(ROOT, relPath);
  const destDir = path.posix.dirname(`${DEST}/${relPath}`);
  if (destDir !== DEST) {
    await ensureDir(destDir);
  }
  const blob = new Blob([fs.readFileSync(abs)]);
  const form = new FormData();
  form.set("api", "SYNO.FileStation.Upload");
  form.set("version", "2");
  form.set("method", "upload");
  form.set("path", destDir === "." ? DEST : destDir);
  form.set("create_parents", "true");
  form.set("overwrite", "true");
  form.set("SynoToken", token);
  form.set("file", blob, path.posix.basename(relPath));

  const url = `${BASE}/webapi/entry.cgi?SynoToken=${encodeURIComponent(token)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Cookie: cookie, "X-SYNO-TOKEN": token },
    body: form,
  });
  const j = await r.json();
  if (!j.success) {
    throw new Error(`Upload failed ${relPath}: ${JSON.stringify(j)}`);
  }
  return j;
}

const files = walk(ROOT);
console.log(`Uploading ${files.length} files to ${DEST} ...`);
for (const f of files) {
  process.stdout.write(`  ${f} ... `);
  await uploadFile(f);
  console.log("ok");
}
console.log("done");
