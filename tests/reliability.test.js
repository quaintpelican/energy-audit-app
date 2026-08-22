const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

function loadApp(){
  const elements=new Map();
  const makeElement=()=>({
    value:"",textContent:"",innerHTML:"",className:"",style:{},dataset:{},tagName:"DIV",
    selectedOptions:[],classList:{add(){},remove(){},toggle(){}},
    addEventListener(){},showModal(){},close(){},setCustomValidity(){},reportValidity(){},checkValidity(){return true;}
  });
  const document={
    hidden:false,
    getElementById(id){ if(!elements.has(id)) elements.set(id,makeElement()); return elements.get(id); },
    querySelectorAll(){ return []; },
    addEventListener(){},
    createElement(){ return makeElement(); }
  };
  const context=vm.createContext({
    console,document,window:{addEventListener(){}},navigator:{},crypto:webcrypto,
    structuredClone,Date,Set,Map,Math,Number,String,Boolean,Array,Object,JSON,
    Promise,Error,Blob,URL,setTimeout,clearTimeout,alert(){},confirm(){return true;},
    dbGetAllAudits:async()=>[],dbGetAudit:async()=>null,dbPutAudit:async a=>a,
    dbBackupAudit:async()=>{},dbGetPhotosForAudit:async()=>[],dbCommitAuditAndPhotos:async a=>a,
    dbDeleteAudit:async()=>{},dbGetPhoto:async()=>null
  });
  const source=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
  vm.runInContext(source,context,{filename:"app.js"});
  return context;
}

test("refuses a schema newer than the app supports",()=>{
  const context=loadApp();
  assert.throws(()=>vm.runInContext("migrateAudit({auditId:'a',schemaVersion:4})",context),/newer than this app supports/);
});

test("legacy migration resolves only unique equipment display IDs",()=>{
  const context=loadApp();
  const result=vm.runInContext(`migrateAudit({
    auditId:"a",schemaVersion:2,metadata:{},
    equipment:[{equipmentId:"RTU-01"},{equipmentId:"RTU-01"},{equipmentId:"RTU-02"}],
    ecms:[{ecmId:"ECM-01",affectedEquipmentIds:["RTU-01","RTU-02","RTU-99"]}]
  })`,context);
  assert.equal(result.changed,true);
  assert.equal(result.audit.ecms[0].affectedEquipmentRecordIds.length,1);
  assert.equal(result.warnings.length,2);
});

test("template completeness does not borrow evidence from unrelated equipment",()=>{
  const context=loadApp();
  const result=vm.runInContext(`
    currentAudit={site:{},equipment:[{
      recordId:"eq-1",equipmentId:"LTG-01",systemType:"Lighting",
      quantity:"10",existingWatts:"32",hoursAnnual:"3000",lampType:"T8",photos:[],measurements:[]
    }],ecms:[]};
    evaluateTemplate("lighting_led",[])
  `,context);
  assert.equal(result.percent,0);
  assert.ok(result.required.every(item=>item.status==="Missing"));
});

test("measurement requirements need a value and required unit",()=>{
  const context=loadApp();
  const statuses=vm.runInContext(`
    currentAudit={site:{},equipment:[{
      recordId:"eq-1",systemType:"HVAC",fanHp:"5",schedule:"M-F",controls:"Starter",
      measurements:[
        {parameter:"Fan speed",value:"",unit:"Hz"},
        {parameter:"Static pressure",value:"1.2",unit:""}
      ],photos:[]
    }],ecms:[]};
    evaluateTemplate("hvac_vfd",["eq-1"]).required
  `,context);
  assert.equal(statuses.find(x=>x.label==="Fan Load / Speed Profile").status,"Missing");
  assert.equal(statuses.find(x=>x.label==="Static Pressure").status,"Missing");
});

test("photo requirements reject metadata without a blob or legacy data URL",()=>{
  const context=loadApp();
  const result=vm.runInContext(`
    availablePhotoIds=new Set();
    evaluatePhotoCompleteness({systemType:"HVAC",photos:[{photoId:"missing",category:"Equipment Overview"}]})
  `,context);
  assert.equal(result.percent,0);
});

test("ECM IDs fill gaps without colliding",()=>{
  const context=loadApp();
  const id=vm.runInContext(`
    currentAudit={ecms:[{ecmId:"ECM-01"},{ecmId:"ECM-03"}]};
    nextEcmId()
  `,context);
  assert.equal(id,"ECM-02");
});

test("photo changes use one audit-and-photo transaction",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","db.js"),"utf8");
  assert.match(source,/dbCommitAuditAndPhotos/);
  assert.match(source,/transaction\(\[AUDIT_STORE,PHOTO_STORE\],"readwrite"\)/);
});

test("service-worker updates do not seize existing pages",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","sw.js"),"utf8");
  assert.doesNotMatch(source,/skipWaiting|clients\.claim/);
});

test("audit persistence writes the current audit snapshot",async()=>{
  const context=loadApp();
  let persisted;
  context.dbPutAudit=async audit=>{ persisted=structuredClone(audit); return audit; };
  const saved=await vm.runInContext(`
    currentAudit={auditId:"audit-1",schemaVersion:3,site:{facilityName:"Library"},equipment:[],ecms:[],metadata:{}};
    saveCurrent()
  `,context);
  assert.equal(saved,true);
  assert.equal(persisted.site.facilityName,"Library");
  assert.ok(persisted.updatedAt);
});

test("equipment field changes flush through autosave",async()=>{
  const context=loadApp();
  let persisted;
  context.dbPutAudit=async audit=>{ persisted=structuredClone(audit); return audit; };
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:3,site:{},equipment:[],ecms:[],metadata:{}};
    draftEquipment={recordId:"eq-1",equipmentId:"RTU-01",systemType:"HVAC",measurements:[],photos:[]};
    currentAudit.equipment.push(draftEquipment);
    equipmentFieldChanged({target:{dataset:{equipmentField:"manufacturer"},value:"Trane",setCustomValidity(){},reportValidity(){}}});
    await flushPendingSave();
  })()`,context);
  assert.equal(persisted.equipment[0].manufacturer,"Trane");
});

test("measurements persist before the editor closes",async()=>{
  const context=loadApp();
  let persisted;
  context.dbPutAudit=async audit=>{ persisted=structuredClone(audit); return audit; };
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:3,site:{},equipment:[],ecms:[],metadata:{}};
    draftEquipment={recordId:"eq-1",equipmentId:"RTU-01",systemType:"HVAC",measurements:[],photos:[]};
    currentAudit.equipment.push(draftEquipment);
    $("mParameter").value="Supply air temperature";
    $("mValue").value="55";
    $("mUnit").value="°F";
    $("mSource").value="Measured";
    $("mMethod").value="Probe";
    $("mNotes").value="";
    await saveMeasurement();
  })()`,context);
  assert.equal(persisted.equipment[0].measurements.length,1);
  assert.equal(persisted.equipment[0].measurements[0].numericValue,55);
});

test("stable ECM relationship survives equipment display-ID rename",()=>{
  const context=loadApp();
  const result=vm.runInContext(`
    currentAudit={site:{},equipment:[{recordId:"eq-1",equipmentId:"AHU-09",systemType:"HVAC",measurements:[],photos:[]}],
      ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"],affectedEquipmentIds:["AHU-01"]}]};
    recalculateAllCompleteness();
    ({recordIds:currentAudit.ecms[0].affectedEquipmentRecordIds,displayIds:currentAudit.ecms[0].affectedEquipmentIds})
  `,context);
  assert.deepEqual([...result.recordIds],["eq-1"]);
  assert.deepEqual([...result.displayIds],["AHU-09"]);
});

test("equipment referenced by an ECM cannot be deleted",async()=>{
  const context=loadApp();
  const alerts=[];
  context.alert=message=>alerts.push(message);
  const remaining=await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",site:{},equipment:[{recordId:"eq-1",equipmentId:"RTU-01",photos:[]}],
      ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"]}],metadata:{}};
    await deleteEquipment("eq-1");
    return currentAudit.equipment.length;
  })()`,context);
  assert.equal(remaining,1);
  assert.match(alerts[0],/linked to 1 ECM/);
});

test("completeness recalculates after current equipment data changes",()=>{
  const context=loadApp();
  const percents=vm.runInContext(`
    currentAudit={site:{},equipment:[{recordId:"eq-1",equipmentId:"LTG-01",systemType:"Lighting",
      quantity:"10",existingWatts:"32",hoursAnnual:"",lampType:"T8",measurements:[],photos:[]}],
      ecms:[{ecmId:"ECM-01",templateKey:"lighting_led",affectedEquipmentRecordIds:["eq-1"]}]};
    recalculateAllCompleteness();
    const before=currentAudit.ecms[0].completenessPercent;
    currentAudit.equipment[0].hoursAnnual="3000";
    recalculateAllCompleteness();
    [before,currentAudit.ecms[0].completenessPercent]
  `,context);
  assert.deepEqual([...percents],[75,100]);
});

