(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge/src";
const name="health.ts";
const b64="aW1wb3J0IGh0dHAgZnJvbSAibm9kZTpodHRwIjsNCg0KZXhwb3J0IHR5cGUgSGVhbHRoU3RhdGUgPSB7DQogIHN0YXJ0ZWRBdDogc3RyaW5nOw0KICB3c1JlYWR5OiBib29sZWFuOw0KICBsYXN0RXZlbnRBdDogc3RyaW5nIHwgbnVsbDsNCiAgbGFzdEV2ZW50VHlwZTogc3RyaW5nIHwgbnVsbDsNCiAgZXZlbnRzVG90YWw6IG51bWJlcjsNCiAgcGlkOiBudW1iZXI7DQp9Ow0KDQpjb25zdCBzdGF0ZTogSGVhbHRoU3RhdGUgPSB7DQogIHN0YXJ0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLA0KICB3c1JlYWR5OiBmYWxzZSwNCiAgbGFzdEV2ZW50QXQ6IG51bGwsDQogIGxhc3RFdmVudFR5cGU6IG51bGwsDQogIGV2ZW50c1RvdGFsOiAwLA0KICBwaWQ6IHByb2Nlc3MucGlkLA0KfTsNCg0KZXhwb3J0IGZ1bmN0aW9uIG1hcmtXc1JlYWR5KCk6IHZvaWQgew0KICBzdGF0ZS53c1JlYWR5ID0gdHJ1ZTsNCn0NCg0KZXhwb3J0IGZ1bmN0aW9uIG1hcmtFdmVudCh0eXBlOiBzdHJpbmcpOiB2b2lkIHsNCiAgc3RhdGUubGFzdEV2ZW50QXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7DQogIHN0YXRlLmxhc3RFdmVudFR5cGUgPSB0eXBlOw0KICBzdGF0ZS5ldmVudHNUb3RhbCArPSAxOw0KfQ0KDQpleHBvcnQgZnVuY3Rpb24gZ2V0SGVhbHRoKCk6IEhlYWx0aFN0YXRlICYgeyBvazogYm9vbGVhbjsgdXB0aW1lU2VjOiBudW1iZXIgfSB7DQogIGNvbnN0IHVwdGltZVNlYyA9IE1hdGguZmxvb3IoDQogICAgKERhdGUubm93KCkgLSBEYXRlLnBhcnNlKHN0YXRlLnN0YXJ0ZWRBdCkpIC8gMTAwMCwNCiAgKTsNCiAgcmV0dXJuIHsNCiAgICAuLi5zdGF0ZSwNCiAgICBvazogc3RhdGUud3NSZWFkeSwNCiAgICB1cHRpbWVTZWMsDQogIH07DQp9DQoNCi8qKiBUaW55IGxvY2FsIGhlYWx0aCBlbmRwb2ludCBmb3IgdGhlIHdhdGNoZG9nIC8gTkFTIHByb2Jlcy4gKi8NCmV4cG9ydCBmdW5jdGlvbiBzdGFydEhlYWx0aFNlcnZlcihwb3J0OiBudW1iZXIpOiB2b2lkIHsNCiAgY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7DQogICAgaWYgKHJlcS51cmwgPT09ICIvaGVhbHRoIiB8fCByZXEudXJsID09PSAiLyIpIHsNCiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnN0cmluZ2lmeShnZXRIZWFsdGgoKSwgbnVsbCwgMik7DQogICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAiQ29udGVudC1UeXBlIjogImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgiIH0pOw0KICAgICAgcmVzLmVuZChib2R5KTsNCiAgICAgIHJldHVybjsNCiAgICB9DQogICAgcmVzLndyaXRlSGVhZCg0MDQpOw0KICAgIHJlcy5lbmQoIm5vdCBmb3VuZCIpOw0KICB9KTsNCiAgc2VydmVyLmxpc3Rlbihwb3J0LCAiMC4wLjAuMCIsICgpID0+IHsNCiAgICBjb25zb2xlLmxvZyhgW2hlYWx0aF0gaHR0cDovLzAuMC4wLjA6JHtwb3J0fS9oZWFsdGhgKTsNCiAgfSk7DQp9DQo=";
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
return {rel:"src/health.ts",...(await r.json())};
})()