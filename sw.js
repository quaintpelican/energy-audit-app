const CACHE="audist-v6-1-ai-engineering-review-1";
const ASSETS=["./","./index.html","./styles.css?v=6.1.0","./db.js?v=6.1.0","./calculations.js?v=6.1.0","./utility-analysis.js?v=6.1.0","./end-use-analysis.js?v=6.1.0","./portfolio-analysis.js?v=6.1.0","./advanced-analysis.js?v=6.1.0","./workflow.js?v=6.1.0","./qa-rules.js?v=6.1.0","./ai-review.js?v=6.1.0","./package-export.js?v=6.1.0","./app.js?v=6.1.0","./manifest.webmanifest","./icon.svg","./audist-icon.png"];
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
