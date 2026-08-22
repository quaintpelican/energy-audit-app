const DB_NAME = "FieldEnergyAuditDB";
const DB_VERSION = 3;
const AUDIT_STORE = "audits";
const PHOTO_STORE = "photos";
const MIGRATION_BACKUP_STORE = "migrationBackups";

let dbPromise = null;

function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked=false;
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
      if(!db.objectStoreNames.contains(MIGRATION_BACKUP_STORE)){
        const store = db.createObjectStore(MIGRATION_BACKUP_STORE,{keyPath:"backupId"});
        store.createIndex("auditId","auditId");
        store.createIndex("createdAt","createdAt");
      }
    };
    req.onblocked = ()=>{
      blocked=true;
      dbPromise=null;
      reject(new Error("Database upgrade blocked. Close other Audist tabs and reopen the app."));
    };
    req.onsuccess = ()=>{
      const db=req.result;
      if(blocked){ db.close(); return; }
      db.onversionchange=()=>{ db.close(); dbPromise=null; };
      resolve(db);
    };
    req.onerror = ()=>{ dbPromise=null; reject(req.error); };
  });
  return dbPromise;
}

function completeTransaction(tx,resolve,reject,result){
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error||new Error("IndexedDB transaction failed"));
  tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted"));
}

async function dbPutAudit(audit){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIT_STORE,"readwrite");
    const req=tx.objectStore(AUDIT_STORE).put(audit);
    req.onerror=()=>reject(req.error);
    completeTransaction(tx,resolve,reject,audit);
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
    const tx=db.transaction([AUDIT_STORE,PHOTO_STORE,MIGRATION_BACKUP_STORE],"readwrite");
    tx.objectStore(AUDIT_STORE).delete(id);
    const photoStore=tx.objectStore(PHOTO_STORE);
    const idx=photoStore.index("auditId");
    const range=IDBKeyRange.only(id);
    const cursorReq=idx.openCursor(range);
    cursorReq.onsuccess=e=>{
      const cursor=e.target.result;
      if(cursor){ cursor.delete(); cursor.continue(); }
    };
    const backupStore=tx.objectStore(MIGRATION_BACKUP_STORE);
    const backupReq=backupStore.index("auditId").openCursor(IDBKeyRange.only(id));
    backupReq.onsuccess=e=>{
      const cursor=e.target.result;
      if(cursor){ cursor.delete(); cursor.continue(); }
    };
    completeTransaction(tx,resolve,reject);
  });
}

async function dbCommitAuditAndPhotos(audit,{putPhotos=[],deletePhotoIds=[]}={}){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([AUDIT_STORE,PHOTO_STORE],"readwrite");
    try{
      tx.objectStore(AUDIT_STORE).put(audit);
      const photoStore=tx.objectStore(PHOTO_STORE);
      putPhotos.forEach(photo=>photoStore.put(photo));
      deletePhotoIds.forEach(photoId=>photoStore.delete(photoId));
    }catch(error){
      tx.abort();
      reject(error);
      return;
    }
    completeTransaction(tx,resolve,reject,audit);
  });
}

async function dbBackupAudit(audit,reason="schema-migration"){
  const db=await openDB();
  const backup={
    backupId:`${audit.auditId}:${Date.now()}:${crypto.randomUUID()}`,
    auditId:audit.auditId,
    createdAt:new Date().toISOString(),
    reason,
    schemaVersion:audit.schemaVersion??null,
    audit:structuredClone(audit)
  };
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(MIGRATION_BACKUP_STORE,"readwrite");
    tx.objectStore(MIGRATION_BACKUP_STORE).put(backup);
    completeTransaction(tx,resolve,reject,backup);
  });
}

async function dbGetMigrationBackupsForAudit(auditId){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(MIGRATION_BACKUP_STORE).objectStore(MIGRATION_BACKUP_STORE).index("auditId").getAll(auditId);
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))));
    req.onerror=()=>reject(req.error);
  });
}

async function dbGetLatestMigrationBackup(auditId){
  return (await dbGetMigrationBackupsForAudit(auditId))[0]||null;
}

async function dbPutPhoto(photo){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(PHOTO_STORE,"readwrite");
    tx.objectStore(PHOTO_STORE).put(photo);
    completeTransaction(tx,resolve,reject,photo);
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
    completeTransaction(tx,resolve,reject);
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

async function dbGetPhotosForAudit(auditId){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).index("auditId").getAll(auditId);
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

// Backward-compatible aliases used by older code paths if needed.
const dbPut = dbPutAudit;
const dbGet = dbGetAudit;
const dbGetAll = dbGetAllAudits;
const dbDelete = dbDeleteAudit;

