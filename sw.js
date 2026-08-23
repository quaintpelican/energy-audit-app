const CACHE="audist-v3-3-field-ux-1";
const ASSETS=["./","./index.html","./styles.css","./db.js","./app.js","./manifest.webmanifest","./icon.svg","./audist-icon.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>(k.startsWith("field-energy-audit-")||k.startsWith("audist-"))&&k!==CACHE).map(k=>caches.delete(k))))
  );
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  event.respondWith(
    fetch(event.request)
      .then(resp=>{
        if(!resp||!resp.ok) return resp;
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
        return resp;
      })
      .catch(()=>caches.match(event.request))
  );
});

