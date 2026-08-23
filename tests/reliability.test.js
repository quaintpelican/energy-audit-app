const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");
const appSource=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
const calculationSource=fs.readFileSync(path.join(__dirname,"..","calculations.js"),"utf8");
const utilitySource=fs.readFileSync(path.join(__dirname,"..","utility-analysis.js"),"utf8");
const endUseSource=fs.readFileSync(path.join(__dirname,"..","end-use-analysis.js"),"utf8");
const portfolioSource=fs.readFileSync(path.join(__dirname,"..","portfolio-analysis.js"),"utf8");
const htmlSource=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");

function loadApp(){
  const elements=new Map();
  const createdBlobs=[];
  const makeElement=()=>({
    value:"",textContent:"",innerHTML:"",className:"",style:{},dataset:{},tagName:"DIV",
    selectedOptions:[],classList:{add(){},remove(){},toggle(){}},
    addEventListener(){},showModal(){},close(){},click(){},setCustomValidity(){},reportValidity(){},checkValidity(){return true;}
  });
  const document={
    hidden:false,
    getElementById(id){ if(!elements.has(id)) elements.set(id,makeElement()); return elements.get(id); },
    querySelector(){ return makeElement(); },
    querySelectorAll(){ return []; },
    addEventListener(){},
    createElement(){ return makeElement(); }
  };
  const context=vm.createContext({
    console,document,window:{addEventListener(){}},navigator:{},crypto:webcrypto,
    structuredClone,Date,Set,Map,Math,Number,String,Boolean,Array,Object,JSON,
    Promise,Error,Blob,URL:{createObjectURL(blob){createdBlobs.push(blob);return `blob:test-${createdBlobs.length}`;},revokeObjectURL(){}},setTimeout,clearTimeout,alert(){},confirm(){return true;},
    dbGetAllAudits:async()=>[],dbGetAudit:async()=>null,dbPutAudit:async a=>a,
    dbBackupAudit:async()=>{},dbGetPhotosForAudit:async()=>[],dbCommitAuditAndPhotos:async a=>a,
    dbDeleteAudit:async()=>{},dbGetPhoto:async()=>null,dbGetLatestMigrationBackup:async()=>null
  });
  context.__elements=elements;
  context.__createdBlobs=createdBlobs;
  const source=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
  vm.runInContext(calculationSource,context,{filename:"calculations.js"});
  vm.runInContext(utilitySource,context,{filename:"utility-analysis.js"});
  vm.runInContext(endUseSource,context,{filename:"end-use-analysis.js"});
  vm.runInContext(portfolioSource,context,{filename:"portfolio-analysis.js"});
  vm.runInContext(source,context,{filename:"app.js"});
  return context;
}

test("refuses a schema newer than the app supports",()=>{
  const context=loadApp();
  assert.throws(()=>vm.runInContext("migrateAudit({auditId:'a',schemaVersion:5})",context),/newer than this app supports/);
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
  assert.equal(result.audit.ecms[0].unresolvedEquipmentReferences.length,2);
  assert.equal(result.warnings.length,2);
});

test("normalizes already-schema3 ambiguous relationships from the production migrator",()=>{
  const context=loadApp();
  const result=vm.runInContext(`migrateAudit({
    auditId:"a",schemaVersion:3,site:{},metadata:{},calculations:[],
    equipment:[
      {recordId:"eq-1",equipmentId:"RTU-01",measurements:[],photos:[],status:"complete"},
      {recordId:"eq-2",equipmentId:"RTU-01",measurements:[],photos:[],status:"complete"}
    ],
    ecms:[{ecmId:"ECM-01",affectedEquipmentIds:["RTU-01"],affectedEquipmentRecordIds:["eq-1"]}]
  })`,context);
  assert.equal(result.changed,true);
  assert.deepEqual([...result.audit.ecms[0].affectedEquipmentRecordIds],["eq-1"]);
  assert.deepEqual([...result.audit.ecms[0].unresolvedEquipmentReferences[0].candidateRecordIds],["eq-1","eq-2"]);
  assert.match(result.audit.metadata.migrationWarnings[0],/unresolved equipment ID RTU-01/);
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

test("unresolved legacy relationships survive save, reload, recalculate, export, and deletion attempt",async()=>{
  const context=loadApp();
  let persisted;
  context.dbPutAudit=async audit=>{ persisted=structuredClone(audit); return audit; };
  const alerts=[];
  context.alert=message=>alerts.push(message);
  await vm.runInContext(`(async()=>{
    const migration=migrateAudit({auditId:"audit-1",schemaVersion:"2.0",site:{},metadata:{},calculations:[],
      equipment:[
        {equipmentId:"RTU-01",measurements:[],photos:[]},
        {equipmentId:"RTU-01",measurements:[],photos:[]}
      ],
      ecms:[{ecmId:"ECM-01",affectedEquipmentIds:["RTU-01"]}]
    });
    currentAudit=migration.audit;
    recalculateAllCompleteness();
    await saveCurrent();
  })()`,context);
  // Reload the actual captured persisted snapshot into the app context.
  context.globalPersisted=persisted;
  await vm.runInContext(`(async()=>{
    currentAudit=structuredClone(globalPersisted);
    availablePhotoIds=new Set();
    currentAudit.equipment[0].equipmentId="RENAMED-01";
    recalculateAllCompleteness();
    await exportAudit();
    await deleteEquipment(currentAudit.equipment[0].recordId);
  })()`,context);
  const exported=JSON.parse(await context.__createdBlobs.at(-1).text());
  assert.equal(exported.ecms[0].unresolvedEquipmentReferences[0].displayId,"RTU-01");
  assert.deepEqual(exported.ecms[0].affectedEquipmentIds,["RTU-01"]);
  assert.equal(persisted.metadata.migrationWarnings.length,1);
  assert.equal(vm.runInContext("currentAudit.equipment.length",context),2);
  assert.match(alerts.at(-1),/linked to 1 ECM/);
});

test("ECM editing preserves economic, engineering, and unknown fields",async()=>{
  const context=loadApp();
  context.dbPutAudit=async audit=>audit;
  const result=await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",site:{},equipment:[{recordId:"eq-1",equipmentId:"AHU-01"}],metadata:{},calculations:[],
      ecms:[{ecmId:"ECM-01",title:"Old",category:"HVAC",affectedEquipmentRecordIds:["eq-1"],affectedEquipmentIds:["AHU-01"],
        existingCondition:"Old condition",proposedImprovement:"Old proposal",missingData:"",confidence:"Medium",templateKey:null,
        savings:{electricKwh:1200,cost:400,method:"metered"},implementationCost:2000,simplePaybackYears:5,
        methodology:"CALC-X",assumptions:["A"],calculationIds:["CALC-01"],risks:["R"],futureField:{preserve:true}}]};
    editingEcmId="ECM-01";
    $("ecmTitle").value="Updated";
    $("ecmCategory").value="HVAC";
    $("ecmExisting").value="Updated condition";
    $("ecmProposed").value="Updated proposal";
    $("ecmMissing").value="None";
    $("ecmConfidence").value="High";
    $("ecm-template").value="";
    $("ecmEquipment").tagName="SELECT";
    $("ecmEquipment").selectedOptions=[{value:"eq-1"}];
    await saveEcm();
    return currentAudit.ecms[0];
  })()`,context);
  assert.equal(result.title,"Updated");
  assert.equal(result.savings.electricKwh,1200);
  assert.equal(result.implementationCost,2000);
  assert.equal(result.simplePaybackYears,5);
  assert.equal(result.methodology,"CALC-X");
  assert.deepEqual([...result.assumptions],["A"]);
  assert.deepEqual([...result.calculationIds],["CALC-01"]);
  assert.deepEqual([...result.risks],["R"]);
  assert.equal(result.futureField.preserve,true);
});

test("failed equipment creation rolls back and cannot leak into a later save",async()=>{
  const context=loadApp();
  const persisted=[];
  let fail=true;
  context.dbPutAudit=async audit=>{
    if(fail){ fail=false; throw new Error("quota"); }
    persisted.push(structuredClone(audit));
    return audit;
  };
  const alerts=[];
  context.alert=message=>alerts.push(message);
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:3,site:{},utility:{months:[]},equipment:[],ecms:[],calculations:[],metadata:{}};
    await openNewEquipment();
    currentAudit.site.facilityName="Later save";
    await saveCurrent();
  })()`,context);
  assert.equal(vm.runInContext("currentAudit.equipment.length",context),0);
  assert.equal(persisted.at(-1).equipment.length,0);
  assert.match(alerts.at(-1),/No equipment record was retained/);
});

test("overlapping saves serialize and persist the newest snapshot last",async()=>{
  const context=loadApp();
  const completed=[];
  context.dbPutAudit=async audit=>{
    await new Promise(resolve=>setTimeout(resolve,audit.site.facilityName==="First"?20:0));
    completed.push(audit.site.facilityName);
    return audit;
  };
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:3,site:{facilityName:"First"},equipment:[],ecms:[],metadata:{}};
    const first=saveCurrent();
    currentAudit.site.facilityName="Second";
    const second=saveCurrent();
    await Promise.all([first,second]);
  })()`,context);
  assert.deepEqual(completed,["First","Second"]);
});

test("manual end-use estimate persists immediately with provenance and stable relationships",async()=>{
  const context=loadApp(),persisted=[];
  context.dbPutAudit=async audit=>{persisted.push(structuredClone(audit));return audit;};
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:4,site:{},utility:{months:[]},utilityAccounts:[],systems:[{systemRecordId:"sys-1",systemId:"LTG-1",systemType:"Lighting",status:"Present"}],equipment:[{recordId:"eq-1",equipmentId:"LTG-01",systemRecordId:"sys-1",systemType:"Lighting",measurements:[],photos:[]}],ecms:[],calculations:[],endUseModels:[],metadata:{}};
    $("endUseId").value=""; $("endUseUtility").value="Electricity"; endUseCategories();
    $("endUseCategory").value="Lighting"; $("endUseEnergy").value="90000";
    $("endUseProvenance").value="Estimated"; $("endUseEvidence").value="C";
    $("endUseMaturity").value="ENGINEERING_ESTIMATE"; $("endUseBasis").value="Fixture inventory × schedule";
    $("endUseAssumption").value="3,000 operating hours";
    $("endUseSystems").selectedOptions=[{value:"sys-1"}]; $("endUseEquipment").selectedOptions=[{value:"eq-1"}]; $("endUseCalculations").selectedOptions=[];
    await saveEndUse();
  })()`,context);
  assert.equal(persisted.length,1);
  const model=persisted[0].endUseModels[0];
  assert.ok(model.endUseModelId);
  assert.equal(model.annualEnergy,90000);
  assert.equal(model.provenance,"Estimated");
  assert.deepEqual(model.systemRecordIds,["sys-1"]);
  assert.deepEqual(model.equipmentRecordIds,["eq-1"]);
  assert.deepEqual(model.assumptions,["3,000 operating hours"]);
});

test("failed manual end-use creation rolls back and cannot leak into a later save",async()=>{
  const context=loadApp(),persisted=[];let fail=true;
  context.dbPutAudit=async audit=>{if(fail){fail=false;throw new Error("quota");}persisted.push(structuredClone(audit));return audit;};
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:4,site:{},utility:{months:[]},utilityAccounts:[],systems:[],equipment:[],ecms:[],calculations:[],endUseModels:[],metadata:{}};
    $("endUseId").value=""; $("endUseUtility").value="Electricity"; endUseCategories();
    $("endUseCategory").value="Other"; $("endUseEnergy").value="100"; $("endUseProvenance").value="Assumed";
    $("endUseEvidence").value="D"; $("endUseMaturity").value="SCREENING"; $("endUseBasis").value="Site estimate"; $("endUseAssumption").value="Unverified";
    $("endUseSystems").selectedOptions=[]; $("endUseEquipment").selectedOptions=[]; $("endUseCalculations").selectedOptions=[];
    await saveEndUse();
    currentAudit.site.facilityName="Later"; await saveCurrent();
  })()`,context);
  assert.equal(vm.runInContext("currentAudit.endUseModels.length",context),0);
  assert.equal(persisted.at(-1).endUseModels.length,0);
});

test("end-use UUID relationships protect equipment and calculations from deletion",async()=>{
  const context=loadApp(),alerts=[];context.alert=m=>alerts.push(m);
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:4,site:{},utility:{months:[]},utilityAccounts:[],systems:[],equipment:[{recordId:"eq-1",equipmentId:"EQ-1",measurements:[],photos:[]}],ecms:[],calculations:[{calculationId:"calc-1",status:"Calculated",outputs:[]}],endUseModels:[{endUseModelId:"eu-1",origin:"MANUAL",utilityType:"Electricity",category:"Other",annualEnergy:1,energyUnit:"kWh/yr",basis:"Test",assumptions:["Test"],systemRecordIds:[],equipmentRecordIds:["eq-1"],calculationIds:["calc-1"]}],metadata:{}};
    await deleteEquipment("eq-1"); await deleteCalculation("calc-1");
  })()`,context);
  assert.equal(vm.runInContext("currentAudit.equipment.length",context),1);
  assert.equal(vm.runInContext("currentAudit.calculations.length",context),1);
  assert.match(alerts.join(" "),/end-use model/i);
});

test("editing an Other Fuel model retains its native unit",()=>{
  const context=loadApp();
  vm.runInContext(`currentAudit={auditId:"a",schemaVersion:4,site:{},systems:[],equipment:[],ecms:[],calculations:[],endUseModels:[{endUseModelId:"eu",utilityType:"Other Fuel",category:"Process",annualEnergy:10,energyUnit:"gallons/yr",basis:"Inventory",assumptions:["Test"],systemRecordIds:[],equipmentRecordIds:[],calculationIds:[]}],metadata:{}};openEndUse("eu");`,context);
  assert.equal(context.__elements.get("endUseUnit").value,"gallons/yr");
  assert.equal(context.__elements.get("endUseUnit").readOnly,false);
});

test("portfolio membership protects ECM deletion and preserves standalone analysis",async()=>{
  const context=loadApp(),alerts=[];context.alert=m=>alerts.push(m);
  await vm.runInContext(`(async()=>{currentAudit={auditId:"a",schemaVersion:4,site:{},systems:[],equipment:[],ecms:[{ecmId:"ECM-1",title:"Measure",calculationIds:[]}],calculations:[],endUseModels:[],ecmPortfolios:[{portfolioId:"P",name:"Recommended",ecmIds:["ECM-1"],sequence:["ECM-1"],interactionRecords:[]}],metadata:{}};await deleteEcm("ECM-1");})()`,context);
  assert.equal(vm.runInContext("currentAudit.ecms.length",context),1);
  assert.match(alerts.join(" "),/portfolio/i);
});

test("failed destructive persistence restores deleted equipment",async()=>{
  const context=loadApp();
  context.dbCommitAuditAndPhotos=async()=>{ throw new Error("transaction failed"); };
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:3,site:{},equipment:[{recordId:"eq-1",equipmentId:"RTU-01",photos:[]}],ecms:[],metadata:{}};
    await deleteEquipment("eq-1");
  })()`,context);
  assert.equal(vm.runInContext("currentAudit.equipment.length",context),1);
});

test("V3.1 to V3.2 migration creates systems without losing field evidence or ECM links",()=>{
  const context=loadApp();
  const result=vm.runInContext(`migrateAudit({
    auditId:"audit-1",schemaVersion:3,site:{},utility:{months:[]},metadata:{},calculations:[],
    equipment:[{recordId:"eq-1",equipmentId:"AHU-01",systemType:"HVAC",measurements:[{measurementId:"m-1",parameter:"SAT",value:"55",unit:"°F"}],photos:[{photoId:"p-1",category:"Nameplate"}]}],
    ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"],affectedEquipmentIds:["AHU-01"],unresolvedEquipmentReferences:[]}]
  })`,context);
  assert.equal(result.audit.schemaVersion,4);
  assert.equal(result.audit.systems.length,1);
  assert.equal(result.audit.systems[0].systemType,"PackagedHVAC");
  assert.equal(result.audit.equipment[0].systemRecordId,result.audit.systems[0].systemRecordId);
  assert.equal(result.audit.equipment[0].measurements[0].measurementId,"m-1");
  assert.equal(result.audit.equipment[0].photos[0].photoId,"p-1");
  assert.deepEqual([...result.audit.ecms[0].affectedEquipmentRecordIds],["eq-1"]);
});

test("system inventory selection persists a structured system record",async()=>{
  const context=loadApp();
  let persisted;
  context.dbPutAudit=async audit=>{persisted=structuredClone(audit);return audit;};
  await vm.runInContext(`(async()=>{
    currentAudit={auditId:"audit-1",schemaVersion:4,site:{},utility:{months:[]},systems:[],equipment:[],ecms:[],calculations:[],metadata:{}};
    await systemScopeChanged({target:{dataset:{systemScope:"CompressedAir"},checked:true}});
  })()`,context);
  assert.equal(persisted.systems[0].systemType,"CompressedAir");
  assert.match(persisted.systems[0].systemId,/^CA-/);
  assert.deepEqual(persisted.systems[0].equipmentRecordIds,[]);
});

test("system and equipment relationship validation rejects orphaned equipment",()=>{
  const context=loadApp();
  assert.throws(()=>vm.runInContext(`validateAuditStructure({auditId:"a",site:{},systems:[],equipment:[{recordId:"eq-1",equipmentId:"PUMP-01",systemRecordId:"missing"}],ecms:[],calculations:[]})`,context),/missing system/);
});

test("equipment group validation rejects orphaned membership and ECM group links",()=>{
  const context=loadApp();
  assert.throws(()=>vm.runInContext(`validateAuditStructure({auditId:"a",site:{},systems:[],equipment:[],equipmentGroups:[{groupId:"g1",name:"Bad",equipmentRecordIds:["missing"]}],ecms:[],calculations:[]})`,context),/group Bad references missing equipment/);
  assert.throws(()=>vm.runInContext(`validateAuditStructure({auditId:"a",site:{},systems:[],equipment:[],equipmentGroups:[],ecms:[{ecmId:"e1",affectedEquipmentRecordIds:[],unresolvedEquipmentReferences:[],equipmentGroupId:"missing"}],calculations:[]})`,context),/references a missing equipment group/);
});

test("equipment duplication assigns a unique ID and excludes measurements and photos",async()=>{
  const context=loadApp();
  context.dbPutAudit=async audit=>audit;
  const result=await vm.runInContext(`(async()=>{
    const system={systemRecordId:"sys-1",systemId:"PUMP-01",systemType:"Pumps",equipmentRecordIds:["eq-1"]};
    draftEquipment={recordId:"eq-1",systemRecordId:"sys-1",systemType:"Pumps",equipmentId:"PUMP-01",equipmentSubtype:"CHW pump",manufacturer:"Acme",measurements:[{measurementId:"m-1"}],photos:[{photoId:"p-1"}],fieldProvenance:{manufacturer:"Nameplate"},potentialEcmFlags:[]};
    currentAudit={auditId:"audit-1",schemaVersion:4,site:{},utility:{months:[]},systems:[system],equipment:[draftEquipment],ecms:[],calculations:[],metadata:{}};
    await duplicateEquipment();
    return currentAudit.equipment[1];
  })()`,context);
  assert.equal(result.equipmentId,"PUMP-02");
  assert.equal(result.manufacturer,"Acme");
  assert.equal(result.measurements.length,0);
  assert.equal(result.photos.length,0);
});

test("measurement presets populate parameter and unit but never a value",()=>{
  const context=loadApp();
  const result=vm.runInContext(`
    draftEquipment={systemType:"Pumps"};
    openMeasurement();
    $("measurement-preset").value="0";
    measurementPresetChanged();
    ({parameter:$("mParameter").value,unit:$("mUnit").value,value:$("mValue").value})
  `,context);
  assert.equal(result.parameter,"Suction pressure");
  assert.equal(result.unit,"psi");
  assert.equal(result.value,"");
});

test("photo completeness uses equipment-family rules without requiring recommendations",()=>{
  const context=loadApp();
  const result=vm.runInContext(`
    availablePhotoIds=new Set(["overview","nameplate"]);
    evaluatePhotoCompleteness({systemType:"ChilledWater",photos:[
      {photoId:"overview",category:"Equipment Overview"},{photoId:"nameplate",category:"Nameplate"}
    ]})
  `,context);
  assert.equal(result.percent,100);
  assert.equal(result.recommended[0].status,"Recommended");
});

test("V3.2 schema-4 audits open without migration or data modification",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    const audit={auditId:"audit-v32",schemaVersion:4,site:{facilityName:"Library"},utility:{months:[]},
      systems:[{systemRecordId:"sys-1",systemId:"CHWS-01",systemType:"ChilledWater",status:"Present",equipmentRecordIds:["eq-1"],createdAt:"2026-01-01",updatedAt:"2026-01-01"}],
      equipment:[{recordId:"eq-1",systemRecordId:"sys-1",systemType:"ChilledWater",equipmentId:"CH-01",nominalTons:"250",status:"complete",fieldProvenance:{nominalTons:"Nameplate"},measurements:[{measurementId:"m-1",value:"42"}],photos:[{photoId:"p-1"}]}],
      ecms:[{ecmId:"ECM-01",affectedEquipmentIds:["CH-01"],affectedEquipmentRecordIds:["eq-1"],unresolvedEquipmentReferences:[]}],calculations:[],metadata:{marker:"preserve"}};
    const before=JSON.stringify(audit);
    const migrated=migrateAudit(audit);
    return {changed:migrated.changed,before,after:JSON.stringify(migrated.audit)};
  })()`,context);
  assert.equal(result.changed,false);
  assert.equal(result.after,result.before);
});

test("progressive-disclosure field tiers do not change equipment data",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    const equipment={equipmentId:"CH-01",nominalTons:"250",controls:"Lead/lag",iplv:"0.55"};
    const before=JSON.stringify(equipment);
    const tiers=[equipmentFieldTier("equipmentId"),equipmentFieldTier("controls"),equipmentFieldTier("iplv")];
    return {before,after:JSON.stringify(equipment),tiers};
  })()`,context);
  assert.equal(result.after,result.before);
  assert.deepEqual([...result.tiers],["core","controls","advanced"]);
});

test("system navigation filtering leaves equipment and ECM relationships intact",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    currentAudit={systems:[{systemType:"Pumps"},{systemType:"Lighting"}],equipment:[
      {recordId:"eq-1",systemType:"Pumps"},{recordId:"eq-2",systemType:"Lighting"}],
      ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"]}]};
    const before=JSON.stringify(currentAudit);
    activeType="Pumps";
    const visible=currentAudit.equipment.filter(eq=>eq.systemType===activeType).map(eq=>eq.recordId);
    return {before,after:JSON.stringify(currentAudit),visible,links:currentAudit.ecms[0].affectedEquipmentRecordIds};
  })()`,context);
  assert.equal(result.after,result.before);
  assert.deepEqual([...result.visible],["eq-1"]);
  assert.deepEqual([...result.links],["eq-1"]);
});

test("concise workflow status uses existing completeness without changing it",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    currentAudit={equipment:[{recordId:"eq-1",systemType:"Pumps",photos:[]}],ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"],completenessItems:[{label:"Flow",status:"Missing"}],completenessPercent:50}]};
    availablePhotoIds=new Set();
    const before=JSON.stringify(currentAudit.ecms[0]);
    const status=equipmentWorkflowStatus(currentAudit.equipment[0]);
    return {before,after:JSON.stringify(currentAudit.ecms[0]),status};
  })()`,context);
  assert.equal(result.after,result.before);
  assert.equal(result.status.label,"Missing Critical Data");
});

test("V4.1 exposes the full approved calculation registry and validation-only families",()=>{
  assert.match(htmlSource,/Engineering Calculation/);
  assert.match(appSource,/function runAndSaveCalculation/);
  assert.match(calculationSource,/CALC-PUMP-001/);
  assert.match(calculationSource,/CALC-BLR-001/);
  assert.match(calculationSource,/METHOD_REQUIRES_VALIDATION/);
});

test("equipment display-ID rename preserves calculation link and does not make its value source stale",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    const source={parameterId:"quantity",value:10,unit:"count",provenance:"Measured",evidenceLevel:"A",sourceKind:"equipment",sourceRecordId:"eq-1",equipmentRecordId:"eq-1",sourceField:"quantity"};
    source.sourceFingerprint=AudistCalculations.sourceFingerprint(source);
    currentAudit={auditId:"a",systems:[],utility:{},equipment:[{recordId:"eq-1",equipmentId:"LTG-01",quantity:10,fieldProvenance:{quantity:"Measured"},measurements:[],photos:[]}],ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"]}],calculations:[{calculationId:"CALC-001",ecmId:"ECM-01",methodId:"CALC-LTG-001",status:"Calculated",inputs:[source],outputs:[],equipmentRecordIds:["eq-1"]}]};
    currentAudit.equipment[0].equipmentId="LIGHTING-A";
    const changed=refreshCalculationStaleness();
    return {changed,status:currentAudit.calculations[0].status,link:currentAudit.calculations[0].equipmentRecordIds[0]};
  })()`,context);
  assert.equal(result.changed,false);
  assert.equal(result.status,"Calculated");
  assert.equal(result.link,"eq-1");
});

test("changing a linked source value marks a calculation as needing recalculation",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    const source={parameterId:"quantity",value:10,unit:"count",provenance:"Measured",evidenceLevel:"A",sourceKind:"equipment",sourceRecordId:"eq-1",equipmentRecordId:"eq-1",sourceField:"quantity"};
    source.sourceFingerprint=AudistCalculations.sourceFingerprint(source);
    currentAudit={auditId:"a",systems:[],utility:{},equipment:[{recordId:"eq-1",equipmentId:"LTG-01",quantity:12,fieldProvenance:{quantity:"Measured"},measurements:[],photos:[]}],ecms:[{ecmId:"ECM-01",affectedEquipmentRecordIds:["eq-1"]}],calculations:[{calculationId:"CALC-001",ecmId:"ECM-01",methodId:"CALC-LTG-001",status:"Calculated",inputs:[source],outputs:[],equipmentRecordIds:["eq-1"]}]};
    refreshCalculationStaleness();
    return currentAudit.calculations[0];
  })()`,context);
  assert.equal(result.status,"Needs Recalculation");
  assert.ok(result.staleAt);
});

test("staleness propagates through a reversed dependency chain",()=>{
  const context=loadApp();
  const result=vm.runInContext(`(()=>{
    const upstreamInput={parameterId:"baselineKw",value:10,unit:"kW",provenance:"Measured",evidenceLevel:"A",sourceKind:"equipment",sourceRecordId:"eq-1",equipmentRecordId:"eq-1",sourceField:"quantity"};
    upstreamInput.sourceFingerprint=AudistCalculations.sourceFingerprint(upstreamInput);
    const downstreamInput={parameterId:"annualKwhSavings",value:1000,unit:"kWh/yr",provenance:"Calculated",evidenceLevel:"A",sourceKind:"calculation",sourceRecordId:"C1",sourceField:"annualKwhSavings",sourceVersion:"1.1:old"};
    downstreamInput.sourceFingerprint=AudistCalculations.sourceFingerprint(downstreamInput);
    currentAudit={equipment:[{recordId:"eq-1",quantity:11,fieldProvenance:{quantity:"Measured"},measurements:[]}],utility:{},ecms:[],calculations:[
      {calculationId:"C2",status:"Calculated",inputs:[downstreamInput],outputs:[]},
      {calculationId:"C1",methodVersion:"1.1",updatedAt:"old",status:"Calculated",inputs:[upstreamInput],outputs:[{parameterId:"annualKwhSavings",value:1000,unit:"kWh/yr"}]}
    ]};
    refreshCalculationStaleness();return currentAudit.calculations.map(x=>x.status);
  })()`,context);
  assert.deepEqual([...result],["Needs Recalculation","Needs Recalculation"]);
});

test("recalculation revision preserves a stale prior result",()=>{
  const context=loadApp();
  const revision=vm.runInContext(`createCalculationRevision({methodId:"CALC-GEN-001",methodVersion:"1.0",status:"Needs Recalculation",inputs:[{value:1}],outputs:[{value:100}],evidenceLevel:"A",maturity:"ENGINEERING_ESTIMATE",calculatedAt:"2026-01-01",staleAt:"2026-01-02"})`,context);
  assert.equal(revision.status,"Needs Recalculation");
  assert.equal(revision.outputs[0].value,100);
  assert.equal(revision.staleAt,"2026-01-02");
});

test("ECM editing preserves calculation IDs and export-compatible complete calculation data",async()=>{
  const context=loadApp();
  context.__elements.get("ecmTitle")?.value;
  const result=await vm.runInContext(`(async()=>{
    currentAudit={auditId:"a",site:{},systems:[],equipment:[],utility:{},ecms:[{ecmId:"ECM-01",title:"Old",category:"HVAC",affectedEquipmentRecordIds:[],calculationIds:["CALC-001"],unresolvedEquipmentReferences:[]}],calculations:[{calculationId:"CALC-001",ecmId:"ECM-01",methodId:"CALC-GEN-001",methodVersion:"1.0",status:"Calculated",maturity:"HIGH_CONFIDENCE_ESTIMATE",evidenceLevel:"A",inputs:[{parameterId:"baselineKw",value:10,unit:"kW",provenance:"Measured",evidenceLevel:"A"}],outputs:[{parameterId:"annualEnergyKwh",value:30000,unit:"kWh/yr"}],assumptions:[],warnings:[],qaFlags:[],equipmentRecordIds:[]}],metadata:{}};
    editingEcmId="ECM-01";
    document.getElementById("ecmTitle").value="Edited";
    document.getElementById("ecmCategory").value="HVAC";
    document.getElementById("ecmEquipment").tagName="SELECT";
    document.getElementById("ecmEquipment").selectedOptions=[];
    await saveEcm();
    const exported=structuredClone(currentAudit);
    return {ids:currentAudit.ecms[0].calculationIds,calculation:exported.calculations[0]};
  })()`,context);
  assert.deepEqual([...result.ids],["CALC-001"]);
  assert.equal(result.calculation.inputs[0].provenance,"Measured");
  assert.equal(result.calculation.outputs[0].value,30000);
});

test("V5 converts legacy utility months without inventing dates and keeps empty V4 audits byte-equivalent",()=>{const context=loadApp(),legacy=vm.runInContext(`migrateAudit({auditId:"a",schemaVersion:4,site:{},systems:[],equipment:[],ecms:[],calculations:[],metadata:{},utility:{months:[{utilityMonthId:"m1",month:"2025-01",kwh:100,electricCost:25}]}})`,context);assert.equal(legacy.changed,true);assert.equal(legacy.audit.utilityAccounts[0].bills[0].billingStartDate,"");assert.equal(legacy.audit.utilityAccounts[0].bills[0].usage,100);assert.match(legacy.warnings.join(" "),/exact billing dates/i);const empty=vm.runInContext(`migrateAudit({auditId:"b",schemaVersion:4,site:{},systems:[],equipment:[],ecms:[],calculations:[],metadata:{},utility:{months:[]}})`,context);assert.equal(empty.changed,false);assert.equal(empty.audit.utilityAccounts,undefined);});

test("new utility account and bill persist, while a failed bill save rolls back",async()=>{const context=loadApp();const result=await vm.runInContext(`(async()=>{currentAudit={auditId:"a",schemaVersion:4,site:{},systems:[],equipment:[],ecms:[],calculations:[],utility:{months:[]},utilityAccounts:[],metadata:{}};document.getElementById("uLabel").value="Main";document.getElementById("uType").value="Electricity";await saveUtilityMonth();const account=currentAudit.utilityAccounts[0];document.getElementById("uBillAccountId").value=account.utilityAccountId;document.getElementById("uBillStart").value="2025-01-01";document.getElementById("uBillEnd").value="2025-01-31";document.getElementById("uBillUsage").value="1000";document.getElementById("uBillUnit").value="kWh";document.getElementById("uBillCost").value="200";await saveUtilityBill();const saved=account.bills.length;dbPutAudit=async()=>{throw new Error("quota")};document.getElementById("uBillStart").value="2025-02-01";document.getElementById("uBillEnd").value="2025-02-28";await saveUtilityBill();return {accounts:currentAudit.utilityAccounts.length,saved,bills:account.bills.length};})()`,context);assert.equal(result.accounts,1);assert.equal(result.saved,1);assert.equal(result.bills,1);});
