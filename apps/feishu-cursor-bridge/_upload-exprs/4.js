(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge";
const name="docker-compose.yml";
const b64="IyBTeW5vbG9neSBDb250YWluZXIgTWFuYWdlciAvIERvY2tlciBDb21wb3NlDQojIDEpIENvcHkgLmVudi5leGFtcGxlIOKGkiAuZW52IGFuZCBmaWxsIHNlY3JldHMNCiMgMikgUHJvamVjdCBwYXRoIG9uIE5BUyBlLmcuIC92b2x1bWUxL2RvY2tlci9mZWlzaHUtY3Vyc29yLWJyaWRnZQ0KIyAzKSBDb250YWluZXIgTWFuYWdlciDihpIgUHJvamVjdCDihpIgQ3JlYXRlIGZyb20gdGhpcyBjb21wb3NlIGZpbGUNCg0Kc2VydmljZXM6DQogIGZlaXNodS1icmlkZ2U6DQogICAgYnVpbGQ6IC4NCiAgICBjb250YWluZXJfbmFtZTogZmVpc2h1LWN1cnNvci1icmlkZ2UNCiAgICByZXN0YXJ0OiB1bmxlc3Mtc3RvcHBlZA0KICAgIGVudl9maWxlOg0KICAgICAgLSAuZW52DQogICAgZW52aXJvbm1lbnQ6DQogICAgICBDVVJTT1JfUlVOVElNRTogY2xvdWQNCiAgICAgIEhFQUxUSF9QT1JUOiAiODc4NyINCiAgICAgIFdBVENIRE9HX0NIRUNLX01TOiAiMzAwMDAiDQogICAgICBXQVRDSERPR19GQUlMUzogIjMiDQogICAgICBXQVRDSERPR19NQVhfVVBUSU1FX01TOiAiMjE2MDAwMDAiICMgNmggc29mdCByZWN5Y2xlDQogICAgcG9ydHM6DQogICAgICAtICI4Nzg3Ojg3ODciDQogICAgdm9sdW1lczoNCiAgICAgIC0gYnJpZGdlLWRhdGE6L2FwcC8uZGF0YQ0KICAgIGxvZ2dpbmc6DQogICAgICBkcml2ZXI6IGpzb24tZmlsZQ0KICAgICAgb3B0aW9uczoNCiAgICAgICAgbWF4LXNpemU6ICIxMG0iDQogICAgICAgIG1heC1maWxlOiAiMyINCg0Kdm9sdW1lczoNCiAgYnJpZGdlLWRhdGE6DQo=";
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
return {rel:"docker-compose.yml",...(await r.json())};
})()