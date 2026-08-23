const APP_VERSION = "3.2";
const SCHEMA_VERSION = 4;

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

const SYSTEM_TYPES = [
  ["PackagedHVAC","Packaged HVAC","RTU"],["AirHandling","Air Handling / Ventilation","AHU"],
  ["ChilledWater","Chilled Water","CHWS"],["BoilersHeatingWater","Boilers / Heating Water","HHWS"],
  ["Steam","Steam","STM"],["Pumps","Pumps","PUMP"],["Fans","Fans","FAN"],
  ["MotorsDrives","Motors / Drives","MTR"],["CoolingTowers","Cooling Towers","CT"],
  ["BASControls","BAS / Controls","BAS"],["Lighting","Lighting","LTG"],
  ["DHW","Domestic Hot Water","DHW"],["Refrigeration","Refrigeration","REF"],
  ["CompressedAir","Compressed Air","CA"],["ProcessLoads","Process Loads","PROC"],
  ["PlugLoads","Plug / Miscellaneous Loads","PLUG"],["Envelope","Building Envelope","ENV"],
  ["SolarPV","Solar PV","PV"],["EnergyStorage","Energy Storage","ESS"],["Other","Other","OTH"]
];
const SYSTEM_LABELS=Object.fromEntries(SYSTEM_TYPES.map(([key,label])=>[key,label]));
const SYSTEM_PREFIXES=Object.fromEntries(SYSTEM_TYPES.map(([key,,prefix])=>[key,prefix]));

const COMMON_EQUIPMENT_FIELDS = [
  ["equipmentId","Equipment ID",""],["equipmentSubtype","Equipment Type",""],
  ["manufacturer","Manufacturer",""],["model","Model",""],["serial","Serial",""]
];
const schemas = {
  PackagedHVAC:[...COMMON_EQUIPMENT_FIELDS,["capacity","Cooling / Heating Capacity",""],["efficiency","Efficiency (EER/SEER/COP)",""],["refrigerant","Refrigerant",""],["fanHp","Fan / Motor HP",""],["vfd","VFD / Starter",""],["schedule","Operating Schedule",""],["controls","Controls / Sequence",""]],
  AirHandling:[...COMMON_EQUIPMENT_FIELDS,["airflow","Design Airflow","cfm"],["fanHp","Fan / Motor HP",""],["motorEfficiency","Motor Efficiency","%"],["vfd","VFD / Starter",""],["staticPressureSetpoint","Static Pressure Setpoint","in. w.c."],["schedule","Operating Schedule",""],["controls","Controls / Resets / Staging",""]],
  ChilledWater:[...COMMON_EQUIPMENT_FIELDS,["compressorType","Compressor Type",""],["refrigerant","Refrigerant",""],["nominalTons","Nominal Capacity","tons"],["fullLoadEfficiency","Full-load Efficiency","kW/ton or COP"],["iplv","IPLV / NPLV (if available)",""],["chwEnteringTemp","CHW Design Entering Temp","°F"],["chwLeavingTemp","CHW Design Leaving Temp","°F"],["condenserType","Condenser Type","Air / Water"],["schedule","Operating Schedule",""],["controls","Controls / Staging",""]],
  BoilersHeatingWater:[...COMMON_EQUIPMENT_FIELDS,["fuel","Fuel",""],["inputCapacity","Input Capacity",""],["outputCapacity","Output Capacity",""],["efficiency","Efficiency","% or AFUE"],["designSupplyTemp","Design Supply Temp","°F"],["designReturnTemp","Design Return Temp","°F"],["burnerType","Burner Type",""],["condensing","Condensing?","Yes / No"],["turndown","Turndown (if available)",""],["schedule","Operating Schedule",""],["controls","Controls / Staging",""]],
  Steam:[...COMMON_EQUIPMENT_FIELDS,["fuel","Fuel",""],["inputCapacity","Input Capacity",""],["steamPressure","Steam Pressure","psig"],["efficiency","Efficiency","%"],["schedule","Operating Schedule",""],["controls","Controls",""]],
  Pumps:[...COMMON_EQUIPMENT_FIELDS,["service","Service","CHW / HHW / condenser / domestic / process"],["designFlow","Design Flow","gpm"],["designHead","Design Head","ft"],["motorHp","Motor HP",""],["motorEfficiency","Motor Efficiency","%"],["vfd","VFD Status",""],["controlMethod","Control Method",""],["schedule","Operating Schedule",""]],
  Fans:[...COMMON_EQUIPMENT_FIELDS,["service","Fan Service","Supply / Return / Exhaust / Relief"],["designAirflow","Design Airflow","cfm"],["motorHp","Motor HP",""],["motorEfficiency","Motor Efficiency","%"],["vfd","VFD Status",""],["controlMethod","Control Method",""],["schedule","Operating Schedule",""]],
  MotorsDrives:[...COMMON_EQUIPMENT_FIELDS,["ratedHp","Rated HP",""],["motorEfficiency","Motor Efficiency","%"],["voltage","Voltage","V"],["driveType","Drive / Starter Type",""],["service","Driven Equipment / Service",""],["schedule","Operating Schedule",""]],
  CoolingTowers:[...COMMON_EQUIPMENT_FIELDS,["towerType","Tower Type","Open / Closed circuit"],["cells","Number of Cells",""],["fanHp","Fan HP",""],["vfd","VFD Status",""],["designFlow","Design Flow","gpm"],["approachRange","Approach / Range (if available)","°F"],["controls","Controls / Staging",""]],
  BASControls:[...COMMON_EQUIPMENT_FIELDS,["controlLevel","Control Level","Building / system / zone"],["networkProtocol","Protocol","BACnet / proprietary"],["pointsSummary","Points / Sensors Summary",""],["schedule","Occupancy / HVAC Schedule",""],["controls","Sequence / Reset Strategy",""],
    ["temperatureSetpoints","Temperature Setpoints",""],["setupSetback","Setup / Setback",""],["optimumStartStop","Optimum Start / Stop",""],["economizerStrategy","Economizer Strategy",""],["satReset","Supply-Air-Temperature Reset",""],["staticPressureReset","Static-Pressure Reset",""],["chwReset","Chilled-Water Reset",""],["hhwReset","Heating-Water Reset",""],["pumpDpReset","Pump Differential-Pressure Reset",""],["dcv","Demand-Control Ventilation",""],["simultaneousHeatingCooling","Simultaneous Heating / Cooling Observation",""],["equipmentStaging","Equipment Staging",""]],
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
  ],
  Refrigeration:[...COMMON_EQUIPMENT_FIELDS,["refrigerationType","Type","Walk-in / reach-in / rack / condenser / evaporator"],["refrigerant","Refrigerant",""],["capacity","Capacity",""],["temperatureSetpoint","Temperature Setpoint","°F"],["compressorControls","Compressor Controls",""],["schedule","Operating Schedule",""]],
  CompressedAir:[...COMMON_EQUIPMENT_FIELDS,["compressorType","Compressor Type","Rotary screw / reciprocating / centrifugal"],["ratedHp","Rated HP",""],["ratedCfm","Rated CFM",""],["pressureSetpoint","Pressure Setpoint","psig"],["controls","Controls / Sequencing",""],["dryerType","Dryer Type",""],["schedule","Operating Schedule",""]],
  ProcessLoads:[...COMMON_EQUIPMENT_FIELDS,["process","Process / Service",""],["ratedPower","Rated Power","kW or HP"],["loadProfile","Load Profile",""],["schedule","Operating Schedule",""]],
  PlugLoads:[...COMMON_EQUIPMENT_FIELDS,["spaceOrProcess","Space / Process",""],["quantity","Quantity",""],["unitPower","Unit Power","W"],["controlMethod","Control Method",""],["schedule","Operating Schedule",""]],
  Envelope:[...COMMON_EQUIPMENT_FIELDS,["assemblyType","Assembly Type","Roof / wall / window / door / skylight / infiltration"],["area","Area","ft²"],["construction","Construction",""],["insulation","Insulation",""],["thermalValue","Known / Estimated R-value or U-value",""],["condition","Condition",""],["orientation","Orientation (where relevant)",""]],
  SolarPV:[...COMMON_EQUIPMENT_FIELDS,["dcCapacity","DC Capacity","kWdc"],["acCapacity","AC Capacity","kWac"],["moduleType","Module Type",""],["inverterType","Inverter Type",""],["commissionedYear","Commissioned Year",""],["controls","Monitoring / Controls",""]],
  EnergyStorage:[...COMMON_EQUIPMENT_FIELDS,["storageType","Storage Type","Battery / thermal"],["energyCapacity","Energy Capacity","kWh or ton-hr"],["powerCapacity","Power Capacity","kW"],["controlStrategy","Control Strategy",""],["schedule","Operating Schedule",""]],
  Other:[...COMMON_EQUIPMENT_FIELDS,["service","Service / Description",""],["ratedPower","Rated Power / Capacity",""],["schedule","Operating Schedule",""],["controls","Controls",""]]
};

const PHOTO_REQUIREMENTS = {
  PackagedHVAC: {required:["Equipment Overview","Nameplate"], recommended:["Controls"]},
  AirHandling: {required:["Equipment Overview","Nameplate"], recommended:["Controls"]},
  ChilledWater:{required:["Equipment Overview","Nameplate"],recommended:["Controls"]},
  BoilersHeatingWater:{required:["Equipment Overview","Nameplate"],recommended:["Burner / Controls"]},
  Steam:{required:["Equipment Overview","Nameplate"],recommended:["Burner / Controls"]},
  Pumps:{required:["Equipment Overview"],recommended:["Motor Nameplate","VFD / Starter"]},
  Fans:{required:["Equipment Overview"],recommended:["Motor Nameplate","VFD / Starter"]},
  MotorsDrives:{required:["Equipment Overview","Nameplate"],recommended:["VFD / Starter"]},
  CoolingTowers:{required:["Equipment Overview"],recommended:["Nameplate","Fan / Drive"]},
  BASControls:{required:[],recommended:["Controls / BAS Screen"]},
  Lighting: {required:["Equipment Overview"], recommended:["Controls"]},
  DHW: {required:["Equipment Overview","Nameplate"], recommended:["Controls"]},
  Refrigeration:{required:["Equipment Overview","Nameplate"],recommended:["Controls"]},
  CompressedAir:{required:["Equipment Overview","Nameplate"],recommended:["Controls"]},
  Envelope:{required:[],recommended:["Condition Photo"]}
};

const MEASUREMENT_PRESETS = {
  PackagedHVAC:[["Supply air temperature","°F"],["Return air temperature","°F"],["Outside air temperature","°F"],["Supply RH","% RH"],["Return RH","% RH"],["Airflow","cfm"],["Static pressure","in. w.c."],["Fan amps","A"],["Fan power","kW"],["VFD speed","Hz"]],
  AirHandling:[["Supply air temperature","°F"],["Return air temperature","°F"],["Outside air temperature","°F"],["Supply RH","% RH"],["Return RH","% RH"],["Airflow","cfm"],["Static pressure","in. w.c."],["Fan amps","A"],["Fan power","kW"],["VFD speed","Hz"]],
  Pumps:[["Suction pressure","psi"],["Discharge pressure","psi"],["Differential pressure","psi"],["Flow","gpm"],["Motor amps","A"],["Voltage","V"],["Power","kW"],["VFD speed","Hz"]],
  ChilledWater:[["CHW entering temperature","°F"],["CHW leaving temperature","°F"],["Condenser entering temperature","°F"],["Condenser leaving temperature","°F"],["Evaporator flow","gpm"],["Condenser flow","gpm"],["Power","kW"],["Cooling load","tons"]],
  BoilersHeatingWater:[["Supply water temperature","°F"],["Return water temperature","°F"],["Stack temperature","°F"],["Flue O2","%"],["Flue CO2","%"],["Firing rate","%"]],
  Steam:[["Steam pressure","psig"],["Stack temperature","°F"],["Flue O2","%"],["Firing rate","%"]],
  CompressedAir:[["Pressure","psig"],["Power","kW"],["Motor amps","A"],["Unloaded time","min"],["Loaded time","min"],["Flow","cfm"]],
  Lighting:[["Light level","fc"],["Measured fixture watts","W"]]
};
const EQUIPMENT_SUBTYPES={
  PackagedHVAC:["RTU","Split system","Heat pump"],AirHandling:["AHU","MAU","DOAS","Exhaust / relief fan"],
  ChilledWater:["Chiller"],BoilersHeatingWater:["Boiler"],Steam:["Steam boiler","Steam equipment"],
  Pumps:["CHW pump","HHW pump","Condenser pump","Domestic pump","Process pump"],Fans:["Supply fan","Return fan","Exhaust fan","Relief fan"],
  MotorsDrives:["Motor","VFD / starter"],CoolingTowers:["Cooling tower"],BASControls:["BAS system","Controller","Thermostat","Sensor","Sequence / reset strategy"],
  Lighting:["Fixture group","Lighting area","Exterior lighting"],DHW:["Storage water heater","Tankless water heater","Heat pump water heater","DHW boiler"],
  Refrigeration:["Walk-in","Reach-in","Compressor rack","Condenser","Evaporator"],CompressedAir:["Compressor","Dryer","Receiver"],
  Envelope:["Roof","Wall","Window","Door","Skylight","Infiltration / air-sealing observation"],ProcessLoads:["Process equipment"],PlugLoads:["Plug load group"],
  SolarPV:["Solar PV array","Inverter"],EnergyStorage:["Battery storage","Thermal storage"],Other:["Other equipment"]
};
PHOTO_REQUIREMENTS.HVAC=PHOTO_REQUIREMENTS.PackagedHVAC;

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
    systems:[],
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

  if(oldVersion < 4){
    migrated.schemaVersion=4;
    migrated.systems=Array.isArray(migrated.systems)?migrated.systems:[];
  }

  migrated.metadata=migrated.metadata||{};
  migrated.metadata.appVersion=APP_VERSION;
  migrated.systems=Array.isArray(migrated.systems)?migrated.systems:[];
  migrated.equipment=migrated.equipment||[];
  migrated.ecms=migrated.ecms||[];
  migrated.calculations=migrated.calculations||[];
  migrated.equipment.forEach(eq=>{
    if(eq.systemType==="HVAC"){ eq.systemType="PackagedHVAC"; changed=true; }
    if(!eq.systemType){ eq.systemType="Other"; changed=true; }
    if(!eq.recordId){ eq.recordId=uid(); changed=true; }
    if(!Array.isArray(eq.measurements)){ eq.measurements=[]; changed=true; }
    if(!Array.isArray(eq.photos)){ eq.photos=[]; changed=true; }
    if(!eq.fieldProvenance||typeof eq.fieldProvenance!=="object"){ eq.fieldProvenance={}; changed=true; }
    if(!eq.status){ eq.status="complete"; changed=true; }
    let system=eq.systemRecordId&&migrated.systems.find(s=>s.systemRecordId===eq.systemRecordId);
    if(!system){
      system=migrated.systems.find(s=>s.systemType===eq.systemType);
      if(!system){
        system={systemRecordId:uid(),systemId:`${SYSTEM_PREFIXES[eq.systemType]||"SYS"}-01`,systemType:eq.systemType||"Other",name:SYSTEM_LABELS[eq.systemType]||eq.systemType||"Other",status:"Present",equipmentRecordIds:[],controlsSummary:"",operatingSchedule:"",notes:"",createdAt:nowISO(),updatedAt:nowISO()};
        migrated.systems.push(system);
      }
      eq.systemRecordId=system.systemRecordId;
      changed=true;
    }
    system.equipmentRecordIds=Array.isArray(system.equipmentRecordIds)?system.equipmentRecordIds:[];
    if(!system.equipmentRecordIds.includes(eq.recordId)){ system.equipmentRecordIds.push(eq.recordId); changed=true; }
  });
  migrated.systems.forEach(system=>{
    if(!system.systemRecordId){ system.systemRecordId=uid(); changed=true; }
    if(!Array.isArray(system.equipmentRecordIds)){ system.equipmentRecordIds=[]; changed=true; }
    const validIds=migrated.equipment.filter(eq=>eq.systemRecordId===system.systemRecordId).map(eq=>eq.recordId);
    if(JSON.stringify(system.equipmentRecordIds)!==JSON.stringify(validIds)){ system.equipmentRecordIds=validIds; changed=true; }
    if(!system.status){ system.status="Present"; changed=true; }
    if(!system.createdAt){ system.createdAt=nowISO(); changed=true; }
    if(!system.updatedAt){ system.updatedAt=system.createdAt; changed=true; }
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
  if(oldVersion < SCHEMA_VERSION){
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
  for(const key of ["systems","equipment","ecms","calculations"]){
    if(!Array.isArray(audit?.[key])) errors.push(`${key} must be an array.`);
  }
  const recordIds=(audit?.equipment||[]).map(eq=>eq.recordId);
  if(recordIds.some(id=>!String(id||"").trim())) errors.push("An equipment record UUID is missing.");
  if(new Set(recordIds).size!==recordIds.length) errors.push("Equipment record UUIDs are not unique.");
  const systemIds=(audit?.systems||[]).map(system=>system.systemRecordId);
  if(systemIds.some(id=>!String(id||"").trim())) errors.push("A system record UUID is missing.");
  if(new Set(systemIds).size!==systemIds.length) errors.push("System record UUIDs are not unique.");
  (audit?.equipment||[]).forEach(eq=>{
    if(eq.systemRecordId&&!systemIds.includes(eq.systemRecordId)) errors.push(`Equipment ${eq.equipmentId||eq.recordId} references a missing system.`);
  });
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

function nextSystemId(type){
  const prefix=SYSTEM_PREFIXES[type]||"SYS";
  let n=1;
  const used=new Set((currentAudit.systems||[]).map(s=>String(s.systemId||"").toLowerCase()));
  while(used.has(`${prefix}-${String(n).padStart(2,"0")}`.toLowerCase())) n++;
  return `${prefix}-${String(n).padStart(2,"0")}`;
}

function renderSystemInventory(){
  currentAudit.systems=Array.isArray(currentAudit.systems)?currentAudit.systems:[];
  const selected=new Set((currentAudit.systems||[]).map(s=>s.systemType));
  $("system-scope").innerHTML=SYSTEM_TYPES.map(([key,label])=>`<label class="scope-option"><input type="checkbox" data-system-scope="${key}" ${selected.has(key)?"checked":""}>${label}</label>`).join("");
  document.querySelectorAll("[data-system-scope]").forEach(el=>el.addEventListener("change",systemScopeChanged));
  $("system-detail-list").innerHTML=(currentAudit.systems||[]).map(system=>`<div class="item"><strong>${escapeHtml(system.systemId)} — ${escapeHtml(system.name||SYSTEM_LABELS[system.systemType])}</strong>
    <div class="system-fields">
      <label>Name<input data-system-record="${system.systemRecordId}" data-system-field="name" value="${escapeHtml(system.name||"")}"></label>
      <label>Status<select data-system-record="${system.systemRecordId}" data-system-field="status"><option ${system.status==="Present"?"selected":""}>Present</option><option ${system.status==="Not Audited"?"selected":""}>Not Audited</option><option ${system.status==="Out of Service"?"selected":""}>Out of Service</option></select></label>
      <label>Operating Schedule<input data-system-record="${system.systemRecordId}" data-system-field="operatingSchedule" value="${escapeHtml(system.operatingSchedule||"")}"></label>
      <label>Controls Summary<input data-system-record="${system.systemRecordId}" data-system-field="controlsSummary" value="${escapeHtml(system.controlsSummary||"")}"></label>
      <label>Notes<input data-system-record="${system.systemRecordId}" data-system-field="notes" value="${escapeHtml(system.notes||"")}"></label>
    </div></div>`).join("");
  document.querySelectorAll("[data-system-field]").forEach(el=>el.addEventListener("input",systemFieldChanged));
  $("system-count").textContent=`${currentAudit.systems.length} present`;
  renderEquipmentTabs();
}

async function systemScopeChanged(e){
  const type=e.target.dataset.systemScope;
  const previousSystems=structuredClone(currentAudit.systems||[]);
  const previousActiveType=activeType;
  if(e.target.checked){
    if(!currentAudit.systems.some(s=>s.systemType===type)) currentAudit.systems.push({systemRecordId:uid(),systemId:nextSystemId(type),systemType:type,name:SYSTEM_LABELS[type],status:"Present",equipmentRecordIds:[],controlsSummary:"",operatingSchedule:"",notes:"",createdAt:nowISO(),updatedAt:nowISO()});
  }else{
    const system=currentAudit.systems.find(s=>s.systemType===type);
    if(system&&(system.equipmentRecordIds||[]).length){ e.target.checked=true; alert("Remove or reassign this system's equipment before marking the system absent."); return; }
    currentAudit.systems=currentAudit.systems.filter(s=>s.systemType!==type);
  }
  if(!currentAudit.systems.some(s=>s.systemType===activeType)) activeType=currentAudit.systems[0]?.systemType||"";
  if(await saveCurrent()) render();
  else{ currentAudit.systems=previousSystems; activeType=previousActiveType; render(); }
}

function systemFieldChanged(e){
  const system=currentAudit.systems.find(s=>s.systemRecordId===e.target.dataset.systemRecord);
  if(!system) return;
  system[e.target.dataset.systemField]=e.target.value;
  system.updatedAt=nowISO();
  queueSave();
}

function renderEquipmentTabs(){
  const systems=currentAudit.systems||[];
  if(!systems.some(s=>s.systemType===activeType)) activeType=systems[0]?.systemType||"";
  $("equipment-tabs").innerHTML=systems.map(system=>`<button class="tab ${system.systemType===activeType?"active":""}" data-type="${system.systemType}">${escapeHtml(SYSTEM_LABELS[system.systemType]||system.name)}</button>`).join("");
  document.querySelectorAll("#equipment-tabs .tab").forEach(button=>button.addEventListener("click",()=>{ activeType=button.dataset.type; render(); }));
}

function nextEquipmentId(type){
  const prefix = SYSTEM_PREFIXES[type]||"EQ";
  let n=1;
  while(currentAudit.equipment.some(eq=>String(eq.equipmentId).toLowerCase()===`${prefix}-${String(n).padStart(2,"0")}`.toLowerCase())) n++;
  return `${prefix}-${String(n).padStart(2,"0")}`;
}

function renderEquipmentFields(type, values={}){
  $("equipment-fields").innerHTML=(schemas[type]||schemas.Other).map(([id,label,ph])=>id==="equipmentSubtype"
    ? `<label>${label}<select data-equipment-field="${id}" id="f_${id}"><option value="">Select...</option>${(EQUIPMENT_SUBTYPES[type]||["Other equipment"]).map(option=>`<option ${values[id]===option?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select></label>`
    : `<label>${label}<input data-equipment-field="${id}" id="f_${id}" placeholder="${ph}" value="${escapeHtml(values[id]||"")}">${id==="equipmentId"?"":`<select data-equipment-provenance="${id}" aria-label="${escapeHtml(label)} provenance"><option value="">Provenance...</option>${["Measured","Nameplate","Estimated","Assumed","Calculated"].map(p=>`<option ${values.fieldProvenance?.[id]===p?"selected":""}>${p}</option>`).join("")}</select>`}</label>`).join("");
  document.querySelectorAll("[data-equipment-field]").forEach(el=>el.addEventListener("input",equipmentFieldChanged));
  document.querySelectorAll("[data-equipment-provenance]").forEach(el=>el.addEventListener("change",equipmentProvenanceChanged));
}
async function openNewEquipment(){
  if(activeType==="HVAC") activeType="PackagedHVAC";
  currentAudit.systems=Array.isArray(currentAudit.systems)?currentAudit.systems:[];
  let system=currentAudit.systems.find(s=>s.systemType===activeType);
  if(!system){
    system={systemRecordId:uid(),systemId:nextSystemId(activeType),systemType:activeType,name:SYSTEM_LABELS[activeType]||activeType,status:"Present",equipmentRecordIds:[],controlsSummary:"",operatingSchedule:"",notes:"",createdAt:nowISO(),updatedAt:nowISO()};
    currentAudit.systems.push(system);
  }
  draftEquipment={
    recordId:uid(),systemRecordId:system.systemRecordId,systemType:activeType,equipmentId:nextEquipmentId(activeType),
    measurements:[],photos:[],fieldProvenance:{},potentialEcmFlags:[],createdAt:nowISO(),updatedAt:nowISO(),status:"in_progress"
  };
  currentAudit.equipment.push(draftEquipment);
  system.equipmentRecordIds.push(draftEquipment.recordId);
  if(!await saveCurrent()){
    currentAudit.equipment=currentAudit.equipment.filter(eq=>eq.recordId!==draftEquipment.recordId);
    system.equipmentRecordIds=system.equipmentRecordIds.filter(id=>id!==draftEquipment.recordId);
    draftEquipment=null;
    alert("Equipment could not be created because local persistence failed. No equipment record was retained.");
    return;
  }
  $("equipment-record-id").value=draftEquipment.recordId;
  $("equipment-dialog-title").textContent=`Add ${SYSTEM_LABELS[activeType]||activeType} Equipment`;
  renderEquipmentFields(activeType,draftEquipment);
  $("equipmentNotes").value="";
  $("equipmentFlags").value="";
  renderDraftMeasurements();
  await renderDraftPhotos();
  $("equipment-dialog").showModal();
}

async function duplicateEquipment(){
  if(!draftEquipment) return;
  const copy=structuredClone(draftEquipment);
  copy.recordId=uid();
  copy.equipmentId=nextEquipmentId(copy.systemType);
  copy.measurements=[];
  copy.photos=[];
  copy.createdAt=nowISO(); copy.updatedAt=copy.createdAt; copy.status="in_progress";
  currentAudit.equipment.push(copy);
  const system=currentAudit.systems.find(s=>s.systemRecordId===copy.systemRecordId);
  if(system) system.equipmentRecordIds.push(copy.recordId);
  if(!await saveCurrent()){
    currentAudit.equipment=currentAudit.equipment.filter(eq=>eq.recordId!==copy.recordId);
    if(system) system.equipmentRecordIds=system.equipmentRecordIds.filter(id=>id!==copy.recordId);
    alert("The duplicate could not be saved and was not retained.");
    return;
  }
  draftEquipment=copy;
  $("equipment-record-id").value=copy.recordId;
  $("equipment-dialog-title").textContent=`Duplicate ${SYSTEM_LABELS[copy.systemType]||copy.systemType} Equipment`;
  renderEquipmentFields(copy.systemType,copy);
  $("equipmentNotes").value=copy.notes||"";
  $("equipmentFlags").value=(copy.potentialEcmFlags||[]).join(", ");
  renderDraftMeasurements();
  await renderDraftPhotos();
}
async function editEquipment(id){
  const existing=currentAudit.equipment.find(x=>x.recordId===id);
  draftEquipment=existing;
  activeType=existing.systemType;
  $("equipment-record-id").value=id;
  $("equipment-dialog-title").textContent=`Edit ${SYSTEM_LABELS[activeType]||activeType} Equipment`;
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
function equipmentProvenanceChanged(e){
  if(!draftEquipment) return;
  draftEquipment.fieldProvenance=draftEquipment.fieldProvenance||{};
  const key=e.target.dataset.equipmentProvenance;
  if(e.target.value) draftEquipment.fieldProvenance[key]=e.target.value;
  else delete draftEquipment.fieldProvenance[key];
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
  const system=(currentAudit.systems||[]).find(s=>s.systemRecordId===deleting?.systemRecordId);
  const previousSystemEquipment=system?[...system.equipmentRecordIds]:null;
  if(system) system.equipmentRecordIds=system.equipmentRecordIds.filter(recordId=>recordId!==id);
  const photoIds=(deleting?.photos||[]).map(p=>p.photoId).filter(id=>availablePhotoIds.has(id));
  if(await saveCurrentWithPhotos({deletePhotoIds:photoIds})) render();
  else{ currentAudit.equipment=previous; if(system) system.equipmentRecordIds=previousSystemEquipment; }
}

function openMeasurement(){
  ["mParameter","mValue","mUnit","mMethod","mNotes"].forEach(id=>$(id).value="");
  $("mSource").value="Measured";
  const presets=MEASUREMENT_PRESETS[draftEquipment?.systemType]||[];
  $("measurement-preset").innerHTML=`<option value="">Custom parameter...</option>${presets.map(([parameter,unit],i)=>`<option value="${i}">${escapeHtml(parameter)} (${escapeHtml(unit)})</option>`).join("")}`;
  $("measurement-dialog").showModal();
}
function measurementPresetChanged(){
  const preset=(MEASUREMENT_PRESETS[draftEquipment?.systemType]||[])[Number($("measurement-preset").value)];
  if(!preset) return;
  $("mParameter").value=preset[0];
  $("mUnit").value=preset[1];
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
  renderSystemInventory();

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
  }).join(""):`<p class="muted">${activeType?`No ${escapeHtml(SYSTEM_LABELS[activeType]||activeType)} equipment added yet.`:"Select a system in Audit Scope to begin equipment inventory."}</p>`;

  const months=currentAudit.utility?.months||[];
  $("utility-count").textContent=`${months.length} months`;
  $("utility-list").innerHTML=months.length?months.map(u=>`
    <div class="item"><div class="row"><div><strong>${escapeHtml(u.month)}</strong>
    <small>${u.kwh?`${escapeHtml(u.kwh)} kWh`:""}${u.kw?` • ${escapeHtml(u.kw)} kW`:""}${u.therms?` • ${escapeHtml(u.therms)} therms`:""}</small></div>
    <button class="secondary small" onclick="deleteUtilityMonth('${u.utilityMonthId}')">Delete</button></div></div>`).join(""):`<p class="muted">No monthly utility data added yet.</p>`;

  $("equipment-count").textContent=`${currentAudit.equipment.length} items`;
  $("add-equipment-btn").textContent=activeType?`+ Add ${SYSTEM_LABELS[activeType]||activeType} Equipment`:`+ Select Audit Scope First`;
  $("add-equipment-btn").disabled=!activeType;

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
    <div class="metric"><strong>${currentAudit.systems.length}</strong><span>Systems</span></div>
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
  currentAudit.systems.forEach(system=>{
    const actual=currentAudit.equipment.filter(eq=>eq.systemRecordId===system.systemRecordId).map(eq=>eq.recordId);
    const missing=(system.equipmentRecordIds||[]).filter(id=>!actual.includes(id));
    if(missing.length) warnings.push(`${system.systemId}: ${missing.length} missing equipment relationship(s)`);
  });
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
  const prompt=`Act as a senior energy engineer performing an ASHRAE Level 2 analysis. Review the attached Audist V3.2 JSON. Perform a data-quality review first. Respect provenance tags and do not invent equipment specifications, measurements, schedules, utility rates, costs, or savings. Identify missing information required for defensible calculations. Then organize systems, evaluate ECMs, and calculate savings only where the supplied data supports the calculation.`;
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
$("duplicate-equipment-btn").onclick=duplicateEquipment;

$("add-measurement-btn").onclick=openMeasurement;
$("measurement-preset").addEventListener("change",measurementPresetChanged);
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

