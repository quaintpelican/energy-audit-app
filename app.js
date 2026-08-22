const KEY = "fieldEnergyAudit.v1";
let audit = loadAudit();
let activeType = "HVAC";

const $ = id => document.getElementById(id);
const nowISO = () => new Date().toISOString();

function emptyAudit(){
  return {
    schemaVersion: "1.0",
    auditId: crypto.randomUUID(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    site: {},
    equipment: [],
    ecms: [],
    metadata: {
      app: "Field Energy Audit",
      intendedStandard: "ASHRAE Level 2 support",
      valueTypes: ["measured","calculated","assumed","estimated"]
    }
  };
}
function loadAudit(){
  try { return JSON.parse(localStorage.getItem(KEY)) || emptyAudit(); }
  catch { return emptyAudit(); }
}
function saveAudit(){
  audit.updatedAt = nowISO();
  localStorage.setItem(KEY, JSON.stringify(audit));
  render();
}
function newAudit(){
  if(confirm("Start a new audit? This replaces the current local audit. Export first if you need a backup.")){
    audit = emptyAudit(); saveAudit(); populateSite();
  }
}
function populateSite(){
  const s = audit.site || {};
  ["facilityName","address","facilityType","area","hoursWeek","auditDate","siteNotes"].forEach(k => $(k).value = s[k] || "");
}
function saveSite(){
  audit.site = Object.fromEntries(["facilityName","address","facilityType","area","hoursWeek","auditDate","siteNotes"].map(k=>[k,$(k).value]));
  saveAudit();
}

const schemas = {
  HVAC: [
    ["equipmentId","Equipment ID","AHU-1"],
    ["equipmentSubtype","Type","RTU / AHU / Split / Boiler / Chiller"],
    ["manufacturer","Manufacturer",""],
    ["model","Model",""],
    ["serial","Serial",""],
    ["capacity","Cooling / Heating Capacity",""],
    ["efficiency","Efficiency (EER/SEER/COP/AFUE)",""],
    ["fanHp","Fan/Motor HP",""],
    ["vfd","VFD?","Yes / No"],
    ["schedule","Operating Schedule",""],
    ["supplyTemp","Supply Air Temp °F",""],
    ["returnTemp","Return Air Temp °F",""],
    ["staticPressure","Static Pressure in. w.c.",""],
    ["controls","Controls / Sequence",""]
  ],
  Lighting: [
    ["equipmentId","Area / Fixture ID","LTG-1"],
    ["equipmentSubtype","Fixture Type","2x4 troffer / high bay / exterior"],
    ["quantity","Quantity",""],
    ["existingWatts","Existing Watts / Fixture",""],
    ["lampType","Lamp / Technology","T8 / T12 / LED / HID"],
    ["hoursAnnual","Annual Operating Hours",""],
    ["controls","Controls","Switch / occupancy / daylight"],
    ["lightLevel","Measured Light Level","fc or lux"]
  ],
  DHW: [
    ["equipmentId","Equipment ID","DHW-1"],
    ["equipmentSubtype","Type","Storage / tankless / HPWH / boiler"],
    ["manufacturer","Manufacturer",""],
    ["model","Model",""],
    ["fuel","Fuel","Natural Gas / Electric"],
    ["input","Input Capacity","kBtu/h or kW"],
    ["storage","Storage Volume","gal"],
    ["efficiency","Efficiency / UEF",""],
    ["setpoint","Setpoint °F",""],
    ["recirc","Recirculation?","Yes / No"],
    ["schedule","Operating Schedule",""]
  ]
};

function renderEquipmentFields(type){
  $("equipment-fields").innerHTML = schemas[type].map(([id,label,ph]) => `
    <label>${label}<input id="f_${id}" placeholder="${ph}"></label>
  `).join("");
}
function openEquipment(){
  $("equipmentType").value = activeType;
  $("equipment-dialog-title").textContent = `Add ${activeType} Equipment`;
  renderEquipmentFields(activeType);
  $("equipmentNotes").value = "";
  $("equipmentFlags").value = "";
  $("equipment-dialog").showModal();
}
function closeEquipment(){ $("equipment-dialog").close(); }
function saveEquipment(){
  const type = $("equipmentType").value;
  const fields = {};
  for(const [id] of schemas[type]) fields[id] = $(`f_${id}`).value;
  if(!fields.equipmentId){ alert("Equipment ID is required."); return; }
  audit.equipment.push({
    recordId: crypto.randomUUID(),
    systemType: type,
    ...fields,
    notes: $("equipmentNotes").value,
    potentialEcmFlags: $("equipmentFlags").value.split(",").map(x=>x.trim()).filter(Boolean),
    photos: [],
    measurements: [],
    createdAt: nowISO()
  });
  saveAudit(); closeEquipment();
}
function deleteEquipment(id){
  audit.equipment = audit.equipment.filter(x=>x.recordId!==id);
  saveAudit();
}

function openEcm(){ $("ecm-form").reset(); $("ecm-dialog").showModal(); }
function saveEcm(){
  if(!$("ecmTitle").value){ alert("ECM title is required."); return; }
  audit.ecms.push({
    ecmId: `ECM-${String(audit.ecms.length+1).padStart(2,"0")}`,
    title: $("ecmTitle").value,
    category: $("ecmCategory").value,
    affectedEquipmentIds: $("ecmEquipment").value.split(",").map(x=>x.trim()).filter(Boolean),
    existingCondition: $("ecmExisting").value,
    proposedImprovement: $("ecmProposed").value,
    missingData: $("ecmMissing").value,
    confidence: $("ecmConfidence").value,
    savings: { electricKwh:null, demandKw:null, therms:null, cost:null, method:null },
    implementationCost: null,
    simplePaybackYears: null,
    createdAt: nowISO()
  });
  saveAudit(); $("ecm-dialog").close();
}
function deleteEcm(id){
  audit.ecms = audit.ecms.filter(x=>x.ecmId!==id); saveAudit();
}

function render(){
  $("audit-status").textContent = audit.site?.facilityName ? `${audit.site.facilityName} • saved locally` : "New audit • saved locally";
  const filtered = audit.equipment.filter(x=>x.systemType===activeType);
  $("equipment-list").innerHTML = filtered.length ? filtered.map(x=>`
    <div class="item">
      <div class="row"><div><strong>${escapeHtml(x.equipmentId)}</strong><small>${escapeHtml(x.equipmentSubtype || x.systemType)}</small></div>
      <button class="secondary" onclick="deleteEquipment('${x.recordId}')">Delete</button></div>
      ${x.notes ? `<p>${escapeHtml(x.notes)}</p>` : ""}
    </div>`).join("") : `<p class="muted">No ${activeType} equipment added yet.</p>`;
  $("equipment-count").textContent = `${audit.equipment.length} items`;
  $("add-equipment-btn").textContent = `+ Add ${activeType} Equipment`;

  $("ecm-list").innerHTML = audit.ecms.length ? audit.ecms.map(x=>`
    <div class="item"><div class="row"><div><strong>${x.ecmId}: ${escapeHtml(x.title)}</strong><small>${x.category} • ${x.confidence} confidence</small></div>
    <button class="secondary" onclick="deleteEcm('${x.ecmId}')">Delete</button></div>
    ${x.missingData ? `<p><small>Missing: ${escapeHtml(x.missingData)}</small></p>` : ""}
    </div>`).join("") : `<p class="muted">No ECMs added yet.</p>`;
  $("ecm-count").textContent = `${audit.ecms.length} ECMs`;
}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function exportAudit(){
  const filename = `${(audit.site?.facilityName || "energy-audit").replace(/[^a-z0-9]+/gi,"_")}_${audit.site?.auditDate || new Date().toISOString().slice(0,10)}.json`;
  const blob = new Blob([JSON.stringify(audit,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
async function copyPrompt(){
  const prompt = `Act as a senior energy engineer performing an ASHRAE Level 2 analysis. Review the attached audit JSON. First perform a data-quality review and identify missing information required for defensible calculations. Then organize the facility systems, identify and prioritize ECMs, and calculate savings only where the supplied data supports the calculation. Clearly label every input as measured, calculated, assumed, or estimated. For each ECM provide baseline, proposed condition, calculation methodology, annual kWh/kW/therm savings, annual cost savings, implementation-cost assumptions, simple payback, major risks, and additional field data needed. Do not invent equipment specifications. Conclude with a draft report outline and a table of recommended ECMs.`;
  try{ await navigator.clipboard.writeText(prompt); alert("AI analysis prompt copied."); }
  catch{ alert(prompt); }
}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  activeType=b.dataset.type;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
  render();
}));
$("new-audit-btn").onclick=newAudit;
$("save-site-btn").onclick=saveSite;
$("add-equipment-btn").onclick=openEquipment;
$("save-equipment").onclick=saveEquipment;
$("cancel-equipment").onclick=closeEquipment;
$("add-ecm-btn").onclick=openEcm;
$("save-ecm").onclick=saveEcm;
$("cancel-ecm").onclick=()=>$("ecm-dialog").close();
$("export-btn").onclick=exportAudit;
$("copy-prompt-btn").onclick=copyPrompt;

populateSite(); render();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
