(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge";
const name="package.json";
const b64="ewogICJuYW1lIjogImZlaXNodS1jdXJzb3ItYnJpZGdlIiwKICAidmVyc2lvbiI6ICIwLjEuMCIsCiAgInByaXZhdGUiOiB0cnVlLAogICJ0eXBlIjogIm1vZHVsZSIsCiAgImRlc2NyaXB0aW9uIjogIkZlaXNodSBib3Qg4oaUIEN1cnNvciBTREsgYnJpZGdlIGZvciBNRU0tQUlWaXNkZWZlY3QiLAogICJzY3JpcHRzIjogewogICAgImRldiI6ICJ0c3ggd2F0Y2ggc3JjL2luZGV4LnRzIiwKICAgICJzdGFydCI6ICJ0c3ggc3JjL2luZGV4LnRzIiwKICAgICJ3YXRjaGRvZyI6ICJub2RlIHNjcmlwdHMvd2F0Y2hkb2cubWpzIiwKICAgICJzeW5jLWRvY3MiOiAidHN4IHNjcmlwdHMvc3luYy1mZWlzaHUtZG9jcy50cyIsCiAgICAidHlwZWNoZWNrIjogInRzYyAtLW5vRW1pdCIKICB9LAogICJlbmdpbmVzIjogewogICAgIm5vZGUiOiAiPj0xOCIKICB9LAogICJkZXBlbmRlbmNpZXMiOiB7CiAgICAiQGN1cnNvci9zZGsiOiAiXjEuMC4xOCIsCiAgICAiQGxhcmtzdWl0ZW9hcGkvbm9kZS1zZGsiOiAiXjEuNTUuMCIsCiAgICAiZG90ZW52IjogIl4xNi42LjEiCiAgfSwKICAiZGV2RGVwZW5kZW5jaWVzIjogewogICAgIkB0eXBlcy9ub2RlIjogIl4yNC4wLjAiLAogICAgInRzeCI6ICJeNC4yMC4wIiwKICAgICJ0eXBlc2NyaXB0IjogIl41LjguMyIKICB9Cn0K";
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
return {rel:"package.json",...(await r.json())};
})()