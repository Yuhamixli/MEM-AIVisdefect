(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge";
const name=".npmrc";
const b64="cmVnaXN0cnk9aHR0cHM6Ly9yZWdpc3RyeS5ucG1taXJyb3IuY29tDQpmZXRjaC1yZXRyaWVzPTUNCmZldGNoLXJldHJ5LW1pbnRpbWVvdXQ9MjAwMDANCmZldGNoLXJldHJ5LW1heHRpbWVvdXQ9MTIwMDAwDQo=";
const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
if(DEST!=='/docker/feishu-cursor-bridge'){
  const parent=DEST.replace(/\/[^/]+$/,'');
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
return {rel:".npmrc",...(await r.json())};
})()