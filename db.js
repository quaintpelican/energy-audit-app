const DB_NAME = "FieldEnergyAuditDB";
const DB_VERSION = 1;
const STORE = "audits";

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store = db.createObjectStore(STORE,{keyPath:"auditId"});
        store.createIndex("updatedAt","updatedAt");
      }
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function dbPut(audit){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(audit);
    tx.oncomplete=()=>resolve(audit);
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGet(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbGetAll(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))));
    req.onerror=()=>reject(req.error);
  });
}
async function dbDelete(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
