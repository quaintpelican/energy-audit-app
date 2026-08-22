let currentAudit = null;
let activeType = "HVAC";
let draftEquipment = null;
let saveTimer = null;

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

function blankAudit(){
  return {
    schemaVersion:"2.0", auditId:uid(), createdAt:nowISO(), updatedAt:nowISO(),
    status:"Draft", site:{auditDate:new Date().toISOString().slice(0,10)}, equipment:[], ecms:[],
    metadata:{app:"Field Energy Audit", storage:"IndexedDB", intendedStandard:"ASHRAE Level 2 support"}
  };
}
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }

async function showDashboard(){
  currentAudit=null;
  $("dashboard-view").classList.remove("hidden");
  $("audit-view").classList.add("hidden");
  $("home-btn").style.visibility="hidden";
  $("header-status").textContent="V2 • Offline-first";
  const audits=await dbGetAll();
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
  const a=blankAudit(); await dbPut(a); await openAudit(a.auditId);
}
async function openAudit(id){
  currentAudit=await dbGet(id);
  $("dashboard-view").classList.add("hidden");
  $("audit-view").classList.remove("hidden");
  $("home-btn").style.visibility="visible";
  populateSite();
  render();
}
function populateSite(){
  document.querySelectorAll("[data-site]").forEach(el=>el.value=currentAudit.site?.[el.dataset.site] || "");
}
function markPending(){
  $("save-status").textContent="Saving locally…";
  $("save-status").className="save-status pending";
}
function markSaved(){
  $("save-status").textContent=`Saved locally • ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  $("save-status").className="save-status";
}
function markError(){
  $("save-status").textContent="Save failed — export before closing";
  $("save-status").className="save-status error";
}
function queueSave(){
  if(!currentAudit) return;
  markPending();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveCurrent,350);
}
async function saveCurrent(){
  try{
    currentAudit.updatedAt=nowISO();
    await dbPut(currentAudit);
    markSaved();
  }catch(e){ console.error(e); markError(); }
}
function siteInputChanged(e){
  currentAudit.site[e.target.dataset.site]=e.target.value;
  if(e.target.dataset.site==="facilityName") $("audit-title").textContent=e.target.value || "Untitled Audit";
  queueSave();
}

function renderEquipmentFields(type, values={}){
  $("equipment-fields").innerHTML=schemas[type].map(([id,label,ph])=>`
    <label>${label}<input id="f_${id}" placeholder="${ph}" value="${escapeHtml(values[id]||"")}"></label>`).join("");
}
function openNewEquipment(){
  draftEquipment={recordId:uid(),systemType:activeType,measurements:[],photos:[],potentialEcmFlags:[],createdAt:nowISO()};
  $("equipment-record-id").value=draftEquipment.recordId;
  $("equipment-dialog-title").textContent=`Add ${activeType} Equipment`;
  renderEquipmentFields(activeType);
  $("equipmentNotes").value="";
  $("equipmentFlags").value="";
  renderDraftMeasurements(); renderDraftPhotos();
  $("equipment-dialog").showModal();
}
function editEquipment(id){
  const existing=currentAudit.equipment.find(x=>x.recordId===id);
  draftEquipment=structuredClone(existing);
  activeType=existing.systemType;
  $("equipment-record-id").value=id;
  $("equipment-dialog-title").textContent=`Edit ${activeType} Equipment`;
  renderEquipmentFields(activeType,existing);
  $("equipmentNotes").value=existing.notes||"";
  $("equipmentFlags").value=(existing.potentialEcmFlags||[]).join(", ");
  renderDraftMeasurements(); renderDraftPhotos();
  $("equipment-dialog").showModal();
}
async function saveEquipment(){
  const type=draftEquipment.systemType;
  for(const [id] of schemas[type]) draftEquipment[id]=$(`f_${id}`).value;
  if(!draftEquipment.equipmentId){ alert("Equipment ID is required."); return; }
  draftEquipment.notes=$("equipmentNotes").value;
  draftEquipment.potentialEcmFlags=$("equipmentFlags").value.split(",").map(x=>x.trim()).filter(Boolean);
  draftEquipment.updatedAt=nowISO();
  const i=currentAudit.equipment.findIndex(x=>x.recordId===draftEquipment.recordId);
  if(i>=0) currentAudit.equipment[i]=draftEquipment; else currentAudit.equipment.push(draftEquipment);
  await saveCurrent(); $("equipment-dialog").close(); render();
}
async function deleteEquipment(id){
  if(!confirm("Delete this equipment record?")) return;
  currentAudit.equipment=currentAudit.equipment.filter(x=>x.recordId!==id); await saveCurrent(); render();
}

function openMeasurement(){
  ["mParameter","mValue","mUnit","mMethod","mNotes"].forEach(id=>$(id).value="");
  $("mSource").value="Measured"; $("measurement-dialog").showModal();
}
function saveMeasurement(){
  if(!$("mParameter").value){ alert("Parameter is required."); return; }
  draftEquipment.measurements.push({
    measurementId:uid(), parameter:$("mParameter").value, value:$("mValue").value,
    unit:$("mUnit").value, source:$("mSource").value, method:$("mMethod").value,
    notes:$("mNotes").value, capturedAt:nowISO()
  });
  $("measurement-dialog").close(); renderDraftMeasurements();
}
function deleteMeasurement(id){
  draftEquipment.measurements=draftEquipment.measurements.filter(x=>x.measurementId!==id); renderDraftMeasurements();
}
function renderDraftMeasurements(){
  $("measurement-list").innerHTML=(draftEquipment?.measurements||[]).length ? draftEquipment.measurements.map(m=>`
    <div class="item"><div class="row"><div><strong>${escapeHtml(m.parameter)}</strong><small>${escapeHtml(m.value)} ${escapeHtml(m.unit)} • ${escapeHtml(m.source)}</small></div>
    <button class="secondary small" onclick="deleteMeasurement('${m.measurementId}')">Delete</button></div></div>`).join("") : `<p class="muted">No measurements yet.</p>`;
}

async function compressImage(file, maxDimension=1600, quality=0.78){
  const sourceUrl = URL.createObjectURL(file);
  try{
    const img = await new Promise((resolve,reject)=>{
      const i = new Image();
      i.onload = ()=>resolve(i);
      i.onerror = reject;
      i.src = sourceUrl;
    });

    let {width, height} = img;
    const scale = Math.min(1, maxDimension / Math.max(width,height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>{
        if(!blob) return reject(new Error("Image compression failed"));
        const reader = new FileReader();
        reader.onload = ()=>resolve({
          dataUrl: reader.result,
          width,
          height,
          compressedBytes: blob.size
        });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, "image/jpeg", quality);
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function handlePhoto(file){
  if(!file || !draftEquipment) return;
  try{
    const compressed = await compressImage(file);
    const category = $("photo-category").value || "Other";
    const note = $("photo-note").value.trim();
    const equipmentId = ($("f_equipmentId")?.value || draftEquipment.equipmentId || "Equipment").trim();
    const safeCategory = category.replace(/[^a-z0-9]+/gi,"_");
    const sequence = String((draftEquipment.photos?.length || 0) + 1).padStart(2,"0");
    const generatedName = `${equipmentId}_${safeCategory}_${sequence}.jpg`;

    draftEquipment.photos.push({
      photoId:uid(),
      name:generatedName,
      category,
      note,
      dataUrl:compressed.dataUrl,
      capturedAt:nowISO(),
      width:compressed.width,
      height:compressed.height,
      originalBytes:file.size,
      compressedBytes:compressed.compressedBytes
    });

    $("photo-note").value="";
    renderDraftPhotos();
  } catch(err){
    console.error(err);
    alert("Photo could not be processed. Please try another image.");
  } finally {
    $("photo-input").value="";
  }
}
function deletePhoto(id){ draftEquipment.photos=draftEquipment.photos.filter(x=>x.photoId!==id); renderDraftPhotos(); }
function renderDraftPhotos(){
  $("photo-list").innerHTML=(draftEquipment?.photos||[]).map(p=>{
    const kb = p.compressedBytes ? Math.round(p.compressedBytes/1024) : null;
    return `
    <div class="photo-card">
      <img src="${p.dataUrl}" alt="${escapeHtml(p.name)}">
      <button onclick="deletePhoto('${p.photoId}')">✕</button>
      <div class="photo-meta"><strong>${escapeHtml(p.category || "Field Photo")}</strong>${p.note ? `<br>${escapeHtml(p.note)}` : ""}${kb ? `<br>${kb} KB` : ""}</div>
    </div>`;
  }).join("");
}

function openEcm(){
  ["ecmTitle","ecmEquipment","ecmExisting","ecmProposed","ecmMissing"].forEach(id=>$(id).value="");
  $("ecmCategory").value="HVAC"; $("ecmConfidence").value="Medium"; $("ecm-dialog").showModal();
}
async function saveEcm(){
  if(!$("ecmTitle").value){ alert("ECM title is required."); return; }
  currentAudit.ecms.push({
    ecmId:`ECM-${String(currentAudit.ecms.length+1).padStart(2,"0")}`, title:$("ecmTitle").value,
    category:$("ecmCategory").value, affectedEquipmentIds:$("ecmEquipment").value.split(",").map(x=>x.trim()).filter(Boolean),
    existingCondition:$("ecmExisting").value, proposedImprovement:$("ecmProposed").value,
    missingData:$("ecmMissing").value, confidence:$("ecmConfidence").value,
    savings:{electricKwh:null,demandKw:null,therms:null,cost:null,method:null}, implementationCost:null,
    simplePaybackYears:null, createdAt:nowISO()
  });
  await saveCurrent(); $("ecm-dialog").close(); render();
}
async function deleteEcm(id){
  if(!confirm("Delete this ECM?")) return;
  currentAudit.ecms=currentAudit.ecms.filter(x=>x.ecmId!==id); await saveCurrent(); render();
}

function render(){
  if(!currentAudit) return;
  $("audit-title").textContent=currentAudit.site?.facilityName || "Untitled Audit";
  $("header-status").textContent=currentAudit.site?.facilityName || "Active audit";
  const filtered=currentAudit.equipment.filter(x=>x.systemType===activeType);
  $("equipment-list").innerHTML=filtered.length ? filtered.map(x=>`
    <div class="item">
      <div class="row">
        <div onclick="editEquipment('${x.recordId}')" style="flex:1;cursor:pointer">
          <strong>${escapeHtml(x.equipmentId)}</strong>
          <small>${escapeHtml(x.equipmentSubtype||x.systemType)} • ${(x.measurements||[]).length} measurements • ${(x.photos||[]).length} photos</small>
        </div>
        <button class="secondary small" onclick="deleteEquipment('${x.recordId}')">Delete</button>
      </div>
    </div>`).join("") : `<p class="muted">No ${activeType} equipment added yet.</p>`;
  $("equipment-count").textContent=`${currentAudit.equipment.length} items`;
  $("add-equipment-btn").textContent=`+ Add ${activeType} Equipment`;

  $("ecm-list").innerHTML=currentAudit.ecms.length ? currentAudit.ecms.map(x=>`
    <div class="item"><div class="row"><div><strong>${x.ecmId}: ${escapeHtml(x.title)}</strong><small>${escapeHtml(x.category)} • ${escapeHtml(x.confidence)} confidence</small></div>
    <button class="secondary small" onclick="deleteEcm('${x.ecmId}')">Delete</button></div></div>`).join("") : `<p class="muted">No ECMs added yet.</p>`;
  $("ecm-count").textContent=`${currentAudit.ecms.length} ECMs`;

  const measurements=currentAudit.equipment.reduce((n,x)=>n+(x.measurements?.length||0),0);
  const photos=currentAudit.equipment.reduce((n,x)=>n+(x.photos?.length||0),0);
  $("review-summary").innerHTML=`
    <div class="metric"><strong>${currentAudit.equipment.length}</strong><span>Equipment</span></div>
    <div class="metric"><strong>${measurements}</strong><span>Measurements</span></div>
    <div class="metric"><strong>${photos}</strong><span>Photos</span></div>
    <div class="metric"><strong>${currentAudit.ecms.length}</strong><span>ECMs</span></div>`;
}
async function exportAudit(){
  await saveCurrent();
  const safe=(currentAudit.site?.facilityName||"energy-audit").replace(/[^a-z0-9]+/gi,"_");
  const blob=new Blob([JSON.stringify(currentAudit,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=`${safe}_${currentAudit.site?.auditDate||new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}
async function deleteCurrentAudit(){
  if(!confirm("Delete this entire audit from this device? Export first if you need a backup.")) return;
  await dbDelete(currentAudit.auditId); await showDashboard();
}
async function copyPrompt(){
  const prompt=`Act as a senior energy engineer performing an ASHRAE Level 2 analysis. Review the attached Field Energy Audit V2.1 JSON, including categorized equipment photos where present. First perform a data-quality review and identify missing information required for defensible calculations. Treat each input according to its source tag (Measured, Nameplate, Estimated, Assumed, Calculated). Do not invent equipment specifications. Then organize the facility systems, identify and prioritize ECMs, and calculate savings only where the supplied data supports the calculation. For each ECM provide baseline, proposed condition, calculation methodology, annual kWh/kW/therm savings, annual cost savings, implementation-cost assumptions, simple payback, major risks, and additional field data needed. Conclude with a draft ASHRAE Level 2 report outline and recommended ECM table.`;
  try{ await navigator.clipboard.writeText(prompt); alert("AI analysis prompt copied."); }catch{ alert(prompt); }
}

document.querySelectorAll("[data-site]").forEach(el=>el.addEventListener("input",siteInputChanged));
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  activeType=b.dataset.type; document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b)); render();
}));
$("new-audit-btn").onclick=createAudit;
$("home-btn").onclick=showDashboard;
$("add-equipment-btn").onclick=openNewEquipment;
$("save-equipment").onclick=saveEquipment;
$("cancel-equipment").onclick=()=>$("equipment-dialog").close();
$("close-equipment").onclick=()=>$("equipment-dialog").close();
$("add-measurement-btn").onclick=openMeasurement;
$("save-measurement").onclick=saveMeasurement;
$("cancel-measurement").onclick=()=>$("measurement-dialog").close();
$("close-measurement").onclick=()=>$("measurement-dialog").close();
$("photo-input").addEventListener("change",e=>handlePhoto(e.target.files?.[0]));
$("add-ecm-btn").onclick=openEcm;
$("save-ecm").onclick=saveEcm;
$("cancel-ecm").onclick=()=>$("ecm-dialog").close();
$("close-ecm").onclick=()=>$("ecm-dialog").close();
$("export-btn").onclick=exportAudit;
$("delete-audit-btn").onclick=deleteCurrentAudit;
$("copy-prompt-btn").onclick=copyPrompt;

showDashboard();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(console.error); }
