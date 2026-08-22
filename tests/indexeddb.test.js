const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");
const {IDBFactory,IDBKeyRange} = require("fake-indexeddb");

const dbSource=fs.readFileSync(path.join(__dirname,"..","db.js"),"utf8");
const bridgeSource=fs.readFileSync(path.join(__dirname,"..","release","rollback-bridge","db.js"),"utf8");

function requestResult(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function transactionDone(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error("Transaction aborted"));
  });
}

async function seedDatabase(indexedDB,version,{withPhoto=false}={}){
  const request=indexedDB.open("FieldEnergyAuditDB",version);
  request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains("audits")){
      const audits=db.createObjectStore("audits",{keyPath:"auditId"});
      audits.createIndex("updatedAt","updatedAt");
    }
    if(version>=2&&!db.objectStoreNames.contains("photos")){
      const photos=db.createObjectStore("photos",{keyPath:"photoId"});
      photos.createIndex("auditId","auditId");
      photos.createIndex("equipmentRecordId","equipmentRecordId");
    }
  };
  const db=await requestResult(request);
  const stores=withPhoto?["audits","photos"]:["audits"];
  const tx=db.transaction(stores,"readwrite");
  tx.objectStore("audits").put({auditId:"audit-1",schemaVersion:"2.0",updatedAt:"2026-01-01",site:{facilityName:"Library"},equipment:[],ecms:[]});
  if(withPhoto) tx.objectStore("photos").put({photoId:"photo-1",auditId:"audit-1",equipmentRecordId:"eq-1",blob:new Blob(["photo-bytes"],{type:"image/jpeg"})});
  await transactionDone(tx);
  db.close();
}

function loadDb(indexedDB){
  const context=vm.createContext({indexedDB,IDBKeyRange,crypto:webcrypto,structuredClone,Date,Promise,Error,Blob,console});
  vm.runInContext(dbSource,context,{filename:"db.js"});
  return context;
}

function loadBridge(indexedDB){
  const context=vm.createContext({indexedDB,IDBKeyRange,Blob,console});
  vm.runInContext(bridgeSource,context,{filename:"rollback-bridge/db.js"});
  return context;
}

for(const version of [1,2]){
  test(`upgrades DB v${version} to v3 without losing audits${version===2?" or photos":""}`,async()=>{
    const indexedDB=new IDBFactory();
    await seedDatabase(indexedDB,version,{withPhoto:version===2});
    const db=loadDb(indexedDB);
    const audit=await vm.runInContext("dbGetAudit('audit-1')",db);
    assert.equal(audit.site.facilityName,"Library");
    const stores=await vm.runInContext("openDB().then(db=>[...db.objectStoreNames])",db);
    assert.deepEqual([...stores],["audits","migrationBackups","photos"]);
    if(version===2){
      const photo=await vm.runInContext("dbGetPhoto('photo-1')",db);
      assert.equal(await photo.blob.text(),"photo-bytes");
    }
  });
}

test("creates and retrieves a complete pre-migration audit backup",async()=>{
  const indexedDB=new IDBFactory();
  await seedDatabase(indexedDB,2,{withPhoto:true});
  const db=loadDb(indexedDB);
  const backup=await vm.runInContext(`(async()=>{
    const audit=await dbGetAudit("audit-1");
    await dbBackupAudit(audit,"test-migration");
    return dbGetLatestMigrationBackup("audit-1");
  })()`,db);
  assert.equal(backup.reason,"test-migration");
  assert.equal(backup.audit.site.facilityName,"Library");
  assert.equal(backup.audit.schemaVersion,"2.0");
});

test("writes, reads, and deletes an actual photo Blob",async()=>{
  const indexedDB=new IDBFactory();
  await seedDatabase(indexedDB,2);
  const db=loadDb(indexedDB);
  await vm.runInContext(`dbPutPhoto({photoId:"photo-2",auditId:"audit-1",equipmentRecordId:"eq-1",blob:new Blob(["new-photo"],{type:"image/jpeg"})})`,db);
  const stored=await vm.runInContext("dbGetPhoto('photo-2')",db);
  assert.equal(await stored.blob.text(),"new-photo");
  await vm.runInContext("dbDeletePhoto('photo-2')",db);
  assert.equal(await vm.runInContext("dbGetPhoto('photo-2')",db),undefined);
});

test("aborts both audit and photo changes when an atomic write is invalid",async()=>{
  const indexedDB=new IDBFactory();
  await seedDatabase(indexedDB,2,{withPhoto:true});
  const db=loadDb(indexedDB);
  await assert.rejects(vm.runInContext(`dbCommitAuditAndPhotos(
    {auditId:"audit-1",schemaVersion:3,updatedAt:"changed",site:{facilityName:"Changed"},equipment:[],ecms:[]},
    {putPhotos:[{auditId:"audit-1",blob:new Blob(["invalid"])}]}
  )`,db));
  const audit=await vm.runInContext("dbGetAudit('audit-1')",db);
  assert.equal(audit.site.facilityName,"Library");
  const photo=await vm.runInContext("dbGetPhoto('photo-1')",db);
  assert.equal(await photo.blob.text(),"photo-bytes");
});

test("permanent audit deletion removes audit, photos, and migration backups",async()=>{
  const indexedDB=new IDBFactory();
  await seedDatabase(indexedDB,2,{withPhoto:true});
  const db=loadDb(indexedDB);
  await vm.runInContext(`(async()=>{
    await dbBackupAudit(await dbGetAudit("audit-1"));
    await dbDeleteAudit("audit-1");
  })()`,db);
  assert.equal(await vm.runInContext("dbGetAudit('audit-1')",db),undefined);
  assert.equal(await vm.runInContext("dbGetPhoto('photo-1')",db),undefined);
  assert.equal((await vm.runInContext("dbGetMigrationBackupsForAudit('audit-1')",db)).length,0);
});

test("blocked upgrade rejects with actionable guidance",async()=>{
  const indexedDB=new IDBFactory();
  const request=indexedDB.open("FieldEnergyAuditDB",2);
  request.onupgradeneeded=()=>{
    const db=request.result;
    const audits=db.createObjectStore("audits",{keyPath:"auditId"});
    audits.createIndex("updatedAt","updatedAt");
    const photos=db.createObjectStore("photos",{keyPath:"photoId"});
    photos.createIndex("auditId","auditId");
    photos.createIndex("equipmentRecordId","equipmentRecordId");
  };
  const oldConnection=await requestResult(request);
  oldConnection.onversionchange=()=>{};
  const db=loadDb(indexedDB);
  await assert.rejects(vm.runInContext("openDB()",db),/upgrade blocked/i);
  oldConnection.close();
});

test("rollback bridge upgrades production DB2 and remains baseline-API compatible",async()=>{
  const indexedDB=new IDBFactory();
  await seedDatabase(indexedDB,2,{withPhoto:true});
  const bridge=loadBridge(indexedDB);
  const audit=await vm.runInContext("dbGetAudit('audit-1')",bridge);
  const photo=await vm.runInContext("dbGetPhoto('photo-1')",bridge);
  assert.equal(audit.site.facilityName,"Library");
  assert.equal(await photo.blob.text(),"photo-bytes");
  await vm.runInContext(`dbPutAudit({...${JSON.stringify({auditId:"audit-2",updatedAt:"2026-01-02",site:{facilityName:"Bridge"},equipment:[],ecms:[]})}})`,bridge);
  assert.equal((await vm.runInContext("dbGetAllAudits()",bridge)).length,2);
  const stores=await vm.runInContext("openDB().then(db=>[...db.objectStoreNames])",bridge);
  assert.deepEqual([...stores],["audits","migrationBackups","photos"]);
});

test("rollback bridge permanent deletion also removes V3.1 migration backups",async()=>{
  const indexedDB=new IDBFactory();
  await seedDatabase(indexedDB,2,{withPhoto:true});
  const bridge=loadBridge(indexedDB);
  await vm.runInContext(`(async()=>{
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("migrationBackups","readwrite");
      tx.objectStore("migrationBackups").put({backupId:"backup-1",auditId:"audit-1",createdAt:"2026-01-01",audit:{auditId:"audit-1"}});
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    await dbDeleteAudit("audit-1");
  })()`,bridge);
  const counts=await vm.runInContext(`(async()=>{
    const db=await openDB();
    return Promise.all(["audits","photos","migrationBackups"].map(store=>new Promise((resolve,reject)=>{
      const req=db.transaction(store).objectStore(store).count();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    })));
  })()`,bridge);
  assert.deepEqual([...counts],[0,0,0]);
});

