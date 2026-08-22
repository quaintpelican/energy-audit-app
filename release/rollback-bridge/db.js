// Production bridge for safe rollout/rollback around Audist V3.1.
// This is the production V3.1-baseline database API with only a monotonic
// DB version bump and creation of the V3.1 migration-backup store.
const DB_NAME = "FieldEnergyAuditDB";
const DB_VERSION = 3;
const AUDIT_STORE = "audits";
const PHOTO_STORE = "photos";
const MIGRATION_BACKUP_STORE = "migrationBackups";

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(AUDIT_STORE)){
        const store=db.createObjectStore(AUDIT_STORE,{keyPath:"auditId"});
        store.createIndex("updatedAt","updatedAt");
      }
      if(!db.objectStoreNames.contains(PHOTO_STORE)){
        const store=db.createObjectStore(PHOTO_STORE,{keyPath:"photoId"});
        store.createIndex("auditId","auditId");
        store.createIndex("equipmentRecordId","equipmentRecordId");
      }
      if(!db.objectStoreNames.contains(MIGRATION_BACKUP_STORE)){
        const store=db.createObjectStore(MIGRATION_BACKUP_STORE,{keyPath:"backupId"});
        store.createIndex("auditId","auditId");
        store.createIndex("createdAt","createdAt");
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function dbPutAudit(audit){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIT_STORE,"readwrite");
    tx.objectStore(AUDIT_STORE).put(audit);
    tx.oncomplete=()=>resolve(audit);
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGetAudit(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(AUDIT_STORE).objectStore(AUDIT_STORE).get(id);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbGetAllAudits(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(AUDIT_STORE).objectStore(AUDIT_STORE).getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))));
    req.onerror=()=>reject(req.error);
  });
}
async function dbDeleteAudit(id){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([AUDIT_STORE,PHOTO_STORE],"readwrite");
    tx.objectStore(AUDIT_STORE).delete(id);
    const idx=tx.objectStore(PHOTO_STORE).index("auditId");
    const cursorReq=idx.openCursor(IDBKeyRange.only(id));
    cursorReq.onsuccess=e=>{
      const cursor=e.target.result;
      if(cursor){ cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbPutPhoto(photo){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).put(photo);
    tx.oncomplete=()=>resolve(photo);
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGetPhoto(photoId){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).get(photoId);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbDeletePhoto(photoId){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).delete(photoId);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbGetPhotosForEquipment(equipmentRecordId){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).index("equipmentRecordId").getAll(equipmentRecordId);
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

const dbPut=dbPutAudit;
const dbGet=dbGetAudit;
const dbGetAll=dbGetAllAudits;
const dbDelete=dbDeleteAudit;

