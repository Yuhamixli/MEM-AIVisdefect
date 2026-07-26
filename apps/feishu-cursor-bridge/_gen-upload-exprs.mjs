import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "feishu-cursor-bridge-deploy");
const out = path.join(__dirname, "_upload-exprs");
fs.mkdirSync(out, { recursive: true });

function walk(dir, base = dir) {
  const outList = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) outList.push(...walk(full, base));
    else outList.push(path.relative(base, full).replaceAll("\\", "/"));
  }
  return outList;
}

const files = walk(root);
const manifest = [];

for (const rel of files) {
  const b64 = fs.readFileSync(path.join(root, rel)).toString("base64");
  const destDir = path.posix.dirname(`/docker/feishu-cursor-bridge/${rel}`);
  const name = path.posix.basename(rel);
  const expr = `(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST=${JSON.stringify(destDir)};
const name=${JSON.stringify(name)};
const b64=${JSON.stringify(b64)};
const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
if(DEST!=='/docker/feishu-cursor-bridge'){
  const parent=DEST.replace(/\\/[^/]+$/,'');
  const folder=DEST.split('/').pop();
  await fetch('/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&version=2&method=create&folder_path='+encodeURIComponent(JSON.stringify(parent))+'&name='+encodeURIComponent(JSON.stringify(folder))+'&force_parent=true&SynoToken='+encodeURIComponent(token),{credentials:'include',headers:{'X-SYNO-TOKEN':token}});
}
const form=new FormData();
form.set('api','SYNO.FileStation.Upload');
form.set('version','2');
form.set('method','upload');
form.set('path',DEST);
form.set('create_parents','true');
form.set('overwrite','true');
form.set('file',new Blob([bin]),name);
const r=await fetch('/webapi/entry.cgi',{method:'POST',credentials:'include',headers:{'X-SYNO-TOKEN':token},body:form});
return {rel:${JSON.stringify(rel)},...(await r.json())};
})()`;
  const i = manifest.length;
  fs.writeFileSync(path.join(out, `${i}.js`), expr);
  manifest.push({ i, rel, bytes: b64.length });
}

fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(manifest.map((m) => `${m.i}: ${m.rel} (${m.bytes})`).join("\n"));
