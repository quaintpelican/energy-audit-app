const APP_VERSION = "4.1";
const SCHEMA_VERSION = 4;
const CALC_ENGINE = globalThis.AudistCalculations;

let currentAudit = null;
let activeType = "HVAC";
let draftEquipment = null;
let saveTimer = null;
let savePending = false;
let editingEcmId = null;
let editingCalculationId = null;
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

const CORE_FIELD_KEYS = new Set([
  "equipmentId","equipmentSubtype","manufacturer","model","capacity","nominalTons","inputCapacity","outputCapacity",
  "ratedHp","ratedCfm","ratedPower","designFlow","designHead","motorHp","fanHp","designAirflow","airflow","quantity",
  "existingWatts","fuel","assemblyType","area","dcCapacity","energyCapacity","powerCapacity","service","process","spaceOrProcess"
]);
const CONTROL_FIELD_KEYS = new Set([
  "controls","controlMethod","compressorControls","controlStrategy","schedule","hoursAnnual","networkProtocol","pointsSummary",
  "temperatureSetpoints","setupSetback","optimumStartStop","economizerStrategy","satReset","staticPressureReset","chwReset","hhwReset",
  "pumpDpReset","dcv","simultaneousHeatingCooling","equipmentStaging"
]);
function equipmentFieldTier(key){
  if(CORE_FIELD_KEYS.has(key)) return "core";
  if(CONTROL_FIELD_KEYS.has(key)||/control|schedule|reset|setpoint|staging/i.test(key)) return "controls";
  if(["serial","iplv","turndown","approachRange","orientation","commissionedYear","loadProfile","lightLevel"].includes(key)) return "advanced";
  return "recommended";
}

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
  if(oldVersion<SCHEMA_VERSION) migrated.metadata.appVersion=APP_VERSION;
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
  const ecmIds=(audit?.ecms||[]).map(ecm=>ecm.ecmId);
  const calculationIds=(audit?.calculations||[]).map(calculation=>calculation.calculationId);
  if(calculationIds.some(id=>!String(id||"").trim())) errors.push("A calculation ID is missing.");
  if(new Set(calculationIds).size!==calculationIds.length) errors.push("Calculation IDs are not unique.");
  (audit?.calculations||[]).forEach(calculation=>{
    if(!CALC_ENGINE?.METHOD_REGISTRY?.[calculation.methodId]) errors.push(`Calculation ${calculation.calculationId||"(unknown)"} uses an unapproved method.`);
    if(!ecmIds.includes(calculation.ecmId)) errors.push(`Calculation ${calculation.calculationId||"(unknown)"} references a missing ECM.`);
    if(!Array.isArray(calculation.inputs)||!Array.isArray(calculation.outputs)) errors.push(`Calculation ${calculation.calculationId||"(unknown)"} has invalid inputs or outputs.`);
    (calculation.equipmentRecordIds||[]).forEach(id=>{if(!recordIds.includes(id)) errors.push(`Calculation ${calculation.calculationId||"(unknown)"} references missing equipment UUID ${id}.`);});
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
function refreshCalculationStaleness(){
  if(!currentAudit||!CALC_ENGINE) return false;
  currentAudit.calculations=Array.isArray(currentAudit.calculations)?currentAudit.calculations:[];
  let changed=false,passChanged=true;
  while(passChanged){
    passChanged=false;
    currentAudit.calculations.forEach(calculation=>{
      if(calculation.status!=="Calculated") return;
      const stale=(calculation.inputs||[]).some(input=>{
        if(!input.sourceKind||!input.sourceRecordId) return false;
        const resolved=resolveCalculationSource(input);
        return !resolved||CALC_ENGINE.sourceFingerprint(resolved)!==input.sourceFingerprint;
      });
      if(stale){calculation.status="Needs Recalculation";calculation.staleAt=nowISO();changed=true;passChanged=true;}
    });
  }
  return changed;
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
    refreshCalculationStaleness();
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
    refreshCalculationStaleness();
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
  $("selected-system-summary").innerHTML=currentAudit.systems.length
    ? currentAudit.systems.map(system=>`<button class="system-chip" data-system-jump="${system.systemType}">${escapeHtml(SYSTEM_LABELS[system.systemType]||system.name)} (${currentAudit.equipment.filter(eq=>eq.systemType===system.systemType).length})</button>`).join("")
    : `<span class="muted">No systems selected. Edit Audit Scope to begin.</span>`;
  document.querySelectorAll("[data-system-jump]").forEach(button=>button.addEventListener("click",()=>{
    activeType=button.dataset.systemJump;
    $("equipment-tabs").scrollIntoView({behavior:"smooth",block:"center"});
    render();
  }));
  $("system-scope").innerHTML=SYSTEM_TYPES.map(([key,label])=>`<label class="scope-option"><input type="checkbox" data-system-scope="${key}" ${selected.has(key)?"checked":""}>${label}</label>`).join("");
  document.querySelectorAll("[data-system-scope]").forEach(el=>el.addEventListener("change",systemScopeChanged));
  $("system-detail-list").innerHTML=(currentAudit.systems||[]).map(system=>`<details class="disclosure"><summary>${escapeHtml(system.systemId)} — ${escapeHtml(system.name||SYSTEM_LABELS[system.systemType])}<span class="pill">${currentAudit.equipment.filter(eq=>eq.systemRecordId===system.systemRecordId).length} equipment</span></summary>
    <div class="system-fields">
      <label>Name<input data-system-record="${system.systemRecordId}" data-system-field="name" value="${escapeHtml(system.name||"")}"></label>
      <label>Status<select data-system-record="${system.systemRecordId}" data-system-field="status"><option ${system.status==="Present"?"selected":""}>Present</option><option ${system.status==="Not Audited"?"selected":""}>Not Audited</option><option ${system.status==="Out of Service"?"selected":""}>Out of Service</option></select></label>
      <label>Operating Schedule<input data-system-record="${system.systemRecordId}" data-system-field="operatingSchedule" value="${escapeHtml(system.operatingSchedule||"")}"></label>
      <label>Controls Summary<input data-system-record="${system.systemRecordId}" data-system-field="controlsSummary" value="${escapeHtml(system.controlsSummary||"")}"></label>
      <label>Notes<input data-system-record="${system.systemRecordId}" data-system-field="notes" value="${escapeHtml(system.notes||"")}"></label>
    </div></details>`).join("");
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
  $("equipment-tabs").innerHTML=systems.map(system=>`<button class="tab ${system.systemType===activeType?"active":""}" data-type="${system.systemType}">${escapeHtml(SYSTEM_LABELS[system.systemType]||system.name)}<span class="tab-count">${currentAudit.equipment.filter(eq=>eq.systemType===system.systemType).length}</span></button>`).join("");
  document.querySelectorAll("#equipment-tabs .tab").forEach(button=>button.addEventListener("click",()=>{ activeType=button.dataset.type; render(); }));
}

function nextEquipmentId(type){
  const prefix = SYSTEM_PREFIXES[type]||"EQ";
  let n=1;
  while(currentAudit.equipment.some(eq=>String(eq.equipmentId).toLowerCase()===`${prefix}-${String(n).padStart(2,"0")}`.toLowerCase())) n++;
  return `${prefix}-${String(n).padStart(2,"0")}`;
}

function equipmentKeySize(eq){
  const candidates=[
    ["nominalTons","tons"],["capacity",""] ,["inputCapacity",""] ,["ratedHp","HP"],["motorHp","HP"],
    ["fanHp","HP"],["ratedPower",""] ,["designFlow","gpm"],["designAirflow","cfm"],["airflow","cfm"],
    ["existingWatts","W/fixture"],["dcCapacity","kWdc"],["energyCapacity","kWh"],["area","ft²"]
  ];
  const found=candidates.find(([key])=>String(eq?.[key]??"").trim());
  return found?`${eq[found[0]]}${found[1]?` ${found[1]}`:""}`:"";
}
function linkedEcmsForEquipment(recordId){
  return (currentAudit?.ecms||[]).filter(ecm=>(ecm.affectedEquipmentRecordIds||[]).includes(recordId));
}
function equipmentWorkflowStatus(eq){
  if(eq.status==="in_progress") return {label:"In Progress",className:"status-progress"};
  const linked=linkedEcmsForEquipment(eq.recordId);
  const missingCritical=linked.some(ecm=>(ecm.completenessItems||[]).some(item=>item.status==="Missing"));
  const photos=evaluatePhotoCompleteness(eq);
  if(missingCritical||photos.required.some(item=>item.status==="Missing")) return {label:"Missing Critical Data",className:"status-critical"};
  const recommendedMissing=linked.some(ecm=>(ecm.completenessItems||[]).some(item=>item.status==="Recommended"))||photos.recommended.some(item=>item.status==="Recommended");
  if(recommendedMissing) return {label:"Recommended Data Missing",className:"status-recommended"};
  return {label:"Complete",className:"status-complete"};
}
function renderEquipmentContext(){
  if(!draftEquipment) return;
  const status=equipmentWorkflowStatus(draftEquipment);
  const photoStatus=evaluatePhotoCompleteness(draftEquipment);
  const linked=linkedEcmsForEquipment(draftEquipment.recordId);
  const missing=[...photoStatus.required.filter(item=>item.status==="Missing").map(item=>`Required photo: ${item.label}`),
    ...linked.flatMap(ecm=>(ecm.completenessItems||[]).filter(item=>item.status==="Missing").map(item=>`${ecm.ecmId}: ${item.label}`))];
  $("equipment-status-detail").innerHTML=`<span class="status-badge ${status.className}">${status.label}</span>${missing.length?`<details class="disclosure"><summary>View missing critical requirements (${missing.length})</summary><ul>${missing.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></details>`:""}`;
  $("equipment-ecm-summary").textContent=`Potential ECMs (${linked.length})`;
  $("equipment-ecm-list").innerHTML=linked.length?linked.map(ecm=>`<button class="secondary" onclick="openEcm('${ecm.ecmId}')">${escapeHtml(ecm.ecmId)} — ${escapeHtml(ecm.title)}</button>`).join(""):`<p class="muted">No ECMs are linked to this equipment.</p>`;
  const totalRequired=photoStatus.required.length;
  const completeRequired=photoStatus.required.filter(item=>item.status==="Complete").length;
  $("equipment-photo-summary").textContent=totalRequired?`Photos ${completeRequired}/${totalRequired}`:`Photos ${(draftEquipment.photos||[]).length}`;
}

function renderEquipmentFields(type, values={}){
  const groups={core:[],recommended:[],controls:[],advanced:[]};
  (schemas[type]||schemas.Other).forEach(field=>groups[equipmentFieldTier(field[0])].push(field));
  const fieldHtml=([id,label,ph])=>id==="equipmentSubtype"
    ? `<label>${label}<select data-equipment-field="${id}" id="f_${id}"><option value="">Select...</option>${(EQUIPMENT_SUBTYPES[type]||["Other equipment"]).map(option=>`<option ${values[id]===option?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select></label>`
    : `<label>${label}<input data-equipment-field="${id}" id="f_${id}" placeholder="${ph}" value="${escapeHtml(values[id]||"")}">${id==="equipmentId"?"":`<select data-equipment-provenance="${id}" aria-label="${escapeHtml(label)} provenance"><option value="">Provenance...</option>${["Measured","Nameplate","Estimated","Assumed","Calculated"].map(p=>`<option ${values.fieldProvenance?.[id]===p?"selected":""}>${p}</option>`).join("")}</select>`}</label>`;
  const expandable=(title,key)=>groups[key].length?`<details class="disclosure"><summary>${title}<span class="pill">${groups[key].length} fields</span></summary><div class="field-grid">${groups[key].map(fieldHtml).join("")}</div></details>`:"";
  $("equipment-fields").innerHTML=`<section class="field-section"><h4>Identity &amp; Key Nameplate / Design Data</h4><div class="field-grid">${groups.core.map(fieldHtml).join("")}</div></section>
    ${expandable("Recommended Data","recommended")}${expandable("Operating Conditions / Controls & Sequence","controls")}${expandable("Advanced Details","advanced")}`;
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
  renderEquipmentContext();
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
  renderEquipmentContext();
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
  renderEquipmentContext();
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
  const linkedCalculations=(currentAudit.calculations||[]).filter(calculation=>(calculation.equipmentRecordIds||[]).includes(id)||(calculation.inputs||[]).some(input=>input.equipmentRecordId===id||input.sourceRecordId===id));
  if(linkedCalculations.length){alert(`This equipment is linked to ${linkedCalculations.length} calculation record(s). Remove or replace those calculation sources before deleting it.`);return;}
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
  $("measurement-preset").innerHTML=`<option value="">Custom Measurement...</option>${presets.map(([parameter,unit],i)=>`<option value="${i}">${escapeHtml(parameter)} (${escapeHtml(unit)})</option>`).join("")}`;
  $("measurement-dialog").showModal();
}
function measurementPresetChanged(){
  const preset=(MEASUREMENT_PRESETS[draftEquipment?.systemType]||[])[Number($("measurement-preset").value)];
  if(!preset) return;
  $("mParameter").value=preset[0];
  $("mUnit").value=preset[1];
  $("mSource").value="Measured";
  $("mValue").focus?.();
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
  if(draftEquipment) renderEquipmentContext();
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
  if(draftEquipment) renderEquipmentContext();
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

let calculationSourceOptions={};
function calculationNextId(){
  const used=new Set((currentAudit.calculations||[]).map(item=>item.calculationId));
  let n=1;
  while(used.has(`CALC-${String(n).padStart(3,"0")}`)) n++;
  return `CALC-${String(n).padStart(3,"0")}`;
}
function evidenceForProvenance(provenance){
  if(["Measured","Nameplate","Manufacturer","Utility Bill","BAS / Trend"].includes(provenance)) return "A";
  if(provenance==="Estimated") return "C";
  if(provenance==="Assumed") return "D";
  return "B";
}
function sourceCandidate(inputDef,ecm){
  const accepted=(inputDef.acceptedUnits||[]).map(unit=>unit.toLowerCase());
  const candidates=[];
  const linked=currentAudit.equipment.filter(eq=>(ecm?.affectedEquipmentRecordIds||[]).includes(eq.recordId));
  const fieldMap={
    existingFixtureWatts:["existingWatts"],quantity:["quantity"],annualHours:["hoursAnnual"],baselineHours:["hoursAnnual"],
    electricRate:["electricRate"],netImplementationCost:["implementationCost"],initialCost:["implementationCost"],
    flowGpm:["flowGpm"],airflowCfm:["airflowCfm","designAirflow"],totalDynamicHeadFt:["headFt","totalDynamicHead"],
    pumpEfficiency:["pumpEfficiency"],motorEfficiency:["motorEfficiency"],baselineFanWatts:["existingWatts"],
    dailyGallons:["dailyGallons","hotWaterGallons"],existingUFactor:["uFactor"],areaSqFt:["areaSqFt","area"]
  };
  linked.forEach(eq=>{
    (fieldMap[inputDef.parameterId]||[]).forEach(field=>{
      if(String(eq[field]??"").trim()){
        const provenance=eq.fieldProvenance?.[field]||"";
        candidates.push({value:eq[field],unit:inputDef.unit,provenance,evidenceLevel:provenance?evidenceForProvenance(provenance):"",sourceKind:"equipment",sourceRecordId:eq.recordId,equipmentRecordId:eq.recordId,sourceField:field,sourceDescription:`${eq.equipmentId} — ${field}`});
      }
    });
    (eq.measurements||[]).forEach(measurement=>{
      if(accepted.includes(String(measurement.unit||"").trim().toLowerCase())&&String(measurement.value??"").trim()!==""){
        const provenance=measurement.source||"";
        candidates.push({value:measurement.numericValue??measurement.value,unit:measurement.unit,provenance,evidenceLevel:provenance?evidenceForProvenance(provenance):"",sourceKind:"measurement",sourceRecordId:measurement.measurementId,equipmentRecordId:eq.recordId,sourceField:"value",sourceDescription:`${eq.equipmentId} measurement — ${measurement.parameter}${measurement.method?` (${measurement.method})`:""}`});
      }
    });
  });
  if(inputDef.parameterId==="electricRate"&&String(currentAudit.utility?.electricRate??"").trim()) candidates.push({value:currentAudit.utility.electricRate,unit:"$/kWh",provenance:"",evidenceLevel:"",sourceKind:"utility",sourceRecordId:currentAudit.auditId,sourceField:"electricRate",sourceDescription:"Audit utility — electric energy rate; select its actual provenance"});
  if(inputDef.parameterId==="netImplementationCost"&&String(ecm?.implementationCost??"").trim()) candidates.push({value:ecm.implementationCost,unit:"$",provenance:"",evidenceLevel:"",sourceKind:"ecm",sourceRecordId:ecm.ecmId,sourceField:"implementationCost",sourceDescription:`${ecm.ecmId} implementation cost; select its actual provenance`});
  (currentAudit.calculations||[]).filter(calc=>calc.status==="Calculated"&&calc.ecmId===ecm?.ecmId).forEach(calc=>(calc.outputs||[]).forEach(result=>{
    if(accepted.includes(String(result.unit||"").toLowerCase())) candidates.push({value:result.value,unit:result.unit,provenance:"Calculated",evidenceLevel:calc.evidenceLevel||"B",sourceKind:"calculation",sourceRecordId:calc.calculationId,sourceField:result.parameterId,sourceVersion:`${calc.methodVersion||""}:${calc.updatedAt||calc.calculatedAt||""}`,sourceDescription:`${calc.calculationId} ${calc.methodId} — ${result.displayName}`});
  }));
  return candidates;
}
function resolveCalculationSource(input){
  if(!input?.sourceKind||!input.sourceRecordId) return null;
  if(input.sourceKind==="equipment"){
    const eq=currentAudit.equipment.find(item=>item.recordId===input.sourceRecordId);
    if(!eq) return null;
    return {...input,value:eq[input.sourceField],provenance:eq.fieldProvenance?.[input.sourceField]||""};
  }
  if(input.sourceKind==="measurement"){
    const eq=currentAudit.equipment.find(item=>item.recordId===input.equipmentRecordId);
    const measurement=eq?.measurements?.find(item=>item.measurementId===input.sourceRecordId);
    if(!measurement) return null;
    return {...input,value:measurement.numericValue??measurement.value,unit:measurement.unit,provenance:measurement.source||""};
  }
  if(input.sourceKind==="system"){
    const system=currentAudit.systems.find(item=>item.systemRecordId===input.sourceRecordId);
    return system?{...input,value:system[input.sourceField]}:null;
  }
  if(input.sourceKind==="utility") return {...input,value:currentAudit.utility?.[input.sourceField]};
  if(input.sourceKind==="ecm"){
    const ecm=currentAudit.ecms.find(item=>item.ecmId===input.sourceRecordId);
    return ecm?{...input,value:ecm[input.sourceField]}:null;
  }
  if(input.sourceKind==="calculation"){
    const calculation=currentAudit.calculations.find(item=>item.calculationId===input.sourceRecordId);
    const result=calculation?.outputs?.find(item=>item.parameterId===input.sourceField);
    return result&&calculation.status==="Calculated"?{...input,value:result.value,unit:result.unit,evidenceLevel:calculation.evidenceLevel,sourceVersion:`${calculation.methodVersion||""}:${calculation.updatedAt||calculation.calculatedAt||""}`}:null;
  }
  return null;
}
function parseBins(text){
  return String(text||"").split(",").map(part=>part.trim()).filter(Boolean).map(part=>{
    const [speed,hours]=part.split(":").map(value=>Number(value.trim()));
    return {speedFraction:speed,hours};
  });
}
function binsText(value){return Array.isArray(value)?value.map(bin=>`${bin.speedFraction}:${bin.hours}`).join(", "):"";}
function parseSeries(text){
  try{const value=JSON.parse(String(text||"[]"));return Array.isArray(value)?value:[];}catch{return [{invalidJson:true}];}
}
function seriesText(value){return Array.isArray(value)?JSON.stringify(value,null,2):"";}
function renderCalculationReadiness(){
  const method=CALC_ENGINE.METHOD_REGISTRY[$("calculation-method").value];
  if(!method) return;
  let inputs=[];
  try{inputs=collectCalculationInputs();}catch{}
  const readiness=CALC_ENGINE.assessReadiness(method.methodId,inputs);
  const status=method.status===CALC_ENGINE.VALIDATE?"Method recognized — engineering methodology not yet validated":readiness.status==="READY"?"Required inputs available":"Additional evidence required";
  $("calculation-readiness").innerHTML=`<div class="readiness ${method.status===CALC_ENGINE.VALIDATE?"validation-required":""}"><strong>${escapeHtml(status)}</strong><div class="readiness-columns"><div><b>Available</b><ul>${readiness.available.map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join("")||"<li>None yet</li>"}</ul></div><div><b>Missing required</b><ul>${readiness.missing.map(x=>`<li>○ ${escapeHtml(x)}</li>`).join("")||"<li>None</li>"}</ul></div><div><b>Recommended evidence</b><ul>${readiness.recommended.map(x=>`<li>○ ${escapeHtml(x)}</li>`).join("")||"<li>None listed</li>"}</ul></div></div></div>`;
}
function renderCalculationInputs(existing=null){
  const method=CALC_ENGINE.METHOD_REGISTRY[$("calculation-method").value];
  const ecm=currentAudit.ecms.find(item=>item.ecmId===editingEcmId);
  calculationSourceOptions={};
  $("calculation-method-description").innerHTML=`<strong>${escapeHtml(method.title)}</strong> <span class="pill">${escapeHtml(method.implementationStatus)}</span><p>${escapeHtml(method.applicability)}</p><code>${escapeHtml(method.formula)}</code>`;
  $("calculation-inputs").innerHTML=method.inputs.map(def=>{
    const prior=existing?.inputs?.find(item=>item.parameterId===def.parameterId)||{};
    const candidates=sourceCandidate(def,ecm); calculationSourceOptions[def.parameterId]=candidates;
    const sourceIndex=candidates.findIndex(item=>item.sourceKind===prior.sourceKind&&item.sourceRecordId===prior.sourceRecordId&&item.sourceField===prior.sourceField);
    const value=def.type==="bins"?binsText(prior.value):def.type==="series"?seriesText(prior.value):prior.value??"";
    const valueControl=def.type==="bins"?`<textarea data-calc-value="${def.parameterId}" placeholder="0.50:1000, 0.75:2000">${escapeHtml(value)}</textarea>`:def.type==="series"?`<textarea data-calc-value="${def.parameterId}" rows="5" placeholder='[{"label":"Summer peak","kwh":1000,"rate":0.25}]'>${escapeHtml(value)}</textarea>`:def.type==="enum"?`<select data-calc-value="${def.parameterId}"><option value="">Select...</option>${def.options.map(option=>`<option ${option===prior.value?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select>`:`<input data-calc-value="${def.parameterId}" inputmode="decimal" value="${escapeHtml(value)}">`;
    return `<div class="calculation-input" data-calculation-input="${def.parameterId}"><h4>${escapeHtml(def.displayName)}${def.optional?" (optional)":""}</h4>
      <label>Source<select data-calc-source="${def.parameterId}"><option value="">Manual entry</option>${candidates.map((item,index)=>`<option value="${index}" ${index===sourceIndex?"selected":""}>${escapeHtml(item.sourceDescription)}</option>`).join("")}</select></label>
      <div class="calculation-source"><label>Value${valueControl}</label>
      <label>Unit<input data-calc-unit="${def.parameterId}" value="${escapeHtml(prior.unit||def.unit)}" readonly></label>
      <label>Provenance<select data-calc-provenance="${def.parameterId}"><option value="">Select provenance...</option>${CALC_ENGINE.PROVENANCE_OPTIONS.map(option=>`<option ${option===prior.provenance?"selected":""}>${option}</option>`).join("")}</select></label>
      <label>Evidence Level<select data-calc-evidence="${def.parameterId}"><option value="">Select evidence...</option>${CALC_ENGINE.EVIDENCE_OPTIONS.map(option=>`<option ${option===prior.evidenceLevel?"selected":""}>${option}</option>`).join("")}</select></label></div>
      <label>Source / Assumption Description<input data-calc-description="${def.parameterId}" value="${escapeHtml(prior.sourceDescription||"")}" placeholder="Instrument, schedule, interview, manufacturer document..."></label>
      <label>Assumption Rationale<input data-calc-assumption="${def.parameterId}" value="${escapeHtml(prior.assumptionRationale||"")}" placeholder="Required when Estimated or Assumed"></label></div>`;
  }).join("");
  document.querySelectorAll("[data-calc-source]").forEach(select=>select.addEventListener("change",calculationSourceChanged));
  document.querySelectorAll("[data-calc-provenance]").forEach(select=>select.addEventListener("change",event=>{
    const id=event.target.dataset.calcProvenance;
    document.querySelector(`[data-calc-evidence="${id}"]`).value=evidenceForProvenance(event.target.value);
  }));
  document.querySelectorAll("[data-calculation-input] input,[data-calculation-input] select,[data-calculation-input] textarea").forEach(element=>element.addEventListener("input",renderCalculationReadiness));
  renderCalculationReadiness();
}
function calculationSourceChanged(event){
  const id=event.target.dataset.calcSource;
  const candidate=calculationSourceOptions[id]?.[Number(event.target.value)];
  if(!candidate) return;
  document.querySelector(`[data-calc-value="${id}"]`).value=candidate.value;
  document.querySelector(`[data-calc-unit="${id}"]`).value=candidate.unit;
  document.querySelector(`[data-calc-provenance="${id}"]`).value=candidate.provenance;
  document.querySelector(`[data-calc-evidence="${id}"]`).value=candidate.evidenceLevel;
  document.querySelector(`[data-calc-description="${id}"]`).value=candidate.sourceDescription;
  renderCalculationReadiness();
}
function collectCalculationInputs(){
  const method=CALC_ENGINE.METHOD_REGISTRY[$("calculation-method").value];
  return method.inputs.map(def=>{
    const sourceSelect=document.querySelector(`[data-calc-source="${def.parameterId}"]`);
    const candidate=calculationSourceOptions[def.parameterId]?.[Number(sourceSelect.value)];
    const query=kind=>document.querySelector(`[data-calc-${kind}="${def.parameterId}"]`);
    const raw=query("value").value;
    const input={parameterId:def.parameterId,displayName:def.displayName,value:def.type==="bins"?parseBins(raw):def.type==="series"?parseSeries(raw):raw,unit:query("unit").value,provenance:query("provenance").value,evidenceLevel:query("evidence").value,sourceDescription:query("description").value,assumptionRationale:query("assumption").value};
    if(candidate) Object.assign(input,candidate,{value:input.value,unit:input.unit,provenance:input.provenance,evidenceLevel:input.evidenceLevel,sourceDescription:input.sourceDescription});
    input.sourceFingerprint=CALC_ENGINE.sourceFingerprint(input);
    return input;
  });
}
function openCalculation(calculationId=null){
  if(!editingEcmId){alert("Save the ECM before adding a calculation.");return;}
  editingCalculationId=calculationId;
  const existing=calculationId?currentAudit.calculations.find(item=>item.calculationId===calculationId):null;
  $("calculation-method").innerHTML=Object.values(CALC_ENGINE.METHOD_REGISTRY).map(method=>`<option value="${method.methodId}" ${method.methodId===existing?.methodId?"selected":""}>${method.methodId} — ${escapeHtml(method.title)}</option>`).join("");
  $("calculation-method").disabled=Boolean(existing);
  $("calculation-baseline").value=existing?.baselineDefinition||"";
  $("calculation-proposed").value=existing?.proposedDefinition||"";
  $("calculation-operation").value=existing?.affectedOperation||"";
  $("calculation-end-use").value=existing?.affectedEndUse||"";
  $("calculation-stream").value=existing?.baselineEnergyStream||"";
  $("calculation-component-role").value=existing?.componentRole||"Primary direct savings";
  $("calculation-interaction").value=existing?.interactionCategory||"Independent";
  renderCalculationInputs(existing);
  $("calculation-dialog").showModal();
}
function createCalculationRevision(prior){
  return prior?.calculatedAt&&(prior.outputs||[]).length?{revisionId:uid(),methodId:prior.methodId,methodVersion:prior.methodVersion,status:prior.status,inputs:structuredClone(prior.inputs||[]),outputs:structuredClone(prior.outputs||[]),evidenceLevel:prior.evidenceLevel,maturity:prior.maturity,calculatedAt:prior.calculatedAt,staleAt:prior.staleAt||null,supersededAt:nowISO()}:null;
}
async function runAndSaveCalculation(){
  const methodId=$("calculation-method").value;
  const ecm=currentAudit.ecms.find(item=>item.ecmId===editingEcmId);
  const metadata={
    baselineDefinition:$("calculation-baseline").value.trim(),proposedDefinition:$("calculation-proposed").value.trim(),affectedOperation:$("calculation-operation").value.trim(),
    affectedEndUse:$("calculation-end-use").value.trim(),baselineEnergyStream:$("calculation-stream").value.trim(),componentRole:$("calculation-component-role").value,interactionCategory:$("calculation-interaction").value,
    equipmentRecordIds:[...(ecm.affectedEquipmentRecordIds||[])]
  };
  const missingContext=[["Baseline definition",metadata.baselineDefinition],["Proposed definition",metadata.proposedDefinition],["Affected operation",metadata.affectedOperation],["Affected end use",metadata.affectedEndUse],["Baseline energy stream",metadata.baselineEnergyStream]].filter(([,value])=>!value).map(([label])=>label);
  if(missingContext.length){$("calculation-readiness").innerHTML=`<div class="not-ready"><strong>Engineering context required</strong><ul>${missingContext.map(item=>`<li>Missing: ${escapeHtml(item)}</li>`).join("")}</ul></div>`;return;}
  const result=CALC_ENGINE.run(methodId,collectCalculationInputs(),{audit:currentAudit,ecm,metadata});
  if(!["Calculated","METHOD_REQUIRES_VALIDATION"].includes(result.status)){
    $("calculation-readiness").innerHTML=`<div class="not-ready"><strong>Calculation not ready</strong><ul>${result.missing.map(item=>`<li>Missing: ${escapeHtml(item)}</li>`).join("")}${result.errors.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
    return;
  }
  const prior=editingCalculationId?currentAudit.calculations.find(item=>item.calculationId===editingCalculationId):null;
  const priorSnapshot=prior?structuredClone(prior):null;
  const priorCalculationIds=[...(ecm.calculationIds||[])];
  const priorRevision=createCalculationRevision(prior);
  const revisionHistory=[...(prior?.revisionHistory||[])];if(priorRevision)revisionHistory.push(priorRevision);
  const calculation={...(prior||{}),...result,...metadata,revisionHistory,calculationId:prior?.calculationId||calculationNextId(),ecmId:ecm.ecmId,systemRecordIds:[...new Set(currentAudit.equipment.filter(eq=>(ecm.affectedEquipmentRecordIds||[]).includes(eq.recordId)).map(eq=>eq.systemRecordId).filter(Boolean))],equipmentRecordIds:[...(ecm.affectedEquipmentRecordIds||[])],dependencyCalculationIds:[...new Set(result.inputs.filter(item=>item.sourceKind==="calculation").map(item=>item.sourceRecordId))],sourceReferences:result.inputs.filter(item=>item.sourceRecordId).map(item=>({parameterId:item.parameterId,sourceKind:item.sourceKind,sourceRecordId:item.sourceRecordId,sourceField:item.sourceField,sourceVersion:item.sourceVersion,description:item.sourceDescription})),calculatedAt:result.status==="Calculated"?nowISO():null,updatedAt:nowISO(),staleAt:null};
  if(prior) Object.assign(prior,calculation);
  else currentAudit.calculations.push(calculation);
  ecm.calculationIds=Array.isArray(ecm.calculationIds)?ecm.calculationIds:[];
  if(!ecm.calculationIds.includes(calculation.calculationId)) ecm.calculationIds.push(calculation.calculationId);
  if(await saveCurrent()){$("calculation-dialog").close();renderEcmCalculations();render();}
  else{
    if(prior) Object.assign(prior,priorSnapshot);
    else currentAudit.calculations=currentAudit.calculations.filter(item=>item!==calculation);
    ecm.calculationIds=priorCalculationIds;
    $("calculation-readiness").innerHTML=`<div class="not-ready"><strong>Save failed</strong><p>The calculation was not added or changed. Keep this screen open and try again.</p></div>`;
  }
}
async function deleteCalculation(id){
  if(!confirm("Delete this calculation record? This cannot be undone.")) return;
  const previous=structuredClone(currentAudit.calculations);
  const previousIds=currentAudit.ecms.map(ecm=>[ecm.ecmId,[...(ecm.calculationIds||[])]]);
  currentAudit.calculations=currentAudit.calculations.filter(item=>item.calculationId!==id);
  currentAudit.ecms.forEach(ecm=>ecm.calculationIds=(ecm.calculationIds||[]).filter(calcId=>calcId!==id));
  if(await saveCurrent()){renderEcmCalculations();render();}
  else{currentAudit.calculations=previous;previousIds.forEach(([ecmId,ids])=>{const ecm=currentAudit.ecms.find(item=>item.ecmId===ecmId);if(ecm)ecm.calculationIds=ids;});}
}
function calculationPrimaryOutput(calculation){
  return (calculation.outputs||[]).find(item=>["annualKwhSavings","annualCostSavings","annualDemandCostSavings","netPresentValue","simplePaybackYears","fuelSavingsTherms","operatingEfficiencyKwPerTon","coolingTons","annualFanEnergyKwh","realPowerKw","annualEnergyKwh"].includes(item.parameterId))||calculation.outputs?.at(-1);
}
function displayCalculationInput(value){return Array.isArray(value)?JSON.stringify(value):String(value??"");}
function renderEcmCalculations(){
  if(!editingEcmId){$("ecm-calculation-count").textContent="Save ECM first";$("ecm-calculation-list").innerHTML=`<p class="muted">Save this ECM before adding calculations.</p>`;$("add-calculation-btn").disabled=true;return;}
  refreshCalculationStaleness();
  const calculations=(currentAudit.calculations||[]).filter(item=>item.ecmId===editingEcmId);
  const current=calculations.filter(calc=>calc.status==="Calculated");
  const annualKwh=current.flatMap(calc=>calc.outputs||[]).filter(output=>output.parameterId==="annualKwhSavings").reduce((sum,output)=>sum+Number(output.value||0),0);
  const annualCost=current.flatMap(calc=>calc.outputs||[]).filter(output=>["annualCostSavings","annualDemandCostSavings"].includes(output.parameterId)).reduce((sum,output)=>sum+Number(output.value||0),0);
  $("ecm-calculation-count").textContent=`${calculations.length} component${calculations.length===1?"":"s"}${annualKwh?` • ${Math.round(annualKwh).toLocaleString()} kWh/yr`:""}${annualCost?` • $${Math.round(annualCost).toLocaleString()}/yr`:""}`;
  $("add-calculation-btn").disabled=false;
  $("ecm-calculation-list").innerHTML=calculations.length?calculations.map(calc=>{
    const result=calculationPrimaryOutput(calc);
    const validation=calc.status==="METHOD_REQUIRES_VALIDATION";
    return `<div class="item calculation-card ${calc.status==="Needs Recalculation"?"stale":""} ${validation?"validation-required":""}"><strong>${escapeHtml(calc.methodId)} v${escapeHtml(calc.methodVersion)}</strong><small>${escapeHtml(calc.status)}${calc.maturity?` • ${escapeHtml(calc.maturity)} • Evidence ${escapeHtml(calc.evidenceLevel||"")}`:""}</small>${validation?`<div class="method-validation">Method recognized — engineering methodology not yet validated. No savings result was generated.</div>`:""}${result?`<div class="calculation-result">${escapeHtml(result.value)} ${escapeHtml(result.unit)}</div>`:""}<details class="disclosure"><summary>View Calculation</summary><dl class="calculation-details"><dt>Component</dt><dd>${escapeHtml(calc.componentRole||"")} • ${escapeHtml(calc.interactionCategory||"")}</dd><dt>Baseline</dt><dd>${escapeHtml(calc.baselineDefinition||"")}</dd><dt>Proposed</dt><dd>${escapeHtml(calc.proposedDefinition||"")}</dd><dt>Affected Operation</dt><dd>${escapeHtml(calc.affectedOperation||"")}</dd><dt>End Use / Stream</dt><dd>${escapeHtml(calc.affectedEndUse||"")} / ${escapeHtml(calc.baselineEnergyStream||"")}</dd><dt>Formula</dt><dd>${escapeHtml(calc.formulaDescription||"")}</dd><dt>Inputs</dt><dd>${(calc.inputs||[]).map(input=>`${escapeHtml(input.displayName)}: ${escapeHtml(displayCalculationInput(input.value))} ${escapeHtml(input.unit)} — ${escapeHtml(input.provenance)}, Evidence ${escapeHtml(input.evidenceLevel)}${input.sourceDescription?` — ${escapeHtml(input.sourceDescription)}`:""}`).join("<br>")||"None recorded"}</dd><dt>Outputs</dt><dd>${(calc.outputs||[]).map(output=>`${escapeHtml(output.displayName)}: ${escapeHtml(output.value)} ${escapeHtml(output.unit)}`).join("<br>")||"No validated numerical output"}</dd><dt>Dependencies</dt><dd>${(calc.dependencyCalculationIds||[]).map(escapeHtml).join(", ")||"None"}</dd><dt>Assumptions / Warnings</dt><dd>${[...(calc.assumptions||[]).map(item=>item.text),...(calc.warnings||[])].map(escapeHtml).join("<br>")||"None"}</dd><dt>QA Flags</dt><dd><ul class="qa-list">${(calc.qaFlags||[]).map(flag=>`<li>${escapeHtml(flag.message)}</li>`).join("")||"<li>None</li>"}</ul></dd><dt>Prior Revisions</dt><dd>${(calc.revisionHistory||[]).length}</dd></dl></details><div class="actions"><button class="secondary small" onclick="openCalculation('${calc.calculationId}')">${calc.status==="Needs Recalculation"?"Recalculate":validation?"Edit Readiness":"Edit / Recalculate"}</button><button class="danger-link" onclick="deleteCalculation('${calc.calculationId}')">Delete</button></div></div>`;
  }).join(""):`<p class="muted">No engineering calculations yet.</p>`;
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
  renderEcmCalculations();
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
      calculationIds:[],
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
  const linkedCalculations=(currentAudit.calculations||[]).filter(calculation=>calculation.ecmId===id);
  if(linkedCalculations.length){alert(`This ECM has ${linkedCalculations.length} calculation record(s). Delete those calculations before deleting the ECM.`);return;}
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
    const status=equipmentWorkflowStatus(x);
    const linkedCount=linkedEcmsForEquipment(x.recordId).length;
    const keySize=equipmentKeySize(x);
    const requiredComplete=pc.required.filter(item=>item.status==="Complete").length;
    const photoLabel=pc.required.length?`${requiredComplete}/${pc.required.length}`:`${(x.photos||[]).length}`;
    return `<div class="item">
      <div class="row">
        <div class="equipment-card-main" onclick="editEquipment('${x.recordId}')">
          <strong>${escapeHtml(x.equipmentId||"(ID missing)")} — ${escapeHtml(x.equipmentSubtype||SYSTEM_LABELS[x.systemType]||x.systemType)}</strong>
          ${keySize?`<small>${escapeHtml(keySize)}</small>`:""}
          <div class="equipment-card-meta"><span>${(x.measurements||[]).length} measurements</span><span>Photos ${photoLabel}</span><span>${linkedCount} ECM${linkedCount===1?"":"s"}</span></div>
          <div class="status-panel"><span class="status-badge ${status.className}">${status.label}</span></div>
        </div>
        <button class="danger-link" aria-label="Delete ${escapeHtml(x.equipmentId||"equipment")}" onclick="deleteEquipment('${x.recordId}')">Delete</button>
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

  $("ecm-list").innerHTML=currentAudit.ecms.length?currentAudit.ecms.map(x=>{
    const hasCritical=(x.completenessItems||[]).some(item=>item.status==="Missing");
    const hasRecommended=(x.completenessItems||[]).some(item=>item.status==="Recommended");
    const status=hasCritical?{label:"Missing Critical Data",className:"status-critical"}:hasRecommended?{label:"Recommended Data Missing",className:"status-recommended"}:{label:"Complete",className:"status-complete"};
    return `<div class="item"><div class="row"><div onclick="openEcm('${x.ecmId}')" class="equipment-card-main">
      <strong>${x.ecmId}: ${escapeHtml(x.title)}</strong>
      <small>${escapeHtml(x.category)} • ${escapeHtml(x.confidence)} confidence</small>
      ${x.templateKey?`<div class="status-panel"><span class="status-badge ${status.className}">${status.label}</span></div>`:""}
    </div><button class="danger-link" onclick="deleteEcm('${x.ecmId}')">Delete</button></div></div>`;
  }).join(""):`<p class="muted">No ECMs added yet.</p>`;
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
  (currentAudit.calculations||[]).forEach(calculation=>{
    if(!currentAudit.ecms.some(ecm=>ecm.ecmId===calculation.ecmId)) warnings.push(`${calculation.calculationId}: linked ECM is missing`);
    const missingEquipment=(calculation.equipmentRecordIds||[]).filter(id=>!currentAudit.equipment.some(eq=>eq.recordId===id));
    if(missingEquipment.length) warnings.push(`${calculation.calculationId}: ${missingEquipment.length} linked equipment record(s) are missing`);
    const missingDependencies=(calculation.dependencyCalculationIds||[]).filter(id=>!currentAudit.calculations.some(item=>item.calculationId===id));
    if(missingDependencies.length) warnings.push(`${calculation.calculationId}: ${missingDependencies.length} calculation dependency record(s) are missing`);
    const missingSources=(calculation.inputs||[]).filter(input=>input.sourceRecordId&&!resolveCalculationSource(input));
    if(missingSources.length) warnings.push(`${calculation.calculationId}: ${missingSources.length} source reference(s) cannot be resolved`);
    if(calculation.status==="Needs Recalculation") warnings.push(`${calculation.calculationId}: calculation inputs changed and require recalculation`);
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
  const prompt=`Act as a senior energy engineer performing an ASHRAE Level 2 analysis. Review the attached Audist V4.1 JSON. Perform a data-quality review first. Respect provenance tags, evidence levels, calculation maturity, QA flags, method validation status, dependencies, engineering component boundaries, revision history, and stale-calculation status. Do not invent equipment specifications, measurements, schedules, utility rates, costs, or savings. Use only the recorded approved method IDs and their saved inputs/outputs. Identify missing information required for defensible calculations.`;
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
$("add-calculation-btn").onclick=()=>openCalculation(null);
$("calculation-method").addEventListener("change",()=>renderCalculationInputs(null));
$("run-calculation").onclick=runAndSaveCalculation;
$("cancel-calculation").onclick=()=>$("calculation-dialog").close();
$("close-calculation").onclick=()=>$("calculation-dialog").close();
$("cancel-ecm").onclick=()=>$("ecm-dialog").close();
$("close-ecm").onclick=()=>$("ecm-dialog").close();

$("export-btn").onclick=exportAudit;
$("export-migration-backup-btn").onclick=exportMigrationBackup;
$("delete-audit-btn").onclick=deleteCurrentAudit;
$("copy-prompt-btn").onclick=copyPrompt;

showDashboard();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(console.error); }

