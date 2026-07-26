(async()=>{
const token=SYNO.SDS.Session.SynoToken;
const DEST="/docker/feishu-cursor-bridge/src";
const name="intent.ts";
const b64="LyoqDQogKiBEZXRlY3QgQGJvdCBtZXNzYWdlcyB0aGF0IGFyZSBOT1QgcmVhbCB0YXNrcyAodXNhZ2UgdGlwcywgZW1wdHkgcGluZ3MpLg0KICogVGhvc2UgbXVzdCBub3QgcmVzdW1lIGEgQ2xvdWQgQWdlbnQg4oCUIG90aGVyd2lzZSB0aGUgZ3JvdXAgc2VlcyB0b3BpYyBkcmlmdC4NCiAqLw0KDQpjb25zdCBNRVRBX1BBVFRFUk5TOiBSZWdFeHBbXSA9IFsNCiAgL14kL3UsDQogIC9eKOS9oOWlvXzlnKjlkJd85Zyo5LiN5ZyofGhpfGhlbGxvfGhleSlbIe+8gS7jgII/77yfXHNdKiQvaXUsDQogIC9eKOW9k+eEtnzlpb3nmoR85Y+v5LulfOayoemXrumimHzooYwpW++8jCzjgIFcc10q55u05o6lXHMqQD8vdSwNCiAgL17nm7TmjqVccypAL3UsDQogIC/osIHpg73lj6/ku6UuKijlronmjpJ857uZKS4qKOa0u3zku7vliqEpL3UsDQogIC/mgI7kuYguKijnlKh86ZeufEApL3UsDQogIC9eKOa1i+ivlXx0ZXN0fHBpbmcpWyHvvIEu44CCXHNdKiQvaXUsDQpdOw0KDQpleHBvcnQgZnVuY3Rpb24gaXNOb25UYXNrTWVudGlvbih0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHsNCiAgY29uc3QgdCA9IHRleHQucmVwbGFjZSgvXHMrL2csICIgIikudHJpbSgpOw0KICBpZiAodC5sZW5ndGggPCAyKSByZXR1cm4gdHJ1ZTsNCiAgLy8gUHVyZSBtZW50aW9uIHJlc2lkdWUgYWZ0ZXIgc3RyaXBwaW5nIEB0b2tlbnMNCiAgaWYgKC9eKOaXoOaWh+acrHxcKOaXoOaWh+acrFwpKSQvdS50ZXN0KHQpKSByZXR1cm4gdHJ1ZTsNCiAgcmV0dXJuIE1FVEFfUEFUVEVSTlMuc29tZSgocmUpID0+IHJlLnRlc3QodCkpOw0KfQ0KDQpleHBvcnQgZnVuY3Rpb24gaGVscE51ZGdlKCk6IHN0cmluZyB7DQogIGNvbnN0IG9wdGlvbnMgPSBbDQogICAgIuWcqOeahOOAguacieWFt+S9k+mXrumimOebtOaOpeivtOWwseihjO+8jOS+i+Wmgu+8muOAjOebuOacuuW4g+e9ruaWh+aho+WcqOWTqu+8n+OAjSIsDQogICAgIuaUtuWIsO+9nuaIkeaYr+afpeS7k+W6k+eUqOeahOOAguivt+W4puS4iuimgeWKnueahOS6i++8jOWIq+WPqiBAIOaIkeWQjeWtl+OAgiIsDQogICAgIuWcqOOAguaKiuS7u+WKoeWGmea4healmuWGjSBAIOaIke+8m+WPquaPkOeUqOazleS4jeeUqOWPq+aIkei3keS4gOi2n+OAgiIsDQogIF07DQogIHJldHVybiBvcHRpb25zW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG9wdGlvbnMubGVuZ3RoKV0hOw0KfQ0K";
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
return {rel:"src/intent.ts",...(await r.json())};
})()