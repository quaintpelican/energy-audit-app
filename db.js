const DB_NAME = "FieldEnergyAuditDB";
const DB_VERSION = 2;
const AUDIT_STORE = "audits";
const PHOTO_STORE = "photos";

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(AUDIT_STORE)){
        const store = db.createObjectStore(AUDIT_STORE,{keyPath:"auditId"});
        store.createIndex("updatedAt","updatedAt");
      }
      if(!db.objectStoreNames.contains(PHOTO_STORE)){
        const store = db.createObjectStore(PHOTO_STORE,{keyPath:"photoId"});
        store.createIndex("auditId","auditId");
        store.createIndex("equipmentRecordId","equipmentRecordId");
      }
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}

async function dbPutAudit(audit){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIT_STORE,"readwrite");
    tx.objectStore(AUDIT_STORE).put(audit);
    tx.oncomplete=()=>resolve(audit);
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGetAudit(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(AUDIT_STORE).objectStore(AUDIT_STORE).get(id);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbGetAllAudits(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(AUDIT_STORE).objectStore(AUDIT_STORE).getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))));
    req.onerror=()=>reject(req.error);
  });
}
async function dbDeleteAudit(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([AUDIT_STORE,PHOTO_STORE],"readwrite");
    tx.objectStore(AUDIT_STORE).delete(id);
    const photoStore=tx.objectStore(PHOTO_STORE);
    const idx=photoStore.index("auditId");
    const range=IDBKeyRange.only(id);
    const cursorReq=idx.openCursor(range);
    cursorReq.onsuccess=e=>{
      const cursor=e.target.result;
      if(cursor){ cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

async function dbPutPhoto(photo){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).put(photo);
    tx.oncomplete=()=>resolve(photo);
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGetPhoto(photoId){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).get(photoId);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbDeletePhoto(photoId){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).delete(photoId);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGetPhotosForEquipment(equipmentRecordId){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).index("equipmentRecordId").getAll(equipmentRecordId);
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

// Backward-compatible aliases used by older code paths if needed.
const dbPut = dbPutAudit;
const dbGet = dbGetAudit;
const dbGetAll = dbGetAllAudits;
const dbDelete = dbDeleteAudit;
