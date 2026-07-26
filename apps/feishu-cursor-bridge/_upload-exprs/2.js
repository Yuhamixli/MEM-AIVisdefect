(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge";
const name=".env.example";
const b64="IyBDdXJzb3Ig4oCUIGh0dHBzOi8vY3Vyc29yLmNvbS9kYXNoYm9hcmQvaW50ZWdyYXRpb25zDQpDVVJTT1JfQVBJX0tFWT1jdXJzb3JfeHh4eHh4eHgNCg0KIyBGZWlzaHUgYXBwIChNRU0tQUlWaXNkZWZlY3QtQWdlbnQpDQpGRUlTSFVfQVBQX0lEPWNsaV94eHh4eHh4eA0KRkVJU0hVX0FQUF9TRUNSRVQ9eHh4eHh4eHgNCiMgT3B0aW9uYWw7IGF1dG8tcmVzb2x2ZWQgZnJvbSAvYm90L3YzL2luZm8NCiMgRkVJU0hVX0JPVF9PUEVOX0lEPW91X3h4eHh4eHh4DQoNCiMgY2xvdWQgKGRlZmF1bHQpIHwgbG9jYWwNCkNVUlNPUl9SVU5USU1FPWNsb3VkDQpDVVJTT1JfQ0xPVURfUkVQTz1odHRwczovL2dpdGh1Yi5jb20vWXVoYW1peGxpL01FTS1BSVZpc2RlZmVjdA0KQ1VSU09SX0NMT1VEX1JFRj1tYWluDQoNCiMgT25seSBmb3IgQ1VSU09SX1JVTlRJTUU9bG9jYWwNCiMgUkVQT19DV0Q9QTovUHJvamVjdHMvTUVNLUFJVmlzZGVmZWN0DQoNCkNVUlNPUl9NT0RFTD1jb21wb3Nlci0yLjUNClJFUVVJUkVfTUVOVElPTj10cnVlDQpNQVhfUkVQTFlfQ0hBUlM9MzUwMA0KDQojIEF0dGFjaCByZWNlbnQgZ3JvdXAgbWVzc2FnZXMgdG8gZWFjaCBAICgwID0gb2ZmKQ0KUkVDRU5UX0NIQVRfTElNSVQ9NDANCg0KIyBucG0gcnVuIHN5bmMtZG9jcw0KRkVJU0hVX1NZTkNfRk9MREVSX1RPS0VOPUp2aVZmTUE1NmxNa3poZFZvWmRjRVZrOW5CZA0KIyBGRUlTSFVfU1lOQ19PVVQ9Li4vLi4vZG9jcy9hZ2VudC1rbm93bGVkZ2UtYmFzZS9mZWlzaHUtc3luYw0KRkVJU0hVX1NZTkNfTUFYX0RPQ1M9ODANCg0KIyBIZWFsdGggKyB3YXRjaGRvZw0KSEVBTFRIX1BPUlQ9ODc4Nw0KV0FUQ0hET0dfQ0hFQ0tfTVM9MzAwMDANCldBVENIRE9HX0ZBSUxTPTMNCldBVENIRE9HX01BWF9VUFRJTUVfTVM9MjE2MDAwMDANCg0K";
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
return {rel:".env.example",...(await r.json())};
})()