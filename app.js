const APP_VERSION = "3.1";
const SCHEMA_VERSION = 3;

let currentAudit = null;
let activeType = "HVAC";
let draftEquipment = null;
let saveTimer = null;
let savePending = false;
let editingEcmId = null;
let saveChain = Promise.resolve();
let changeRevision = 0;
let persistedRevision = 0;
let availablePhotoIds = new Set();
let photoPreviewUrls = [];
let currentMigrationBackup = null;

const $ = id => document.getElementById(id);
const nowISO = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const schemas = {
  HVAC: [
    ["equipmentId","Equipment ID","AHU-1"],["equipmentSubtype","Type","RTU / AHU / Split / Boiler / Chiller"],
    ["manufacturer","Manufacturer",""],["model","Model",""],["serial","Serial",""],["capacity","Cooling / Heating Capacity",""],
    ["efficiency","Efficiency (EER/SEER/COP/AFUE)",""],["fanHp","Fan/Motor HP",""],["vfd","VFD?","Yes / No"],
    ["schedule","Operating Schedule",""],["controls","Controls / Sequence",""]
  ],
  Lighting: [
    ["equipmentId","Area / Fixture ID","LTG-1"],["equipmentSubtype","Fixture Type","2x4 troffer / high bay / exterior"],
    ["quantity","Quantity",""],["existingWatts","Existing Watts / Fixture",""],["lampType","Lamp / Technology","T8 / T12 / LED / HID"],
    ["hoursAnnual","Annual Operating Hours",""],["controls","Controls","Switch / occupancy / daylight"],["lightLevel","Measured Light Level","fc or lux"]
  ],
  DHW: [
    ["equipmentId","Equipment ID","DHW-1"],["equipmentSubtype","Type","Storage / tankless / HPWH / boiler"],
    ["manufacturer","Manufacturer",""],["model","Model",""],["fuel","Fuel","Natural Gas / Electric"],
    ["input","Input Capacity","kBtu/h or kW"],["storage","Storage Volume","gal"],["efficiency","Efficiency / UEF",""],
    ["setpoint","Setpoint °F",""],["recirc","Recirculation?","Yes / No"],["schedule","Operating Schedule",""]
  ]
};

const PHOTO_REQUIREMENTS = {
  HVAC: {required:["Equipment Overview","Nameplate"], recommended:["Controls"]},
  Lighting: {required:["Equipment Overview"], recommended:["Controls"]},
  DHW: {required:["Equipment Overview","Nameplate"], recommended:["Controls"]}
};

const ECM_TEMPLATES = {
  hvac_vfd:{
    title:"Install VFD on Supply Fan",category:"HVAC",
    existing:"Constant-speed supply fan operation.",
    proposed:"Install VFD and modulate fan speed based on system demand / static pressure reset.",
    required:[
      {label:"Motor HP",keys:["fanHp"]},
      {label:"Operating Schedule",keys:["schedule"]},
      {label:"Existing Control Method",keys:["controls"]},
      {label:"Fan Load / Speed Profile",measurement:["speed","hz","fan load","airflow"],requireUnit:true},
      {label:"Static Pressure",measurement:["static pressure","in. w.c."],requireUnit:true}
    ],
    recommended:[
      {label:"Motor Efficiency",keys:["efficiency"]},
      {label:"Measured Electrical Load",measurement:["kw","amps","current","power factor","voltage"],requireUnit:true},
      {label:"Controls Photo",photo:["Controls"]}
    ]
  },
  hvac_schedule:{
    title:"Optimize HVAC Operating Schedule",category:"HVAC",
    existing:"HVAC operates beyond confirmed occupancy requirements.",
    proposed:"Reduce runtime to align with occupancy, warm-up, and setback requirements.",
    required:[
      {label:"Existing Schedule",keys:["schedule"]},
      {label:"Occupancy Schedule",site:["hoursWeek"]},
      {label:"Equipment Capacity",keys:["capacity"]},
      {label:"Equipment Type",keys:["equipmentSubtype"]}
    ],
    recommended:[
      {label:"Measured or Estimated Operating Power",measurement:["kw","amps","current"],requireUnit:true},
      {label:"Controls / BAS Evidence",photo:["Controls"]}
    ]
  },
  hvac_economizer:{
    title:"Repair / Optimize Economizer",category:"HVAC",
    existing:"Economizer operation is absent, disabled, or not functioning as intended.",
    proposed:"Repair or optimize outside-air economizer controls and sequence.",
    required:[
      {label:"Controls / Sequence",keys:["controls"]},
      {label:"Outdoor Air Temp",measurement:["outdoor","outside air","osa"],requireUnit:true},
      {label:"Return Air Temp",measurement:["return air"],requireUnit:true},
      {label:"Supply Air Temp",measurement:["supply air"],requireUnit:true}
    ],
    recommended:[
      {label:"Humidity / Enthalpy Data",measurement:["humidity","rh","enthalpy"],requireUnit:true},
      {label:"Controls Photo",photo:["Controls"]}
    ]
  },
  lighting_led:{
    title:"LED Lighting Retrofit",category:"Lighting",
    existing:"Existing non-LED lighting remains in service.",
    proposed:"Replace existing fixtures/lamps with LED equivalents while maintaining required illumination.",
    required:[
      {label:"Fixture Quantity",keys:["quantity"]},
      {label:"Existing Watts",keys:["existingWatts"]},
      {label:"Annual Operating Hours",keys:["hoursAnnual"]},
      {label:"Fixture / Lamp Type",keys:["equipmentSubtype","lampType"]}
    ],
    recommended:[
      {label:"Measured Light Level",keys:["lightLevel"]},
      {label:"Representative Fixture Photo",photo:["Equipment Overview"]}
    ]
  },
  lighting_controls:{
    title:"Add / Optimize Lighting Controls",category:"Lighting",
    existing:"Lighting is controlled manually or remains energized during unoccupied periods.",
    proposed:"Add occupancy, scheduling, or daylight controls appropriate to the space.",
    required:[
      {label:"Existing Controls",keys:["controls"]},
      {label:"Annual Operating Hours",keys:["hoursAnnual"]},
      {label:"Fixture Quantity",keys:["quantity"]},
      {label:"Existing Watts",keys:["existingWatts"]}
    ],
    recommended:[
      {label:"Controls Photo",photo:["Controls"]},
      {label:"Occupancy Pattern Note",measurement:["occupancy"]}
    ]
  },
  dhw_hpwh:{
    title:"Replace Existing Water Heater with HPWH",category:"DHW",
    existing:"Existing water heating is provided by non-heat-pump equipment.",
    proposed:"Replace with appropriately sized heat pump water heating system.",
    required:[
      {label:"Fuel Type",keys:["fuel"]},
      {label:"Input Capacity",keys:["input"]},
      {label:"Storage Volume",keys:["storage"]},
      {label:"Efficiency / UEF",keys:["efficiency"]},
      {label:"Operating Schedule",keys:["schedule"]}
    ],
    recommended:[
      {label:"DHW Temperature",measurement:["water temperature","dhw temperature","setpoint"],requireUnit:true},
      {label:"Nameplate Photo",photo:["Nameplate"]}
    ]
  },
  dhw_tankless:{
    title:"Replace Storage Water Heater with Tankless",category:"DHW",
    existing:"Existing storage water heating equipment remains in service.",
    proposed:"Replace with appropriately sized condensing tankless water heating system.",
    required:[
      {label:"Fuel Type",keys:["fuel"]},
      {label:"Input Capacity",keys:["input"]},
      {label:"Storage Volume",keys:["storage"]},
      {label:"Efficiency / UEF",keys:["efficiency"]},
      {label:"Recirculation Configuration",keys:["recirc"]}
    ],
    recommended:[
      {label:"Peak Flow / Load Information",measurement:["flow","gpm","load"],requireUnit:true},
      {label:"Nameplate Photo",photo:["Nameplate"]}
    ]
  }
};

function blankAudit(){
  return {
    schemaVersion:SCHEMA_VERSION,
    auditId:uid(),
    createdAt:nowISO(),
    updatedAt:nowISO(),
    status:"Draft",
    site:{auditDate:new Date().toISOString().slice(0,10)},
    utility:{electricRate:"",demandRate:"",gasRate:"",notes:"",months:[]},
    equipment:[],
    ecms:[],
    calculations:[],
    metadata:{app:"Audist", appVersion:APP_VERSION, storage:"IndexedDB", intendedStandard:"ASHRAE Level 2 support"}
  };
}

function migrateAudit(audit){
  if(!audit) return null;
  const migrated = structuredClone(audit);
  const oldVersion = Number(migrated.schemaVersion || 2);
  const warnings=[];
  let changed=oldVersion<SCHEMA_VERSION;

  if(!Number.isFinite(oldVersion)) throw new Error("Audit schema version is invalid.");
  if(oldVersion>SCHEMA_VERSION){
    throw new Error(`This audit uses schema version ${oldVersion}, which is newer than this app supports. It was opened read-only and was not changed.`);
  }

  if(oldVersion < 3){
    migrated.schemaVersion = 3;
    migrated.utility = migrated.utility || {electricRate:"",demandRate:"",gasRate:"",notes:"",months:[]};
    migrated.equipment = migrated.equipment || [];
    migrated.ecms = migrated.ecms || [];
    migrated.calculations = migrated.calculations || [];
    migrated.metadata = {...(migrated.metadata||{}), app:"Audist", appVersion:APP_VERSION};
  }

  migrated.metadata=migrated.metadata||{};
  migrated.equipment=migrated.equipment||[];
  migrated.ecms=migrated.ecms||[];
  migrated.calculations=migrated.calculations||[];
  migrated.equipment.forEach(eq=>{
    if(!eq.recordId){ eq.recordId=uid(); changed=true; }
    if(!Array.isArray(eq.measurements)){ eq.measurements=[]; changed=true; }
    if(!Array.isArray(eq.photos)){ eq.photos=[]; changed=true; }
    if(!eq.status){ eq.status="complete"; changed=true; }
  });

  migrated.ecms.forEach(ecm=>{
    if(!Array.isArray(ecm.unresolvedEquipmentReferences)){ ecm.unresolvedEquipmentReferences=[]; changed=true; }
    if(!Array.isArray(ecm.affectedEquipmentRecordIds)){
      ecm.affectedEquipmentRecordIds=[];
      changed=true;
    }
    (ecm.affectedEquipmentIds||[]).forEach(displayId=>{
      const matches=migrated.equipment.filter(eq=>eq.equipmentId===displayId);
      const alreadyLinked=matches.some(eq=>ecm.affectedEquipmentRecordIds.includes(eq.recordId));
      if(matches.length===1&&!alreadyLinked){
        ecm.affectedEquipmentRecordIds.push(matches[0].recordId);
        changed=true;
      }
      const ambiguous=matches.length>1;
      const unresolvedMissing=matches.length===0;
      if(ambiguous||unresolvedMissing){
        const reason=ambiguous?"duplicate-display-id":"equipment-not-found";
        if(!ecm.unresolvedEquipmentReferences.some(ref=>ref.displayId===displayId&&ref.source==="legacy-affectedEquipmentIds"&&!ref.resolution)){
          ecm.unresolvedEquipmentReferences.push({
            displayId,
            source:"legacy-affectedEquipmentIds",
            reason,
            candidateRecordIds:matches.map(eq=>eq.recordId),
            migratedAt:nowISO(),
            resolution:null
          });
          changed=true;
        }
      }
    });
    ecm.unresolvedEquipmentReferences.filter(ref=>!ref.resolution).forEach(ref=>{
      warnings.push(`ECM ${ecm.ecmId||"(unknown)"}: unresolved equipment ID ${ref.displayId} (${ref.reason||"review-required"}).`);
    });
  });

  if(warnings.length){
    const existing=migrated.metadata.migrationWarnings||[];
    const combined=[...new Set([...existing,...warnings])];
    if(JSON.stringify(combined)!==JSON.stringify(existing)){ migrated.metadata.migrationWarnings=combined; changed=true; }
  }
  if(oldVersion < 3){
    migrated.metadata.migratedFromSchemaVersion=oldVersion;
    migrated.metadata.migratedAt=nowISO();
  }
  return {audit:migrated,changed,warnings:migrated.metadata.migrationWarnings||[]};
}

function validateAuditStructure(audit){
  const errors=[];
  if(!audit||typeof audit!=="object") errors.push("Audit is not an object.");
  if(!String(audit?.auditId||"").trim()) errors.push("Audit ID is missing.");
  if(!audit?.site||typeof audit.site!=="object"||Array.isArray(audit.site)) errors.push("Site record is invalid.");
  for(const key of ["equipment","ecms","calculations"]){
    if(!Array.isArray(audit?.[key])) errors.push(`${key} must be an array.`);
  }
  const recordIds=(audit?.equipment||[]).map(eq=>eq.recordId);
  if(recordIds.some(id=>!String(id||"").trim())) errors.push("An equipment record UUID is missing.");
  if(new Set(recordIds).size!==recordIds.length) errors.push("Equipment record UUIDs are not unique.");
  (audit?.ecms||[]).forEach(ecm=>{
    if(!Array.isArray(ecm.affectedEquipmentRecordIds)) errors.push(`ECM ${ecm.ecmId||"(unknown)"} has invalid UUID relationships.`);
    if(!Array.isArray(ecm.unresolvedEquipmentReferences||[])) errors.push(`ECM ${ecm.ecmId||"(unknown)"} has invalid unresolved relationships.`);
    (ecm.unresolvedEquipmentReferences||[]).forEach(ref=>{
      if(!ref||!String(ref.displayId||"").trim()||!String(ref.source||"").trim()) errors.push(`ECM ${ecm.ecmId||"(unknown)"} has an incomplete unresolved relationship record.`);
      if(ref?.candidateRecordIds&&!Array.isArray(ref.candidateRecordIds)) errors.push(`ECM ${ecm.ecmId||"(unknown)"} has invalid unresolved relationship candidates.`);
    });
    (ecm.affectedEquipmentRecordIds||[]).forEach(id=>{
      if(!recordIds.includes(id)) errors.push(`ECM ${ecm.ecmId||"(unknown)"} references missing equipment UUID ${id}.`);
    });
  });
  if(errors.length) throw new Error(`Migration validation failed: ${errors.join(" ")}`);
  return true;
}

function escapeHtml(s=""){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

async function showDashboard(){
  currentAudit=null;
  $("dashboard-view").classList.remove("hidden");
  $("audit-view").classList.add("hidden");
  $("home-btn").style.visibility="hidden";
  $("header-status").textContent=`V${APP_VERSION} • Offline-first`;
  const audits=await dbGetAllAudits();
  $("audit-list").innerHTML = audits.length ? audits.map(a=>`
    <div class="item audit-card" onclick="openAudit('${a.auditId}')">
      <div class="row">
        <div><strong>${escapeHtml(a.site?.facilityName || "Untitled Audit")}</strong>
        <div class="audit-meta">
          <span>${escapeHtml(a.site?.auditDate || "")}</span>
          <span>${a.equipment?.length || 0} equipment</span>
          <span>${a.ecms?.length || 0} ECMs</span>
        </div></div>
        <span class="pill">${escapeHtml(a.status || "Draft")}</span>
      </div>
    </div>`).join("") : `<div class="card"><p class="muted">No audits yet. Create your first audit.</p></div>`;
}

async function createAudit(){
  const a=blankAudit();
  await dbPutAudit(a);
  await openAudit(a.auditId);
}

async function openAudit(id){
  try{
    const stored=await dbGetAudit(id);
    if(!stored) throw new Error("Audit could not be found on this device.");
    const migration=migrateAudit(stored);
    if(migration.changed){
      validateAuditStructure(migration.audit);
      await dbBackupAudit(stored,`schema-${stored.schemaVersion||2}-to-${SCHEMA_VERSION}`);
      await dbPutAudit(migration.audit);
    }
    currentAudit=migration.audit;
    currentMigrationBackup=await dbGetLatestMigrationBackup(id);
    availablePhotoIds=new Set((await dbGetPhotosForAudit(id)).map(p=>p.photoId));
    changeRevision=0;
    persistedRevision=0;
    savePending=false;
    $("dashboard-view").classList.add("hidden");
    $("audit-view").classList.remove("hidden");
    $("home-btn").style.visibility="visible";
    populateSite();
    populateUtility();
    recalculateAllCompleteness();
    render();
    $("export-migration-backup-btn").classList.toggle("hidden",!currentMigrationBackup);
    const persistedWarnings=currentAudit.metadata?.migrationWarnings||[];
    $("migration-warning").classList.toggle("hidden",persistedWarnings.length===0);
    $("migration-warning").innerHTML=persistedWarnings.length
      ? `<strong>Migration review required</strong><ul>${persistedWarnings.map(w=>`<li>${escapeHtml(w)}</li>`).join("")}</ul>`
      : "";
    if(migration.changed&&migration.warnings.length) alert(`Migration completed with ${migration.warnings.length} warning(s). Export the audit and review its migrationWarnings before field use.`);
  }catch(error){
    console.error(error);
    currentAudit=null;
    alert(error.message||"This audit could not be opened safely.");
    await showDashboard();
  }
}

function populateSite(){
  document.querySelectorAll("[data-site]").forEach(el=>el.value=currentAudit.site?.[el.dataset.site] || "");
}
function populateUtility(){
  const u=currentAudit.utility || {months:[]};
  $("electric-rate").value=u.electricRate||"";
  $("demand-rate").value=u.demandRate||"";
  $("gas-rate").value=u.gasRate||"";
  $("utility-notes").value=u.notes||"";
}
function markPending(increment=true){
  if(increment) changeRevision++;
  savePending=true;
  $("save-status").textContent="Saving locally…";
  $("save-status").className="save-status pending";
}
function markSaved(revision){
  persistedRevision=Math.max(persistedRevision,revision);
  savePending=persistedRevision<changeRevision;
  if(savePending) return;
  $("save-status").textContent=`Saved locally • ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  $("save-status").className="save-status";
}
function markError(){
  savePending=true;
  $("save-status").textContent="Save failed — do not close; export if possible";
  $("save-status").className="save-status error";
}
function queueSave(){
  if(!currentAudit) return;
  markPending();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>saveCurrent(),350);
}
async function saveCurrent(){
  if(!currentAudit) return false;
  clearTimeout(saveTimer);
  const auditId=currentAudit.auditId;
  const revision=++changeRevision;
  markPending(false);
  try{
    currentAudit.updatedAt=nowISO();
    currentAudit.metadata={...(currentAudit.metadata||{}),app:"Audist",appVersion:APP_VERSION};
    recalculateAllCompleteness();
    const snapshot=structuredClone(currentAudit);
    saveChain=saveChain.catch(()=>{}).then(()=>dbPutAudit(snapshot));
    await saveChain;
    if(currentAudit?.auditId===auditId) markSaved(revision);
    return true;
  }catch(e){
    console.error(e);
    markError();
    return false;
  }
}
async function saveCurrentWithPhotos({putPhotos=[],deletePhotoIds=[]}={}){
  if(!currentAudit) return false;
  clearTimeout(saveTimer);
  const auditId=currentAudit.auditId;
  const revision=++changeRevision;
  markPending(false);
  try{
    currentAudit.updatedAt=nowISO();
    currentAudit.metadata={...(currentAudit.metadata||{}),app:"Audist",appVersion:APP_VERSION};
    recalculateAllCompleteness();
    const snapshot=structuredClone(currentAudit);
    saveChain=saveChain.catch(()=>{}).then(()=>dbCommitAuditAndPhotos(snapshot,{putPhotos,deletePhotoIds}));
    await saveChain;
    putPhotos.forEach(p=>availablePhotoIds.add(p.photoId));
    deletePhotoIds.forEach(id=>availablePhotoIds.delete(id));
    if(currentAudit?.auditId===auditId) markSaved(revision);
    return true;
  }catch(error){
    console.error(error);
    markError();
    return false;
  }
}
async function flushPendingSave(){
  if(savePending && currentAudit) await saveCurrent();
}
document.addEventListener("visibilitychange",()=>{ if(document.hidden) flushPendingSave(); });
window.addEventListener("pagehide",()=>{ flushPendingSave(); });

function siteInputChanged(e){
  currentAudit.site[e.target.dataset.site]=e.target.value;
  if(e.target.dataset.site==="facilityName") $("audit-title").textContent=e.target.value || "Untitled Audit";
  queueSave();
}
function utilityHeaderChanged(){
  currentAudit.utility=currentAudit.utility||{months:[]};
  currentAudit.utility.electricRate=$("electric-rate").value;
  currentAudit.utility.demandRate=$("demand-rate").value;
  currentAudit.utility.gasRate=$("gas-rate").value;
  currentAudit.utility.notes=$("utility-notes").value;
  queueSave();
}
function openUtility(){
  ["uMonth","uKwh","uKw","uElectricCost","uTherms","uGasCost","uNotes"].forEach(id=>$(id).value="");
  $("utility-dialog").showModal();
}
async function saveUtilityMonth(){
  if(!$("uMonth").value){ alert("Month is required."); return; }
  currentAudit.utility=currentAudit.utility||{months:[]};
  currentAudit.utility.months=currentAudit.utility.months||[];
  const month={
    utilityMonthId:uid(),month:$("uMonth").value,kwh:$("uKwh").value,kw:$("uKw").value,
    electricCost:$("uElectricCost").value,therms:$("uTherms").value,gasCost:$("uGasCost").value,notes:$("uNotes").value
  };
  currentAudit.utility.months.push(month);
  if(await saveCurrent()){ $("utility-dialog").close(); render(); }
  else currentAudit.utility.months=currentAudit.utility.months.filter(x=>x.utilityMonthId!==month.utilityMonthId);
}
async function deleteUtilityMonth(id){
  if(!confirm("Delete this utility month?")) return;
  const previous=currentAudit.utility.months;
  currentAudit.utility.months=currentAudit.utility.months.filter(x=>x.utilityMonthId!==id);
  if(await saveCurrent()) render();
  else currentAudit.utility.months=previous;
}

function nextEquipmentId(type){
  const prefix = type==="HVAC" ? "RTU" : type==="Lighting" ? "LTG" : "DHW";
  let n=1;
  while(currentAudit.equipment.some(eq=>String(eq.equipmentId).toLowerCase()===`${prefix}-${String(n).padStart(2,"0")}`.toLowerCase())) n++;
  return `${prefix}-${String(n).padStart(2,"0")}`;
}

function renderEquipmentFields(type, values={}){
  $("equipment-fields").innerHTML=schemas[type].map(([id,label,ph])=>`
    <label>${label}<input data-equipment-field="${id}" id="f_${id}" placeholder="${ph}" value="${escapeHtml(values[id]||"")}"></label>`).join("");
  document.querySelectorAll("[data-equipment-field]").forEach(el=>el.addEventListener("input",equipmentFieldChanged));
}
async function openNewEquipment(){
  draftEquipment={
    recordId:uid(),systemType:activeType,equipmentId:nextEquipmentId(activeType),
    measurements:[],photos:[],potentialEcmFlags:[],createdAt:nowISO(),updatedAt:nowISO(),status:"in_progress"
  };
  currentAudit.equipment.push(draftEquipment);
  if(!await saveCurrent()){
    currentAudit.equipment=currentAudit.equipment.filter(eq=>eq.recordId!==draftEquipment.recordId);
    draftEquipment=null;
    alert("Equipment could not be created because local persistence failed. No equipment record was retained.");
    return;
  }
  $("equipment-record-id").value=draftEquipment.recordId;
  $("equipment-dialog-title").textContent=`Add ${activeType} Equipment`;
  renderEquipmentFields(activeType,draftEquipment);
  $("equipmentNotes").value="";
  $("equipmentFlags").value="";
  renderDraftMeasurements();
  await renderDraftPhotos();
  $("equipment-dialog").showModal();
}
async function editEquipment(id){
  const existing=currentAudit.equipment.find(x=>x.recordId===id);
  draftEquipment=existing;
  activeType=existing.systemType;
  $("equipment-record-id").value=id;
  $("equipment-dialog-title").textContent=`Edit ${activeType} Equipment`;
  renderEquipmentFields(activeType,existing);
  $("equipmentNotes").value=existing.notes||"";
  $("equipmentFlags").value=(existing.potentialEcmFlags||[]).join(", ");
  renderDraftMeasurements();
  await renderDraftPhotos();
  $("equipment-dialog").showModal();
}
function equipmentFieldChanged(e){
  if(!draftEquipment) return;
  const key=e.target.dataset.equipmentField;
  if(key==="equipmentId"){
    const candidate=e.target.value.trim();
    const duplicate=candidate && currentAudit.equipment.some(eq=>eq.recordId!==draftEquipment.recordId && String(eq.equipmentId||"").trim().toLowerCase()===candidate.toLowerCase());
    e.target.setCustomValidity(duplicate?"Equipment IDs must be unique.":"");
    if(duplicate){ e.target.reportValidity(); return; }
  }
  draftEquipment[key]=e.target.value;
  draftEquipment.updatedAt=nowISO();
  queueSave();
}
function syncEquipmentNotes(){
  if(!draftEquipment) return;
  draftEquipment.notes=$("equipmentNotes").value;
  draftEquipment.potentialEcmFlags=$("equipmentFlags").value.split(",").map(x=>x.trim()).filter(Boolean);
  draftEquipment.updatedAt=nowISO();
  queueSave();
}
async function finishEquipment(){
  if(!draftEquipment) return;
  const idInput=$("f_equipmentId");
  if(idInput&&!idInput.checkValidity()){ idInput.reportValidity(); return; }
  syncEquipmentNotes();
  if(!String(draftEquipment.equipmentId||"").trim()){ alert("Equipment ID is required."); return; }
  const duplicate=currentAudit.equipment.find(eq=>eq.recordId!==draftEquipment.recordId && String(eq.equipmentId||"").trim().toLowerCase()===String(draftEquipment.equipmentId).trim().toLowerCase());
  if(duplicate){ alert(`Equipment ID ${draftEquipment.equipmentId} already exists. Please use a unique ID.`); return; }
  draftEquipment.status="complete";
  draftEquipment.updatedAt=nowISO();
  if(await saveCurrent()){
    $("equipment-dialog").close();
    render();
  }
}
async function deleteEquipment(id){
  const eq=currentAudit.equipment.find(x=>x.recordId===id);
  const linked=currentAudit.ecms.filter(e=>
    (e.affectedEquipmentRecordIds||[]).includes(id)||
    (e.unresolvedEquipmentReferences||[]).some(ref=>!ref.resolution&&(
      ref.displayId===eq?.equipmentId||(ref.candidateRecordIds||[]).includes(id)
    ))
  );
  if(linked.length){
    alert(`This equipment is linked to ${linked.length} ECM(s). Remove those relationships before deleting it.`);
    return;
  }
  if(!confirm("Delete this equipment record and its stored photos?")) return;
  const previous=currentAudit.equipment;
  const deleting=previous.find(x=>x.recordId===id);
  currentAudit.equipment=previous.filter(x=>x.recordId!==id);
  const photoIds=(deleting?.photos||[]).map(p=>p.photoId).filter(id=>availablePhotoIds.has(id));
  if(await saveCurrentWithPhotos({deletePhotoIds:photoIds})) render();
  else currentAudit.equipment=previous;
}

function openMeasurement(){
  ["mParameter","mValue","mUnit","mMethod","mNotes"].forEach(id=>$(id).value="");
  $("mSource").value="Measured";
  $("measurement-dialog").showModal();
}
async function saveMeasurement(){
  if(!$("mParameter").value){ alert("Parameter is required."); return; }
  const parsedValue=Number($("mValue").value);
  const measurement={
    measurementId:uid(),parameter:$("mParameter").value,value:$("mValue").value,
    numericValue:$("mValue").value===""||!Number.isFinite(parsedValue)?null:parsedValue,
    unit:$("mUnit").value,source:$("mSource").value,method:$("mMethod").value,
    notes:$("mNotes").value,capturedAt:nowISO()
  };
  draftEquipment.measurements.push(measurement);
  draftEquipment.updatedAt=nowISO();
  if(await saveCurrent()){
    $("measurement-dialog").close();
    renderDraftMeasurements();
    render();
  }else draftEquipment.measurements=draftEquipment.measurements.filter(x=>x.measurementId!==measurement.measurementId);
}
async function deleteMeasurement(id){
  if(!confirm("Delete this measurement?")) return;
  const previous=draftEquipment.measurements;
  draftEquipment.measurements=previous.filter(x=>x.measurementId!==id);
  if(await saveCurrent()){ renderDraftMeasurements(); render(); }
  else draftEquipment.measurements=previous;
}
function renderDraftMeasurements(){
  $("measurement-list").innerHTML=(draftEquipment?.measurements||[]).length ? draftEquipment.measurements.map(m=>`
    <div class="item"><div class="row"><div><strong>${escapeHtml(m.parameter)}</strong><small>${escapeHtml(m.value)} ${escapeHtml(m.unit)} • ${escapeHtml(m.source)}</small></div>
    <button class="secondary small" onclick="deleteMeasurement('${m.measurementId}')">Delete</button></div></div>`).join("") : `<p class="muted">No measurements yet.</p>`;
}

async function compressImage(file,maxDimension=1600,quality=0.78){
  const sourceUrl=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{
      const i=new Image(); i.onload=()=>resolve(i); i.onerror=reject; i.src=sourceUrl;
    });
    let {width,height}=img;
    const scale=Math.min(1,maxDimension/Math.max(width,height));
    width=Math.max(1,Math.round(width*scale)); height=Math.max(1,Math.round(height*scale));
    const canvas=document.createElement("canvas"); canvas.width=width; canvas.height=height;
    canvas.getContext("2d").drawImage(img,0,0,width,height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image compression failed")),"image/jpeg",quality));
    return {blob,width,height,compressedBytes:blob.size};
  }finally{ URL.revokeObjectURL(sourceUrl); }
}
async function handlePhoto(file){
  if(!file || !draftEquipment) return;
  try{
    const compressed=await compressImage(file);
    const category=$("photo-category").value||"Other";
    const note=$("photo-note").value.trim();
    const equipmentId=(draftEquipment.equipmentId||"Equipment").trim();
    const safeCategory=category.replace(/[^a-z0-9]+/gi,"_");
    const sequence=String((draftEquipment.photos?.length||0)+1).padStart(2,"0");
    const photoId=uid();
    const generatedName=`${equipmentId}_${safeCategory}_${sequence}.jpg`;

    const storedPhoto={
      photoId,
      auditId:currentAudit.auditId,
      equipmentRecordId:draftEquipment.recordId,
      blob:compressed.blob
    };

    draftEquipment.photos.push({
      photoId,name:generatedName,category,note,capturedAt:nowISO(),
      width:compressed.width,height:compressed.height,originalBytes:file.size,compressedBytes:compressed.compressedBytes
    });
    draftEquipment.updatedAt=nowISO();
    $("photo-note").value="";
    if(!await saveCurrentWithPhotos({putPhotos:[storedPhoto]})){
      draftEquipment.photos=draftEquipment.photos.filter(p=>p.photoId!==photoId);
      throw new Error("Photo save failed");
    }
    await renderDraftPhotos();
    render();
  }catch(err){
    console.error(err);
    alert("Photo could not be saved. Please try again.");
  }finally{
    $("photo-input").value="";
  }
}
async function deletePhoto(id){
  if(!confirm("Delete this photo?")) return;
  const previous=draftEquipment.photos;
  draftEquipment.photos=previous.filter(x=>x.photoId!==id);
  if(await saveCurrentWithPhotos({deletePhotoIds:[id]})){
    await renderDraftPhotos(); render();
  }else draftEquipment.photos=previous;
}
async function renderDraftPhotos(){
  photoPreviewUrls.forEach(url=>URL.revokeObjectURL(url));
  photoPreviewUrls=[];
  const html=[];
  for(const p of (draftEquipment?.photos||[])){
    const stored=await dbGetPhoto(p.photoId);
    let src="";
    if(stored?.blob){ src=URL.createObjectURL(stored.blob); photoPreviewUrls.push(src); }
    else if(p.dataUrl) src=p.dataUrl; // legacy V2.1/V3 embedded photo fallback
    const kb=p.compressedBytes?Math.round(p.compressedBytes/1024):null;
    html.push(`<div class="photo-card">
      ${src?`<img src="${src}" alt="${escapeHtml(p.name)}">`:`<div class="photo-missing">Image unavailable</div>`}
      <button onclick="deletePhoto('${p.photoId}')">✕</button>
      <div class="photo-meta"><strong>${escapeHtml(p.category||"Field Photo")}</strong>${p.note?`<br>${escapeHtml(p.note)}`:""}${kb?`<br>${kb} KB`:""}</div>
    </div>`);
  }
  $("photo-list").innerHTML=html.join("");
}

function getEquipmentByRecordIds(recordIds=[]){
  return currentAudit.equipment.filter(eq=>recordIds.includes(eq.recordId));
}
function checkRequirement(req,equipment){
  if(req.site) return req.site.some(k=>String(currentAudit.site?.[k]||"").trim());
  if(req.keys) return equipment.some(eq=>req.keys.some(k=>String(eq[k]||"").trim()));
  if(req.measurement){
    return equipment.some(eq=>(eq.measurements||[]).some(m=>{
      const p=String(m.parameter||"").toLowerCase();
      const hasValue=String(m.value??"").trim()!=="";
      const hasUnit=!req.requireUnit||String(m.unit||"").trim()!=="";
      return hasValue&&hasUnit&&req.measurement.some(term=>p.includes(term));
    }));
  }
  if(req.photo){
    return equipment.some(eq=>(eq.photos||[]).some(p=>req.photo.includes(p.category)&&(Boolean(p.dataUrl)||availablePhotoIds.has(p.photoId))));
  }
  return false;
}
function evaluateTemplate(templateKey,recordIds=[]){
  const t=ECM_TEMPLATES[templateKey];
  if(!t) return {percent:0,required:[],recommended:[]};
  const equipment=recordIds.length?getEquipmentByRecordIds(recordIds):[];
  const required=(t.required||[]).map(r=>({label:r.label,status:checkRequirement(r,equipment)?"Complete":"Missing"}));
  const recommended=(t.recommended||[]).map(r=>({label:r.label,status:checkRequirement(r,equipment)?"Complete":"Recommended"}));
  const complete=required.filter(x=>x.status==="Complete").length;
  return {percent:required.length?Math.round((complete/required.length)*100):100,required,recommended};
}
function evaluatePhotoCompleteness(eq){
  const rules=PHOTO_REQUIREMENTS[eq.systemType]||{required:[],recommended:[]};
  const cats=(eq.photos||[]).filter(p=>Boolean(p.dataUrl)||availablePhotoIds.has(p.photoId)).map(p=>p.category);
  const required=rules.required.map(label=>({label,status:cats.includes(label)?"Complete":"Missing"}));
  const recommended=rules.recommended.map(label=>({label,status:cats.includes(label)?"Complete":"Recommended"}));
  const complete=required.filter(x=>x.status==="Complete").length;
  return {percent:required.length?Math.round((complete/required.length)*100):100,required,recommended};
}
function recalculateAllCompleteness(){
  if(!currentAudit) return;
  currentAudit.ecms.forEach(ecm=>{
    const linked=getEquipmentByRecordIds(ecm.affectedEquipmentRecordIds||[]);
    const unresolved=(ecm.unresolvedEquipmentReferences||[]).filter(ref=>!ref.resolution).map(ref=>ref.displayId);
    ecm.affectedEquipmentIds=[...new Set([...linked.map(eq=>eq.equipmentId),...unresolved])];
    if(ecm.templateKey){
      const result=evaluateTemplate(ecm.templateKey,ecm.affectedEquipmentRecordIds||[]);
      ecm.completenessPercent=result.percent;
      ecm.completenessItems=[...result.required,...result.recommended];
    }
  });
}

function nextEcmId(){
  let n=1;
  const existing=new Set(currentAudit.ecms.map(e=>e.ecmId));
  while(existing.has(`ECM-${String(n).padStart(2,"0")}`)) n++;
  return `ECM-${String(n).padStart(2,"0")}`;
}

function availableEquipmentOptions(selected=[]){
  return currentAudit.equipment.map(eq=>`<option value="${eq.recordId}" ${selected.includes(eq.recordId)?"selected":""}>${escapeHtml(eq.equipmentId)} — ${escapeHtml(eq.equipmentSubtype||eq.systemType)}</option>`).join("");
}
function openEcm(ecmId=null){
  editingEcmId=ecmId;
  const existing=ecmId?currentAudit.ecms.find(e=>e.ecmId===ecmId):null;
  ["ecmTitle","ecmExisting","ecmProposed","ecmMissing"].forEach(id=>$(id).value="");
  $("ecmCategory").value="HVAC"; $("ecmConfidence").value="Medium";

  const select=$("ecmEquipment");
  if(select.tagName==="SELECT"){
    select.innerHTML=availableEquipmentOptions(existing?.affectedEquipmentRecordIds||[]);
  }

  if(existing){
    $("ecmTitle").value=existing.title||"";
    $("ecmCategory").value=existing.category||"HVAC";
    $("ecmExisting").value=existing.existingCondition||"";
    $("ecmProposed").value=existing.proposedImprovement||"";
    $("ecmMissing").value=existing.missingData||"";
    $("ecmConfidence").value=existing.confidence||"Medium";
    $("ecm-template").value=existing.templateKey||"";
  }else{
    const key=$("ecm-template").value;
    const t=ECM_TEMPLATES[key];
    if(t){
      $("ecmTitle").value=t.title;
      $("ecmCategory").value=t.category;
      $("ecmExisting").value=t.existing;
      $("ecmProposed").value=t.proposed;
    }
  }
  updateEcmTemplateInfo();
  $("ecm-dialog").showModal();
}
function selectedEcmEquipmentRecordIds(){
  const el=$("ecmEquipment");
  if(el.tagName==="SELECT") return [...el.selectedOptions].map(o=>o.value);
  return [];
}
function updateEcmTemplateInfo(){
  const key=$("ecm-template").value;
  const box=$("ecm-template-info");
  const t=ECM_TEMPLATES[key];
  if(!t){ box.classList.add("hidden"); box.innerHTML=""; return; }
  const evald=evaluateTemplate(key,selectedEcmEquipmentRecordIds());
  box.classList.remove("hidden");
  box.innerHTML=`<strong>Template data requirements</strong>
    <div class="completeness"><span>${evald.percent}% required complete</span><div class="bar"><span style="width:${evald.percent}%"></span></div></div>
    <ul>
      ${evald.required.map(i=>`<li class="${i.status==="Complete"?"badge-ok":"badge-warn"}">${i.status==="Complete"?"✓":"⚠"} Required: ${i.label}</li>`).join("")}
      ${evald.recommended.map(i=>`<li class="${i.status==="Complete"?"badge-ok":"badge-recommend"}">${i.status==="Complete"?"✓":"○"} Recommended: ${i.label}</li>`).join("")}
    </ul>`;
}
async function saveEcm(){
  if(!$("ecmTitle").value){ alert("ECM title is required."); return; }
  const recordIds=selectedEcmEquipmentRecordIds();
  const displayIds=getEquipmentByRecordIds(recordIds).map(eq=>eq.equipmentId);
  const editable={
    title:$("ecmTitle").value,
    category:$("ecmCategory").value,
    affectedEquipmentRecordIds:recordIds,
    affectedEquipmentIds:displayIds,
    existingCondition:$("ecmExisting").value,
    proposedImprovement:$("ecmProposed").value,
    missingData:$("ecmMissing").value,
    confidence:$("ecmConfidence").value,
    templateKey:$("ecm-template").value||null
  };

  let rollback;
  if(editingEcmId){
    const e=currentAudit.ecms.find(x=>x.ecmId===editingEcmId);
    const previous=structuredClone(e);
    rollback=()=>Object.assign(e,previous);
    Object.assign(e,editable,{updatedAt:nowISO()});
  }else{
    const created={
      ecmId:nextEcmId(),...editable,
      unresolvedEquipmentReferences:[],
      savings:{electricKwh:null,demandKw:null,therms:null,cost:null,method:null},
      implementationCost:null,simplePaybackYears:null,createdAt:nowISO()
    };
    currentAudit.ecms.push(created);
    rollback=()=>{ currentAudit.ecms=currentAudit.ecms.filter(x=>x!==created); };
  }
  if(await saveCurrent()){
    $("ecm-dialog").close();
    editingEcmId=null;
    render();
  }else rollback();
}
async function deleteEcm(id){
  if(!confirm("Delete this ECM?")) return;
  const previous=currentAudit.ecms;
  currentAudit.ecms=currentAudit.ecms.filter(x=>x.ecmId!==id);
  if(await saveCurrent()) render();
  else currentAudit.ecms=previous;
}

function render(){
  if(!currentAudit) return;
  recalculateAllCompleteness();
  $("audit-title").textContent=currentAudit.site?.facilityName||"Untitled Audit";
  $("header-status").textContent=`${currentAudit.site?.facilityName||"Active audit"} • V${APP_VERSION}`;

  const filtered=currentAudit.equipment.filter(x=>x.systemType===activeType);
  $("equipment-list").innerHTML=filtered.length?filtered.map(x=>{
    const pc=evaluatePhotoCompleteness(x);
    return `<div class="item">
      <div class="row">
        <div onclick="editEquipment('${x.recordId}')" style="flex:1;cursor:pointer">
          <strong>${escapeHtml(x.equipmentId||"(ID missing)")}</strong>
          <small>${escapeHtml(x.equipmentSubtype||x.systemType)} • ${(x.measurements||[]).length} measurements • ${(x.photos||[]).length} photos • ${x.status==="in_progress"?"In progress":"Saved"}</small>
          <div class="completeness"><span>Photos ${pc.percent}%</span><div class="bar"><span style="width:${pc.percent}%"></span></div></div>
        </div>
        <button class="secondary small" onclick="deleteEquipment('${x.recordId}')">Delete</button>
      </div>
    </div>`;
  }).join(""):`<p class="muted">No ${activeType} equipment added yet.</p>`;

  const months=currentAudit.utility?.months||[];
  $("utility-count").textContent=`${months.length} months`;
  $("utility-list").innerHTML=months.length?months.map(u=>`
    <div class="item"><div class="row"><div><strong>${escapeHtml(u.month)}</strong>
    <small>${u.kwh?`${escapeHtml(u.kwh)} kWh`:""}${u.kw?` • ${escapeHtml(u.kw)} kW`:""}${u.therms?` • ${escapeHtml(u.therms)} therms`:""}</small></div>
    <button class="secondary small" onclick="deleteUtilityMonth('${u.utilityMonthId}')">Delete</button></div></div>`).join(""):`<p class="muted">No monthly utility data added yet.</p>`;

  $("equipment-count").textContent=`${currentAudit.equipment.length} items`;
  $("add-equipment-btn").textContent=`+ Add ${activeType} Equipment`;

  $("ecm-list").innerHTML=currentAudit.ecms.length?currentAudit.ecms.map(x=>`
    <div class="item"><div class="row"><div onclick="openEcm('${x.ecmId}')" style="flex:1;cursor:pointer">
      <strong>${x.ecmId}: ${escapeHtml(x.title)}</strong>
      <small>${escapeHtml(x.category)} • ${escapeHtml(x.confidence)} confidence</small>
      ${x.templateKey?`<div class="completeness"><span>${x.completenessPercent||0}% required complete</span><div class="bar"><span style="width:${x.completenessPercent||0}%"></span></div></div>`:""}
    </div><button class="secondary small" onclick="deleteEcm('${x.ecmId}')">Delete</button></div></div>`).join(""):`<p class="muted">No ECMs added yet.</p>`;
  $("ecm-count").textContent=`${currentAudit.ecms.length} ECMs`;

  const measurements=currentAudit.equipment.reduce((n,x)=>n+(x.measurements?.length||0),0);
  const photos=currentAudit.equipment.reduce((n,x)=>n+(x.photos?.length||0),0);
  $("review-summary").innerHTML=`
    <div class="metric"><strong>${currentAudit.equipment.length}</strong><span>Equipment</span></div>
    <div class="metric"><strong>${measurements}</strong><span>Measurements</span></div>
    <div class="metric"><strong>${photos}</strong><span>Photos</span></div>
    <div class="metric"><strong>${currentAudit.utility?.months?.length||0}</strong><span>Utility Months</span></div>
    <div class="metric"><strong>${currentAudit.ecms.length}</strong><span>ECMs</span></div>`;
}

function collectIntegrityWarnings(){
  const warnings=[];
  const normalizedIds=currentAudit.equipment.map(eq=>String(eq.equipmentId||"").trim().toLowerCase()).filter(Boolean);
  const duplicateIds=[...new Set(normalizedIds.filter((id,index)=>normalizedIds.indexOf(id)!==index))];
  if(duplicateIds.length) warnings.push(`Duplicate equipment IDs: ${duplicateIds.join(", ")}`);
  currentAudit.ecms.forEach(ecm=>{
    const missing=(ecm.affectedEquipmentRecordIds||[]).filter(id=>!currentAudit.equipment.some(eq=>eq.recordId===id));
    if(missing.length) warnings.push(`${ecm.ecmId}: ${missing.length} unresolved equipment relationship(s)`);
  });
  const missingPhotos=[];
  currentAudit.equipment.forEach(eq=>(eq.photos||[]).forEach(photo=>{
    if(!photo.dataUrl&&!availablePhotoIds.has(photo.photoId)) missingPhotos.push(photo.photoId);
  }));
  if(missingPhotos.length) warnings.push(`${missingPhotos.length} photo record(s) have no stored image blob`);
  return {warnings,missingPhotoIds:missingPhotos};
}

async function exportAudit(){
  if(!await saveCurrent()) return;
  const safe=(currentAudit.site?.facilityName||"energy-audit").replace(/[^a-z0-9]+/gi,"_");
  const exportCopy=structuredClone(currentAudit);
  const integrity=collectIntegrityWarnings();
  exportCopy.exportIntegrity={
    generatedAt:nowISO(),
    photoBlobsIncluded:false,
    warning:"This JSON contains photo metadata but does not include photos stored as IndexedDB blobs.",
    warnings:integrity.warnings,
    missingPhotoIds:integrity.missingPhotoIds
  };
  if(integrity.warnings.length&&!confirm(`Export integrity found ${integrity.warnings.length} warning(s). Export anyway?`)) return;
  const blob=new Blob([JSON.stringify(exportCopy,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`${safe}_${currentAudit.site?.auditDate||new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportMigrationBackup(){
  if(!currentMigrationBackup?.audit){ alert("No migration backup is available for this audit."); return; }
  const safe=(currentMigrationBackup.audit.site?.facilityName||"energy-audit").replace(/[^a-z0-9]+/gi,"_");
  const blob=new Blob([JSON.stringify(currentMigrationBackup.audit,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`${safe}_pre-migration-backup_${currentMigrationBackup.createdAt.slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function deleteCurrentAudit(){
  if(!confirm("Delete this entire audit from this device? Export first if you need a backup.")) return;
  await dbDeleteAudit(currentAudit.auditId);
  await showDashboard();
}
async function copyPrompt(){
  const prompt=`Act as a senior energy engineer performing an ASHRAE Level 2 analysis. Review the attached Audist V3.1 JSON. Perform a data-quality review first. Respect provenance tags and do not invent equipment specifications, measurements, schedules, utility rates, costs, or savings. Identify missing information required for defensible calculations. Then organize systems, evaluate ECMs, and calculate savings only where the supplied data supports the calculation.`;
  try{ await navigator.clipboard.writeText(prompt); alert("AI analysis prompt copied."); }catch{ alert(prompt); }
}

document.querySelectorAll("[data-site]").forEach(el=>el.addEventListener("input",siteInputChanged));
["electric-rate","demand-rate","gas-rate","utility-notes"].forEach(id=>$(id).addEventListener("input",utilityHeaderChanged));

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  activeType=b.dataset.type;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
  render();
}));

$("new-audit-btn").onclick=createAudit;
$("home-btn").onclick=async()=>{ await flushPendingSave(); showDashboard(); };
$("add-equipment-btn").onclick=openNewEquipment;
$("save-equipment").textContent="Done";
$("save-equipment").onclick=finishEquipment;
$("cancel-equipment").onclick=async()=>{ await flushPendingSave(); $("equipment-dialog").close(); render(); };
$("close-equipment").onclick=async()=>{ await flushPendingSave(); $("equipment-dialog").close(); render(); };
$("equipmentNotes").addEventListener("input",syncEquipmentNotes);
$("equipmentFlags").addEventListener("input",syncEquipmentNotes);

$("add-measurement-btn").onclick=openMeasurement;
$("save-measurement").onclick=saveMeasurement;
$("cancel-measurement").onclick=()=>$("measurement-dialog").close();
$("close-measurement").onclick=()=>$("measurement-dialog").close();

$("photo-input").addEventListener("change",e=>handlePhoto(e.target.files?.[0]));

$("add-utility-btn").onclick=openUtility;
$("save-utility").onclick=saveUtilityMonth;
$("cancel-utility").onclick=()=>$("utility-dialog").close();
$("close-utility").onclick=()=>$("utility-dialog").close();

$("add-ecm-btn").onclick=()=>openEcm(null);
$("ecm-template").addEventListener("change",updateEcmTemplateInfo);
$("ecmEquipment").addEventListener("change",updateEcmTemplateInfo);
$("save-ecm").onclick=saveEcm;
$("cancel-ecm").onclick=()=>$("ecm-dialog").close();
$("close-ecm").onclick=()=>$("ecm-dialog").close();

$("export-btn").onclick=exportAudit;
$("export-migration-backup-btn").onclick=exportMigrationBackup;
$("delete-audit-btn").onclick=deleteCurrentAudit;
$("copy-prompt-btn").onclick=copyPrompt;

showDashboard();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(console.error); }

