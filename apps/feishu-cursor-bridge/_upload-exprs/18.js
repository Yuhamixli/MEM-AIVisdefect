(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge/src";
const name="session-store.ts";
const b64="aW1wb3J0IGZzIGZyb20gIm5vZGU6ZnMiOw0KaW1wb3J0IHBhdGggZnJvbSAibm9kZTpwYXRoIjsNCmltcG9ydCB7IGNvbmZpZyB9IGZyb20gIi4vY29uZmlnLmpzIjsNCg0KdHlwZSBTZXNzaW9uTWFwID0gUmVjb3JkPHN0cmluZywgeyBhZ2VudElkOiBzdHJpbmc7IHVwZGF0ZWRBdDogc3RyaW5nIH0+Ow0KDQpmdW5jdGlvbiBmaWxlUGF0aCgpOiBzdHJpbmcgew0KICByZXR1cm4gcGF0aC5qb2luKGNvbmZpZy5kYXRhRGlyLCAic2Vzc2lvbnMuanNvbiIpOw0KfQ0KDQpmdW5jdGlvbiBsb2FkKCk6IFNlc3Npb25NYXAgew0KICB0cnkgew0KICAgIGNvbnN0IHJhdyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCgpLCAidXRmOCIpOw0KICAgIHJldHVybiBKU09OLnBhcnNlKHJhdykgYXMgU2Vzc2lvbk1hcDsNCiAgfSBjYXRjaCB7DQogICAgcmV0dXJuIHt9Ow0KICB9DQp9DQoNCmZ1bmN0aW9uIHNhdmUobWFwOiBTZXNzaW9uTWFwKTogdm9pZCB7DQogIGZzLm1rZGlyU3luYyhjb25maWcuZGF0YURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7DQogIGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgoKSwgSlNPTi5zdHJpbmdpZnkobWFwLCBudWxsLCAyKSwgInV0ZjgiKTsNCn0NCg0KZXhwb3J0IGZ1bmN0aW9uIGdldEFnZW50SWQoc2Vzc2lvbktleTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHsNCiAgcmV0dXJuIGxvYWQoKVtzZXNzaW9uS2V5XT8uYWdlbnRJZDsNCn0NCg0KZXhwb3J0IGZ1bmN0aW9uIHNldEFnZW50SWQoc2Vzc2lvbktleTogc3RyaW5nLCBhZ2VudElkOiBzdHJpbmcpOiB2b2lkIHsNCiAgY29uc3QgbWFwID0gbG9hZCgpOw0KICBtYXBbc2Vzc2lvbktleV0gPSB7IGFnZW50SWQsIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH07DQogIHNhdmUobWFwKTsNCn0NCg0KZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQWdlbnRJZChzZXNzaW9uS2V5OiBzdHJpbmcpOiB2b2lkIHsNCiAgY29uc3QgbWFwID0gbG9hZCgpOw0KICBkZWxldGUgbWFwW3Nlc3Npb25LZXldOw0KICBzYXZlKG1hcCk7DQp9DQo=";
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
return {rel:"src/session-store.ts",...(await r.json())};
})()