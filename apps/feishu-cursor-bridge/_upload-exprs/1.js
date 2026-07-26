(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge";
const name=".env";
const b64="Q1VSU09SX0FQSV9LRVk9Y3Jzcl83MzFiMmQ1MTQyOWIwYjgzOGE4YjY3Njc0YTVlYjZiNmQwNTFlOWFlMWNkNjNkYzI4OWE0NzNjMzQ2M2Q4YTdjDQpGRUlTSFVfQVBQX0lEPWNsaV9hYWQxOWYyNTk3MzhkZDBjDQpGRUlTSFVfQVBQX1NFQ1JFVD1MTmtTUFlBTkU0cXlLWEpQdkdQVVdmU3BwSk1FbUdzZg0KQ1VSU09SX01PREVMPWNvbXBvc2VyLTIuNQ0KUkVRVUlSRV9NRU5USU9OPXRydWUNCkZFSVNIVV9CT1RfT1BFTl9JRD1vdV8wYjYwNzFkODA5NDgxYjA5NGZjZTA5MTRhNzI0ODVlMA0KCkNVUlNPUl9SVU5USU1FPWNsb3VkCkNVUlNPUl9DTE9VRF9SRVBPPWh0dHBzOi8vZ2l0aHViLmNvbS9ZdWhhbWl4bGkvTUVNLUFJVmlzZGVmZWN0CkNVUlNPUl9DTE9VRF9SRUY9bWFpbg0KClJFQ0VOVF9DSEFUX0xJTUlUPTQwDQoKRkVJU0hVX1NZTkNfRk9MREVSX1RPS0VOPUp2aVZmTUE1NmxNa3poZFZvWmRjRVZrOW5CZA0KCkhFQUxUSF9QT1JUPTg3ODcNCg==";
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
return {rel:".env",...(await r.json())};
})()