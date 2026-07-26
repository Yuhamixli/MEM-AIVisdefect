(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge";
const name="Dockerfile";
const b64="IyBEYW9DbG91ZCBtaXJyb3I6IFN5bm9sb2d5IG9mdGVuIGNhbm5vdCByZWFjaCByZWdpc3RyeS0xLmRvY2tlci5pbyBpbiBDTg0KRlJPTSBkb2NrZXIubS5kYW9jbG91ZC5pby9saWJyYXJ5L25vZGU6MjItYm9va3dvcm0tc2xpbQ0KDQpXT1JLRElSIC9hcHANCg0KIyBOYXRpdmUgYml0cyBmb3IgQGN1cnNvci9zZGsgKHNxbGl0ZSkg4oCUIGtlZXAgaW1hZ2UgbGVhbiBidXQgdXNhYmxlDQpSVU4gYXB0LWdldCB1cGRhdGUgJiYgYXB0LWdldCBpbnN0YWxsIC15IC0tbm8taW5zdGFsbC1yZWNvbW1lbmRzIFwNCiAgICBweXRob24zIG1ha2UgZysrIFwNCiAgJiYgcm0gLXJmIC92YXIvbGliL2FwdC9saXN0cy8qDQoNCkNPUFkgcGFja2FnZS5qc29uIHBhY2thZ2UtbG9jay5qc29uIC5ucG1yYyAuLw0KIyAubnBtcmMg4oaSIHJlZ2lzdHJ5Lm5wbW1pcnJvci5jb20gKyBsb25nZXIgZmV0Y2ggdGltZW91dHMNClJVTiBucG0gY2kgLS1uby1hdWRpdCAtLW5vLWZ1bmQNCg0KQ09QWSB0c2NvbmZpZy5qc29uIC4vDQpDT1BZIHNyYyAuL3NyYw0KQ09QWSBzY3JpcHRzIC4vc2NyaXB0cw0KDQpFTlYgTk9ERV9FTlY9cHJvZHVjdGlvbg0KRU5WIENVUlNPUl9SVU5USU1FPWNsb3VkDQpFTlYgSEVBTFRIX1BPUlQ9ODc4Nw0KRU5WIFJFQ0VOVF9DSEFUX0xJTUlUPTQwDQoNCkVYUE9TRSA4Nzg3DQoNCiMgV2F0Y2hkb2cga2VlcHMgdGhlIEZlaXNodSBXUyBjaGlsZCBhbGl2ZSBpbnNpZGUgdGhlIGNvbnRhaW5lcg0KQ01EIFsibnBtIiwgInJ1biIsICJ3YXRjaGRvZyJdDQo=";
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
return {rel:"Dockerfile",...(await r.json())};
})()