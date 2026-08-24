const APP_VERSION = "6.3";
const SCHEMA_VERSION = 4;
const CALC_ENGINE = globalThis.AudistCalculations;
const WORKFLOW = globalThis.AudistWorkflow;
const PACKAGE_EXPORT = globalThis.AudistPackageExport;
const UTILITY_ANALYSIS = globalThis.AudistUtilityAnalysis;
const END_USE_ANALYSIS = globalThis.AudistEndUseAnalysis;
const PORTFOLIO_ANALYSIS = globalThis.AudistPortfolioAnalysis;
const ADVANCED_ANALYSIS = globalThis.AudistAdvancedAnalysis;
const QA_ENGINE = globalThis.AudistQaRules;
const AI_REVIEW = globalThis.AudistAiReview;
const REPORT_ENGINE = globalThis.AudistReportEngine;
const FIELD_WORKFLOW = globalThis.AudistFieldWorkflow;

let currentAudit = null;
let activeMode="field";
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
let preparedPackage = null;

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
  Refrigeration:[...COMMON_EQUIPMENT_FIELDS,["refrigerant","Refrigerant",""],["capacity","Capacity",""],["temperatureSetpoint","Temperature Setpoint","°F"],["compressorControls","Compressor Controls",""],["schedule","Operating Schedule",""]],
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
  Refrigeration:{required:["Equipment Overview","Nameplate"],recommended:["Controls","Measurement Setup"]},
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
  Lighting:[["Light level","fc"],["Measured fixture watts","W"]],
  Refrigeration:FIELD_WORKFLOW?.REFRIGERATION_MEASUREMENTS||[]
};
const EQUIPMENT_SUBTYPES={
  PackagedHVAC:["RTU","Split system","Heat pump"],AirHandling:["AHU","MAU","DOAS","Exhaust / relief fan"],
  ChilledWater:["Chiller"],BoilersHeatingWater:["Boiler"],Steam:["Steam boiler","Steam equipment"],
  Pumps:["CHW pump","HHW pump","Condenser pump","Domestic pump","Process pump"],Fans:["Supply fan","Return fan","Exhaust fan","Relief fan"],
  MotorsDrives:["Motor","VFD / starter"],CoolingTowers:["Cooling tower"],BASControls:["BAS system","Controller","Thermostat","Sensor","Sequence / reset strategy"],
  Lighting:["Fixture group","Lighting area","Exterior lighting"],DHW:["Storage water heater","Tankless water heater","Heat pump water heater","DHW boiler"],
  Refrigeration:FIELD_WORKFLOW?.REFRIGERATION_SUBTYPES||["Walk-in","Reach-in","Compressor rack","Condenser","Evaporator"],CompressedAir:["Compressor","Dryer","Receiver"],
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
  },
  pump_vfd:{title:"Install Pump VFD",category:"HVAC",existing:"Constant-speed pump operation.",proposed:"Install VFD and modulate pump speed to system demand.",required:[{label:"Pump Power",measurement:["pump power","kw"],requireUnit:true},{label:"Operating Schedule",keys:["schedule"]},{label:"Speed / Load Profile",measurement:["speed","hz","flow"],requireUnit:true}],recommended:[{label:"Differential Pressure",measurement:["differential pressure","head"],requireUnit:true}]},
  boiler_efficiency:{title:"Boiler Efficiency Upgrade",category:"HVAC",existing:"Existing boiler efficiency remains in service.",proposed:"Upgrade boiler efficiency with a documented proposed system.",required:[{label:"Baseline Efficiency",keys:["efficiency"]},{label:"Fuel / Useful Load Evidence",measurement:["fuel","load","btu"],requireUnit:true}],recommended:[{label:"Nameplate Photo",photo:["Nameplate"]}]}
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
    utilityAccounts:[],
    systems:[],
    equipment:[],
    ecms:[],
    calculations:[],equipmentGroups:[],
    endUseModels:[],ecmPortfolios:[],weatherDatasets:[],manufacturerPerformanceDatasets:[],rcxContainers:[],qaFindingStates:[],qaDeclarations:{fieldScopeReviewed:false,analysisScopeReviewed:false},aiReviews:[],aiReviewExports:[],reports:[],opportunityFlags:[],utilitySourceFiles:[],utilityFieldSummary:{electricityPresent:false,naturalGasPresent:false,waterPresent:false,otherFuelPresent:false,provider:"",rateSchedule:"",historyStatus:"NOT_REQUESTED",approximateRate:null,notes:""},
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
  if(!Array.isArray(migrated.utilityAccounts)){
    const converted=UTILITY_ANALYSIS?.legacyToAccounts(migrated)||[];
    if(converted.length){migrated.utilityAccounts=converted;changed=true;warnings.push("Legacy monthly utility records were converted into account-based V5 utility records; exact billing dates and meter relationships remain unavailable.");}
  }
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
  if(audit?.equipmentGroups!==undefined&&!Array.isArray(audit.equipmentGroups)) errors.push("equipmentGroups must be an array when present.");
  const groupIds=(audit?.equipmentGroups||[]).map(group=>group.groupId);
  if(groupIds.some(id=>!String(id||"").trim())) errors.push("An equipment group UUID is missing.");
  if(new Set(groupIds).size!==groupIds.length) errors.push("Equipment group UUIDs are not unique.");
  (audit?.equipmentGroups||[]).forEach(group=>{
    if(!Array.isArray(group.equipmentRecordIds)||group.equipmentRecordIds.some(id=>!recordIds.includes(id))) errors.push(`Equipment group ${group.name||group.groupId} references missing equipment.`);
    const sample=group.sampling;
    if(sample){
      if(!sample.representativeConfirmed||!Array.isArray(sample.sampledEquipmentRecordIds)||sample.sampledEquipmentRecordIds.some(id=>!group.equipmentRecordIds.includes(id))) errors.push(`Equipment group ${group.name||group.groupId} has invalid representative sampling.`);
      if(Number(sample.populationSize)<sample.sampledEquipmentRecordIds.length||Number(sample.sampleSize)!==sample.sampledEquipmentRecordIds.length) errors.push(`Equipment group ${group.name||group.groupId} has inconsistent sample counts.`);
    }
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
    if(ecm.equipmentGroupId&&!groupIds.includes(ecm.equipmentGroupId)) errors.push(`ECM ${ecm.ecmId||"(unknown)"} references a missing equipment group.`);
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
  if(audit?.utilityAccounts!==undefined&&!Array.isArray(audit.utilityAccounts)) errors.push("utilityAccounts must be an array.");
  const utilityAccountIds=(audit?.utilityAccounts||[]).map(account=>account.utilityAccountId);
  if(utilityAccountIds.some(id=>!String(id||"").trim())||new Set(utilityAccountIds).size!==utilityAccountIds.length) errors.push("Utility account IDs must be present and unique.");
  const utilityBillIds=[];
  (audit?.utilityAccounts||[]).forEach(account=>{
    if(!["Electricity","Natural Gas","Water","Other Fuel"].includes(account.utilityType)) errors.push(`Utility account ${account.utilityAccountId||"(unknown)"} has an invalid type.`);
    if(!Array.isArray(account.bills)) errors.push(`Utility account ${account.utilityAccountId||"(unknown)"} has invalid bills.`);
    (account.bills||[]).forEach(bill=>{
      utilityBillIds.push(bill.utilityBillId);
      if(bill.utilityAccountId!==account.utilityAccountId) errors.push(`Utility bill ${bill.utilityBillId||"(unknown)"} references the wrong account.`);
    });
  });
  if(utilityBillIds.some(id=>!String(id||"").trim())||new Set(utilityBillIds).size!==utilityBillIds.length) errors.push("Utility bill IDs must be present and unique.");
  if(audit?.endUseModels!==undefined&&!Array.isArray(audit.endUseModels)) errors.push("endUseModels must be an array.");
  const endUseIds=(audit?.endUseModels||[]).map(model=>model.endUseModelId);
  if(endUseIds.some(id=>!String(id||"").trim())||new Set(endUseIds).size!==endUseIds.length) errors.push("End-use model IDs must be present and unique.");
  (audit?.endUseModels||[]).forEach(model=>{
    if(!String(model.category||"").trim()||!String(model.utilityType||"").trim()||!String(model.energyUnit||"").trim()) errors.push(`End-use model ${model.endUseModelId||"(unknown)"} is missing category, utility type, or energy unit.`);
    if(!Number.isFinite(Number(model.annualEnergy))||Number(model.annualEnergy)<0) errors.push(`End-use model ${model.endUseModelId||"(unknown)"} has invalid annual energy.`);
    if(!Array.isArray(model.systemRecordIds)||model.systemRecordIds.some(id=>!systemIds.includes(id))) errors.push(`End-use model ${model.endUseModelId||"(unknown)"} references a missing system.`);
    if(!Array.isArray(model.equipmentRecordIds)||model.equipmentRecordIds.some(id=>!recordIds.includes(id))) errors.push(`End-use model ${model.endUseModelId||"(unknown)"} references missing equipment.`);
    if(!Array.isArray(model.calculationIds)||model.calculationIds.some(id=>!calculationIds.includes(id))) errors.push(`End-use model ${model.endUseModelId||"(unknown)"} references a missing calculation.`);
  });
  if(audit?.ecmPortfolios!==undefined&&!Array.isArray(audit.ecmPortfolios)) errors.push("ecmPortfolios must be an array.");
  const portfolioIds=(audit?.ecmPortfolios||[]).map(p=>p.portfolioId),ecmIdSet=new Set((audit?.ecms||[]).map(e=>e.ecmId));
  if(portfolioIds.some(id=>!String(id||"").trim())||new Set(portfolioIds).size!==portfolioIds.length) errors.push("Portfolio IDs must be present and unique.");
  (audit?.ecmPortfolios||[]).forEach(p=>{if(!Array.isArray(p.ecmIds)||p.ecmIds.some(id=>!ecmIdSet.has(id)))errors.push(`Portfolio ${p.portfolioId||"(unknown)"} references a missing ECM.`);if(!Array.isArray(p.sequence)||p.sequence.some(id=>!p.ecmIds.includes(id)))errors.push(`Portfolio ${p.portfolioId||"(unknown)"} has an invalid sequence.`);(p.interactionRecords||[]).forEach(r=>{if(!PORTFOLIO_ANALYSIS?.INTERACTION_TYPES.includes(r.interactionType)||(r.ecmIds||[]).some(id=>!p.ecmIds.includes(id)))errors.push(`Portfolio ${p.portfolioId||"(unknown)"} has an invalid interaction.`);});});
  if(audit?.weatherDatasets!==undefined&&!Array.isArray(audit.weatherDatasets)) errors.push("weatherDatasets must be an array.");
  if(audit?.manufacturerPerformanceDatasets!==undefined&&!Array.isArray(audit.manufacturerPerformanceDatasets)) errors.push("manufacturerPerformanceDatasets must be an array.");
  if(audit?.rcxContainers!==undefined&&!Array.isArray(audit.rcxContainers)) errors.push("rcxContainers must be an array.");
  if(audit?.qaFindingStates!==undefined&&!Array.isArray(audit.qaFindingStates)) errors.push("qaFindingStates must be an array.");
  (audit?.qaFindingStates||[]).forEach(s=>{if(!String(s.findingId||"").trim()||!QA_ENGINE?.STATES?.includes(s.status))errors.push("A QA finding state is invalid.");if(["ACCEPTED_LIMITATION","NOT_APPLICABLE"].includes(s.status)&&!String(s.engineerNote||"").trim())errors.push(`QA finding ${s.findingId||"(unknown)"} requires an engineer note.`);});
  if(audit?.aiReviews!==undefined&&!Array.isArray(audit.aiReviews)) errors.push("aiReviews must be an array when present.");
  (audit?.aiReviews||[]).forEach(review=>{if(review.auditId!==audit.auditId||review.reviewSchemaVersion!==AI_REVIEW?.REVIEW_SCHEMA_VERSION||!String(review.aiReviewId||"").trim())errors.push("An imported AI review is structurally invalid.");});
  if(audit?.opportunityFlags!==undefined&&!Array.isArray(audit.opportunityFlags))errors.push("opportunityFlags must be an array when present.");
  const opportunityIds=(audit?.opportunityFlags||[]).map(f=>f.opportunityFlagId);if(opportunityIds.some(id=>!String(id||"").trim())||new Set(opportunityIds).size!==opportunityIds.length)errors.push("Opportunity flag IDs must be present and unique.");
  (audit?.opportunityFlags||[]).forEach(f=>{if((f.equipmentRecordIds||[]).some(id=>!recordIds.includes(id)))errors.push(`Opportunity flag ${f.opportunityFlagId} references missing equipment.`);if((f.systemRecordIds||[]).some(id=>!systemIds.includes(id)))errors.push(`Opportunity flag ${f.opportunityFlagId} references a missing system.`);});
  (audit?.weatherDatasets||[]).forEach(d=>{const result=ADVANCED_ANALYSIS?.validateWeatherDataset(d);if(result&&!result.valid)errors.push(...result.errors.map(e=>`Weather dataset ${d.weatherDatasetId||"(unknown)"}: ${e}`));});
  (audit?.manufacturerPerformanceDatasets||[]).forEach(d=>{const result=ADVANCED_ANALYSIS?.validatePerformanceDataset(d);if(result&&!result.valid)errors.push(...result.errors.map(e=>`Performance dataset ${d.performanceDatasetId||"(unknown)"}: ${e}`));});
  (audit?.rcxContainers||[]).forEach(d=>{const result=ADVANCED_ANALYSIS?.validateRcxContainer(d,audit);if(result&&!result.valid)errors.push(...result.errors.map(e=>`RCx ${d.rcxId||"(unknown)"}: ${e}`));});
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
  ["uLabel","uProvider","uMeter","uRateSchedule","uAddress","uNotes"].forEach(id=>$(id).value="");
  $("uType").value="Electricity";
  $("utility-dialog").showModal();
}
async function saveUtilityMonth(){
  if(!$("uLabel").value.trim()){ alert("Account label is required."); return; }
  currentAudit.utilityAccounts=Array.isArray(currentAudit.utilityAccounts)?currentAudit.utilityAccounts:[];
  const account={utilityAccountId:uid(),utilityType:$("uType").value,accountLabel:$("uLabel").value.trim(),provider:$("uProvider").value.trim(),meterNumber:$("uMeter").value.trim(),rateSchedule:$("uRateSchedule").value.trim(),serviceAddress:$("uAddress").value.trim(),notes:$("uNotes").value.trim(),bills:[]};
  currentAudit.utilityAccounts.push(account);
  if(await saveCurrent()){ $("utility-dialog").close(); render(); }
  else currentAudit.utilityAccounts=currentAudit.utilityAccounts.filter(x=>x.utilityAccountId!==account.utilityAccountId);
}
function openUtilityBill(accountId){const account=currentAudit.utilityAccounts.find(x=>x.utilityAccountId===accountId);if(!account)return;$("uBillAccountId").value=accountId;["uBillStart","uBillEnd","uBillUsage","uBillDemand","uBillCost","uBillEnergyCost","uBillDemandCost","uBillFixed","uBillTaxes","uBillNotes"].forEach(id=>$(id).value="");$("uBillSource").value="Manual Entry";$("uBillUnit").value=account.utilityType==="Electricity"?"kWh":account.utilityType==="Natural Gas"?"therms":account.utilityType==="Water"?"gallons":"";$("uBillEstimated").checked=false;$("utility-bill-dialog").showModal();}
async function saveUtilityBill(){const account=currentAudit.utilityAccounts.find(x=>x.utilityAccountId===$("uBillAccountId").value);if(!account)return;if(!$("uBillStart").value||!$("uBillEnd").value||$("uBillUsage").value===""||$("uBillCost").value===""){alert("Billing start, end, usage, and total cost are required.");return;}const start=new Date($("uBillStart").value+"T00:00:00Z"),end=new Date($("uBillEnd").value+"T00:00:00Z");if(end<start){alert("Billing end must be on or after billing start.");return;}const value=id=>$(id).value===""?null:Number($(id).value),bill={utilityBillId:uid(),utilityAccountId:account.utilityAccountId,billingStartDate:$("uBillStart").value,billingEndDate:$("uBillEnd").value,billingMonth:$("uBillEnd").value.slice(0,7),billingDays:Math.round((end-start)/86400000)+1,usage:value("uBillUsage"),usageUnit:$("uBillUnit").value.trim(),peakDemandKw:value("uBillDemand"),cost:value("uBillCost"),energyCost:value("uBillEnergyCost"),demandCost:value("uBillDemandCost"),fixedCharges:value("uBillFixed"),taxesOther:value("uBillTaxes"),estimatedBill:$("uBillEstimated").checked,source:$("uBillSource").value.trim(),notes:$("uBillNotes").value.trim()};account.bills.push(bill);if(await saveCurrent()){$("utility-bill-dialog").close();render();}else account.bills=account.bills.filter(x=>x.utilityBillId!==bill.utilityBillId);}
async function deleteUtilityBill(accountId,billId){if(!confirm("Delete this utility bill?"))return;const account=currentAudit.utilityAccounts.find(x=>x.utilityAccountId===accountId),previous=account.bills;account.bills=account.bills.filter(x=>x.utilityBillId!==billId);if(await saveCurrent())render();else account.bills=previous;}
async function deleteUtilityMonth(id){
  if(!confirm("Delete this utility account and all of its bills?")) return;
  const previous=currentAudit.utilityAccounts;
  currentAudit.utilityAccounts=currentAudit.utilityAccounts.filter(x=>x.utilityAccountId!==id);
  if(await saveCurrent()) render();
  else currentAudit.utilityAccounts=previous;
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
  const fields=[...(schemas[type]||schemas.Other),...(type==="Refrigeration"&&FIELD_WORKFLOW?FIELD_WORKFLOW.refrigerationFields(values.equipmentSubtype).map(([key,label])=>[key,label,""]):[])];
  fields.filter((field,index,list)=>list.findIndex(x=>x[0]===field[0])===index).forEach(field=>groups[equipmentFieldTier(field[0])].push(field));
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
  if(!confirm("Duplicate specifications, controls configuration, and schedule? Serial number, measurements, photos, observations, deficiencies, calculations, and ECM conclusions will not be copied."))return;
  const copy=FIELD_WORKFLOW.duplicateEquipment(draftEquipment,{newRecordId:uid(),newEquipmentId:nextEquipmentId(draftEquipment.systemType),now:nowISO()});
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
  if(key==="equipmentSubtype"&&draftEquipment.systemType==="Refrigeration"){
    renderEquipmentFields(draftEquipment.systemType,draftEquipment);
    renderEquipmentContext();
  }
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
  const linkedGroups=(currentAudit.equipmentGroups||[]).filter(group=>(group.equipmentRecordIds||[]).includes(id));
  if(linkedGroups.length){alert(`This equipment belongs to ${linkedGroups.length} explicit analysis group(s). Remove it from those groups before deleting it.`);return;}
  const linkedCalculations=(currentAudit.calculations||[]).filter(calculation=>(calculation.equipmentRecordIds||[]).includes(id)||(calculation.inputs||[]).some(input=>input.equipmentRecordId===id||input.sourceRecordId===id));
  if(linkedCalculations.length){alert(`This equipment is linked to ${linkedCalculations.length} calculation record(s). Remove or replace those calculation sources before deleting it.`);return;}
  const linkedEndUses=(currentAudit.endUseModels||[]).filter(model=>(model.equipmentRecordIds||[]).includes(id));
  if(linkedEndUses.length){alert(`This equipment is linked to ${linkedEndUses.length} end-use model(s). Remove those relationships before deleting it.`);return;}
  const linkedFlags=(currentAudit.opportunityFlags||[]).filter(flag=>(flag.equipmentRecordIds||[]).includes(id)&&!["REJECTED","DEFERRED"].includes(flag.status));
  if(linkedFlags.length){alert(`This equipment is linked to ${linkedFlags.length} active opportunity flag(s). Reject, defer, or relink them before deleting it.`);return;}
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
async function toggleReportPhoto(id,include){const photo=(draftEquipment?.photos||[]).find(p=>p.photoId===id);if(!photo)return;const prior=structuredClone(photo);photo.includeInReport=Boolean(include);if(photo.includeInReport){photo.reportCaption=prompt("Report caption (editable; underlying photo evidence is unchanged):",photo.reportCaption||photo.note||"")??(photo.reportCaption||photo.note||"");photo.reportSection=prompt("Report section ID:",photo.reportSection||"appendices")?.trim()||"appendices";photo.reportOrder=Number.isFinite(photo.reportOrder)?photo.reportOrder:0;}if(!await saveCurrent())Object.assign(photo,prior);await renderDraftPhotos();}
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
      <div class="photo-meta"><strong>${escapeHtml(p.category||"Field Photo")}</strong>${p.note?`<br>${escapeHtml(p.note)}`:""}${kb?`<br>${kb} KB`:""}<br><label><input type="checkbox" ${p.includeInReport?"checked":""} onchange="toggleReportPhoto('${p.photoId}',this.checked)"> Include in report</label></div>
    </div>`);
  }
  $("photo-list").innerHTML=html.join("");
  if(draftEquipment) renderEquipmentContext();
}

async function prepareLevel2Report(){if(!REPORT_ENGINE||!PACKAGE_EXPORT){alert("Report preparation is unavailable. Refresh once online and retry.");return;}await flushPendingSave();const gate=REPORT_ENGINE.readiness(currentAudit);if(gate.status==="NOT_READY"){alert(`Report preparation is blocked:\n\n${gate.blockers.map(x=>x.message).join("\n")}`);return;}if(gate.status==="READY_WITH_LIMITATIONS"&&!confirm(`Prepare a report draft with ${gate.limitations.length} visible limitation(s)? No engineering facts will be invented.`))return;const request=REPORT_ENGINE.buildRequest(currentAudit,{appVersion:APP_VERSION}),files=[{path:"report_request.json",blob:new Blob([JSON.stringify(request,null,2)],{type:"application/json"})},{path:"REPORT_DRAFT_INSTRUCTIONS.md",blob:new Blob([REPORT_ENGINE.INSTRUCTIONS],{type:"text/markdown"})}],blob=await PACKAGE_EXPORT.zip(files),safe=(currentAudit.site?.facilityName||"energy-audit").replace(/[^a-z0-9]+/gi,"_");downloadLocalFile(blob,`${safe}_Audist_Level2_Report_Draft.zip`);}
async function copyReportInstructions(){try{await navigator.clipboard.writeText(REPORT_ENGINE.INSTRUCTIONS);alert("Report drafting instructions copied.");}catch{alert(REPORT_ENGINE.INSTRUCTIONS);}}
async function importReportFile(file){if(!file)return;try{const text=await file.text(),checked=REPORT_ENGINE.validateResponse(text,currentAudit);if(!checked.valid)throw new Error(checked.errors.join("\n"));if(!confirm("Import this draft report? Narrative will remain separate from source engineering records."))return;const report=REPORT_ENGINE.importResponse(checked.value,currentAudit,{reportId:uid(),importedAt:nowISO()}),prior=structuredClone(currentAudit.reports||[]);currentAudit.reports=[...(currentAudit.reports||[]),report];if(await saveCurrent())render();else currentAudit.reports=prior;}catch(error){alert(`Report import rejected.\n\n${error.message||error}`);}finally{$ ("report-input").value="";}}
function openLevel2Report(reportId){const report=(currentAudit.reports||[]).find(r=>r.reportId===reportId);if(!report)return;const html=REPORT_ENGINE.renderHtml(report,currentAudit),url=URL.createObjectURL(new Blob([html],{type:"text/html"}));window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000);}
function editLevel2Section(reportId,sectionId){const index=(currentAudit.reports||[]).findIndex(r=>r.reportId===reportId),report=currentAudit.reports?.[index],section=report?.sections?.find(s=>s.sectionId===sectionId);if(!section)return;const content=prompt(`Edit ${section.heading}. This changes report narrative only.`,section.content);if(content===null)return;const prior=report;currentAudit.reports[index]=REPORT_ENGINE.editSection(report,sectionId,content,nowISO());saveCurrent().then(ok=>{if(!ok)currentAudit.reports[index]=prior;render();});}
function renderLevel2Reports(){if(!REPORT_ENGINE)return;const gate=REPORT_ENGINE.readiness(currentAudit),reports=currentAudit.reports||[],latest=reports.at(-1),integrity=latest?REPORT_ENGINE.integrity(latest,currentAudit):null;$("report-readiness-summary").innerHTML=`<div class="metric"><strong>${escapeHtml(currentAuditQa()?.readiness?.replaceAll("_"," ")||"UNAVAILABLE")}</strong><span>Engineering QA</span></div><div class="metric"><strong>${escapeHtml(gate.status.replaceAll("_"," "))}</strong><span>Report Readiness</span></div><div class="metric"><strong>${latest?escapeHtml(REPORT_ENGINE.isStale(latest,currentAudit)?"STALE":"CURRENT"):"NO DRAFT"}</strong><span>Draft Report</span></div><div class="metric"><strong>${escapeHtml(integrity?.status?.replaceAll("_"," ")||"NOT CHECKED")}</strong><span>Integrity</span></div>`;$("report-drafts").innerHTML=reports.slice().reverse().map(r=>{const check=REPORT_ENGINE.integrity(r,currentAudit),stale=REPORT_ENGINE.isStale(r,currentAudit);return `<details class="disclosure"><summary><span>${escapeHtml(r.reportTitle)}</span><span class="pill">${stale?"STALE":escapeHtml(check.status)}</span></summary>${stale?`<p class="badge-warn">REPORT STALE — underlying engineering data changed</p>`:""}<p>${r.sections.length} sections • ${r.figures.length} selected figures • ${r.limitations.length} limitations</p><div class="actions"><button class="secondary small" onclick="openLevel2Report('${r.reportId}')">Open / Print / Save PDF</button></div>${r.sections.map(s=>`<button class="secondary small" onclick="editLevel2Section('${r.reportId}','${s.sectionId}')">Edit ${escapeHtml(s.heading)}</button>`).join(" ")}</details>`;}).join("")||`<p class="muted">No structured report draft has been imported.</p>`;}

function ensureFieldWorkflow(){currentAudit.opportunityFlags=Array.isArray(currentAudit.opportunityFlags)?currentAudit.opportunityFlags:[];currentAudit.utilitySourceFiles=Array.isArray(currentAudit.utilitySourceFiles)?currentAudit.utilitySourceFiles:[];currentAudit.utilityFieldSummary=currentAudit.utilityFieldSummary||{electricityPresent:false,naturalGasPresent:false,waterPresent:false,otherFuelPresent:false,provider:"",rateSchedule:"",historyStatus:"NOT_REQUESTED",approximateRate:null,notes:""};}
function saveUtilityFieldSummary(){ensureFieldWorkflow();const s=currentAudit.utilityFieldSummary;s.electricityPresent=$("field-electricity").checked;s.naturalGasPresent=$("field-gas").checked;s.waterPresent=$("field-water").checked;s.otherFuelPresent=$("field-other-fuel").checked;s.provider=$("field-utility-provider").value.trim();s.rateSchedule=$("field-rate-schedule").value.trim();s.historyStatus=$("field-history-status").value;s.approximateRate=$("field-approx-rate").value===""?null:Number($("field-approx-rate").value);s.notes=$("field-utility-notes").value.trim();queueSave();}
function addOpportunityFlag(){ensureFieldWorkflow();const equipmentId=prompt("Equipment ID for this opportunity (optional):",draftEquipment?.equipmentId||""),equipment=equipmentId?(currentAudit.equipment||[]).find(e=>String(e.equipmentId).toLowerCase()===equipmentId.trim().toLowerCase()):null,choices=FIELD_WORKFLOW.TEMPLATES.map((t,i)=>`${i+1}. ${t.title}`).join("\n"),selection=Number(prompt(`Opportunity type:\n${choices}\n${FIELD_WORKFLOW.TEMPLATES.length+1}. Other / Custom`,"1")),template=FIELD_WORKFLOW.TEMPLATES[selection-1],title=template?.title||prompt("Opportunity title:","Other opportunity");if(!title)return;const observation=prompt("Brief onsite observation (no proposed case, cost, or savings required):","")||"",flag=FIELD_WORKFLOW.createFlag({templateId:template?.ecmTemplateId,equipmentRecordIds:equipment?[equipment.recordId]:[],systemRecordIds:equipment?.systemRecordId?[equipment.systemRecordId]:[],category:template?.category||"Other",opportunityType:template?.ecmTemplateId||"Other / Custom",title,observation,source:"USER_FLAGGED"},{opportunityFlagId:uid(),now:nowISO()});currentAudit.opportunityFlags.push(flag);saveCurrent().then(ok=>{if(!ok)currentAudit.opportunityFlags=currentAudit.opportunityFlags.filter(f=>f!==flag);render();});}
async function setCandidateStatus(flagId,status){ensureFieldWorkflow();let flag=currentAudit.opportunityFlags.find(f=>f.opportunityFlagId===flagId);if(!flag){const derived=FIELD_WORKFLOW.candidates(currentAudit).find(f=>f.opportunityFlagId===flagId);if(!derived)return;flag=structuredClone(derived);currentAudit.opportunityFlags.push(flag);}const prior=structuredClone(flag),priorEcms=[...(currentAudit.ecms||[])];if(status==="ACCEPT"){try{const ecm=FIELD_WORKFLOW.acceptCandidate(flag,currentAudit,{ecmId:nextEcmId(),now:nowISO()});currentAudit.ecms.push(ecm);flag.status="CONVERTED_TO_ECM";flag.createdEcmId=ecm.ecmId;flag.engineerNote="Accepted by engineer; proposed case, cost, savings, and calculations remain unset.";}catch(error){alert(error.message);return;}}else{const note=prompt(`Engineer note for ${status.toLowerCase()}:`,flag.engineerNote||"");if(note===null)return;flag.status=status==="REJECT"?"REJECTED":"DEFERRED";flag.engineerNote=note;}flag.updatedAt=nowISO();if(await saveCurrent())render();else{Object.assign(flag,prior);currentAudit.ecms=priorEcms;}}
function renderCandidates(){if(!FIELD_WORKFLOW)return;ensureFieldWorkflow();const candidates=FIELD_WORKFLOW.candidates(currentAudit),active=candidates.filter(c=>!["REJECTED","DEFERRED","CONVERTED_TO_ECM"].includes(c.status));$("candidate-summary").innerHTML=`<div class="metric"><strong>${active.length}</strong><span>Ready for review</span></div><div class="metric"><strong>${candidates.filter(c=>c.source==="USER_FLAGGED").length}</strong><span>User flagged</span></div><div class="metric"><strong>${candidates.filter(c=>c.source==="RULE_SUGGESTED").length}</strong><span>Rule suggested</span></div><div class="metric"><strong>${candidates.filter(c=>c.source==="AI_SUGGESTED").length}</strong><span>AI suggested</span></div>`;$("candidate-list").innerHTML=candidates.map(c=>`<div class="item"><strong>${escapeHtml(c.title)}</strong><small>${escapeHtml(c.source.replaceAll("_"," "))} • ${escapeHtml(c.status.replaceAll("_"," "))}</small>${c.observation?`<p>${escapeHtml(c.observation)}</p>`:""}${c.createdEcmId?`<small>Created ${escapeHtml(c.createdEcmId)}</small>`:`<div class="actions"><button class="small" onclick="setCandidateStatus('${c.opportunityFlagId}','ACCEPT')">Accept as ECM</button><button class="secondary small" onclick="setCandidateStatus('${c.opportunityFlagId}','DEFER')">Defer</button><button class="secondary small" onclick="setCandidateStatus('${c.opportunityFlagId}','REJECT')">Reject</button></div>`}</div>`).join("")||`<p class="muted">No candidates yet.</p>`;$("opportunity-list").innerHTML=(currentAudit.opportunityFlags||[]).map(f=>`<div class="item"><strong>${escapeHtml(f.title)}</strong><small>${escapeHtml(f.status.replaceAll("_"," "))}${f.observation?` • ${escapeHtml(f.observation)}`:""}</small></div>`).join("")||`<p class="muted">No onsite opportunities flagged.</p>`;}
async function prepareUtilityExtraction(file){if(!file)return;ensureFieldWorkflow();const utilityType=prompt("Utility type: Electricity, Natural Gas, Water, or Other Fuel","Electricity");if(!["Electricity","Natural Gas","Water","Other Fuel"].includes(utilityType)){alert("Select a supported utility type.");return;}const metadata={sourceFileId:uid(),fileName:file.name,sourceType:file.type||file.name.split(".").pop()||"unknown",size:file.size,lastModified:file.lastModified,receivedAt:nowISO(),status:"RECEIVED_NOT_IMPORTED"};currentAudit.utilitySourceFiles.push(metadata);currentAudit.utilityFieldSummary.historyStatus="RECEIVED";if(!await saveCurrent()){currentAudit.utilitySourceFiles=currentAudit.utilitySourceFiles.filter(x=>x!==metadata);return;}const request=FIELD_WORKFLOW.extractionRequest(currentAudit,metadata,utilityType),instructions="Extract only explicit utility bill facts. Do not infer missing dates, units, usage, demand, cost, provider, meter, or rate schedule. Return the versioned JSON response only. Audist requires user verification before import.",blob=await PACKAGE_EXPORT.zip([{path:"utility_extraction_request.json",blob:new Blob([JSON.stringify(request,null,2)],{type:"application/json"})},{path:"UTILITY_EXTRACTION_INSTRUCTIONS.md",blob:new Blob([instructions],{type:"text/markdown"})}]);downloadLocalFile(blob,`${(currentAudit.site?.facilityName||"Facility").replace(/[^a-z0-9]+/gi,"_")}_Utility_Extraction.zip`);alert("Extraction package prepared. Upload it and the authorized source file to ChatGPT, then import the returned JSON for review.");}
async function importUtilityExtraction(file){if(!file)return;try{const checked=FIELD_WORKFLOW.validateExtraction(await file.text(),currentAudit);if(!checked.valid)throw new Error(checked.errors.join("\n"));const v=checked.value,preview=v.bills.map(b=>`${b.billingStartDate} – ${b.billingEndDate}: ${b.usage} ${b.usageUnit}${b.cost==null?"":` • $${b.cost}`}`).join("\n");if(!confirm(`Review AI-extracted utility data:\n\n${preview}\n\nWarnings: ${checked.warnings.join("; ")||"None"}\n\nConfirm these values against the source file and import?`))return;const metadata=(currentAudit.utilitySourceFiles||[]).at(-1)||{fileName:"External source"},priorMetadataStatus=metadata.status,priorHistoryStatus=currentAudit.utilityFieldSummary.historyStatus,account=FIELD_WORKFLOW.confirmExtraction(v,metadata,{userVerified:true,utilityAccountId:uid(),billIdFactory:()=>uid(),now:nowISO()});currentAudit.utilityAccounts=Array.isArray(currentAudit.utilityAccounts)?currentAudit.utilityAccounts:[];currentAudit.utilityAccounts.push(account);metadata.status="IMPORTED_USER_VERIFIED";currentAudit.utilityFieldSummary.historyStatus=account.bills.length>=12?"RECEIVED":"PARTIAL";if(await saveCurrent())render();else{currentAudit.utilityAccounts=currentAudit.utilityAccounts.filter(a=>a!==account);metadata.status=priorMetadataStatus;currentAudit.utilityFieldSummary.historyStatus=priorHistoryStatus;}}catch(error){alert(`Utility extraction rejected.\n\n${error.message||error}`);}finally{$("utility-response-file").value="";}}

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
  const rules=eq.systemType==="Refrigeration"&&FIELD_WORKFLOW?FIELD_WORKFLOW.refrigerationPhotos(eq.equipmentSubtype):PHOTO_REQUIREMENTS[eq.systemType]||{required:[],recommended:[]};
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
  if(WORKFLOW) return WORKFLOW.candidatesFor(currentAudit,ecm,inputDef);
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
  if(input.sourceKind==="utility-analysis"){
    const type=input.sourceField==="electricRate"?"Electricity":input.sourceField==="gasRate"?"Natural Gas":null,accounts=(currentAudit.utilityAccounts||[]).filter(a=>a.utilityType===type),bills=accounts.flatMap(a=>a.bills||[]),actual=bills.length&&bills.every(b=>["Utility Bill","Utility CSV"].includes(b.source)&&!b.estimatedBill),total=UTILITY_ANALYSIS?.analyze(currentAudit)?.totals?.byType?.[type];
    return type&&actual&&total?.allAccountsComplete&&total.annualUsage>0?{...input,value:total.annualCost/total.annualUsage,sourceVersion:JSON.stringify(bills.map(b=>[b.utilityBillId,b.usage,b.cost,b.updatedAt]))}:null;
  }
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
    const bound=!existing&&WORKFLOW?WORKFLOW.bindInput(currentAudit,ecm,def):null;
    const prior=existing?.inputs?.find(item=>item.parameterId===def.parameterId)||bound?.selected||{};
    const candidates=sourceCandidate(def,ecm); calculationSourceOptions[def.parameterId]=candidates;
    const sourceIndex=candidates.findIndex(item=>item.sourceKind===prior.sourceKind&&item.sourceRecordId===prior.sourceRecordId&&item.sourceField===prior.sourceField);
    const value=def.type==="bins"?binsText(prior.value):def.type==="series"?seriesText(prior.value):prior.value??"";
    const valueControl=def.type==="bins"?`<textarea data-calc-value="${def.parameterId}" placeholder="0.50:1000, 0.75:2000">${escapeHtml(value)}</textarea>`:def.type==="series"?`<textarea data-calc-value="${def.parameterId}" rows="5" placeholder='[{"label":"Summer peak","kwh":1000,"rate":0.25}]'>${escapeHtml(value)}</textarea>`:def.type==="enum"?`<select data-calc-value="${def.parameterId}"><option value="">Select...</option>${def.options.map(option=>`<option ${option===prior.value?"selected":""}>${escapeHtml(option)}</option>`).join("")}</select>`:`<input data-calc-value="${def.parameterId}" inputmode="decimal" value="${escapeHtml(value)}">`;
    return `<div class="calculation-input" data-calculation-input="${def.parameterId}"><h4>${escapeHtml(def.displayName)}${def.optional?" (optional)":""} <span class="input-timing">${escapeHtml(def.timing||"FIELD_REQUIRED")}</span></h4>${bound?.conflict?`<div class="binding-conflict">${bound.requiresSelection?"Conflicting equal-priority sources — choose a source.":`Multiple values found; selected ${escapeHtml(prior.sourceDescription||"preferred source")} by evidence priority.`}</div>`:""}
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
  const recipeMethod=!existing?WORKFLOW?.recipeMethods(currentAudit.ecms.find(item=>item.ecmId===editingEcmId))[0]:null;
  $("calculation-method").innerHTML=Object.values(CALC_ENGINE.METHOD_REGISTRY).map(method=>`<option value="${method.methodId}" ${method.methodId===(existing?.methodId||recipeMethod)?"selected":""}>${method.methodId} — ${escapeHtml(method.title)}</option>`).join("");
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
  const linkedEndUses=(currentAudit.endUseModels||[]).filter(model=>(model.calculationIds||[]).includes(id));
  if(linkedEndUses.length){alert(`This calculation is linked to ${linkedEndUses.length} end-use model(s). Remove those relationships before deleting it.`);return;}
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
  ["ecmTitle","ecmExisting","ecmProposed","ecmMissing","ecmOptionGroup"].forEach(id=>$(id).value="");
  $("ecmCategory").value="HVAC"; $("ecmConfidence").value="Medium"; $("ecmRecommendation").value="Candidate";

  const select=$("ecmEquipment");
  if(select.tagName==="SELECT"){
    select.innerHTML=availableEquipmentOptions(existing?.affectedEquipmentRecordIds||[]);
  }
  $("ecmGroup").innerHTML=`<option value="">Individual equipment only</option>`+(currentAudit.equipmentGroups||[]).map(group=>`<option value="${group.groupId}">${escapeHtml(group.name)} (${group.equipmentRecordIds.length})</option>`).join("");
  $("ecmGroup").value=existing?.equipmentGroupId||"";

  if(existing){
    $("ecmTitle").value=existing.title||"";
    $("ecmCategory").value=existing.category||"HVAC";
    $("ecmExisting").value=existing.existingCondition||"";
    $("ecmProposed").value=existing.proposedImprovement||"";
    $("ecmMissing").value=existing.missingData||"";
    $("ecmConfidence").value=existing.confidence||"Medium";
    $("ecmRecommendation").value=existing.recommendationStatus||"Candidate";
    $("ecmOptionGroup").value=existing.optionGroupId||"";
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
  $("ecm-analysis-section").classList.toggle("hidden",activeMode==="field");
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
  const group=(currentAudit.equipmentGroups||[]).find(item=>item.groupId===$("ecmGroup").value);
  const allRecordIds=[...new Set([...recordIds,...(group?.equipmentRecordIds||[])])];
  const editable={
    title:$("ecmTitle").value,
    category:$("ecmCategory").value,
    affectedEquipmentRecordIds:allRecordIds,
    affectedEquipmentIds:getEquipmentByRecordIds(allRecordIds).map(eq=>eq.equipmentId),
    equipmentGroupId:group?.groupId||null,
    existingCondition:$("ecmExisting").value,
    proposedImprovement:$("ecmProposed").value,
    missingData:$("ecmMissing").value,
    confidence:$("ecmConfidence").value,
    recommendationStatus:$("ecmRecommendation").value,
    optionGroupId:$("ecmOptionGroup").value.trim()||null,
    templateKey:$("ecm-template").value||null,
    analysisRecipe:WORKFLOW?.RECIPES[$("ecm-template").value]?{methodIds:[...WORKFLOW.RECIPES[$("ecm-template").value]],createdFromTemplate:$("ecm-template").value,updatedAt:nowISO()}:null
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
    WORKFLOW?.ensureRecipe(created);currentAudit.ecms.push(created);
    rollback=()=>{ currentAudit.ecms=currentAudit.ecms.filter(x=>x!==created); };
  }
  if(await saveCurrent()){
    $("ecm-dialog").close();
    editingEcmId=null;
    render();
  }else rollback();
}
async function deleteEcm(id){
  const linkedPortfolios=(currentAudit.ecmPortfolios||[]).filter(p=>(p.ecmIds||[]).includes(id));
  if(linkedPortfolios.length){alert(`This ECM belongs to ${linkedPortfolios.length} portfolio(s). Remove it from those portfolios before deleting it.`);return;}
  const linkedCalculations=(currentAudit.calculations||[]).filter(calculation=>calculation.ecmId===id);
  if(linkedCalculations.length){alert(`This ECM has ${linkedCalculations.length} calculation record(s). Delete those calculations before deleting the ECM.`);return;}
  if(!confirm("Delete this ECM?")) return;
  const previous=currentAudit.ecms;
  currentAudit.ecms=currentAudit.ecms.filter(x=>x.ecmId!==id);
  if(await saveCurrent()) render();
  else currentAudit.ecms=previous;
}

function setWorkflowMode(mode){activeMode=mode==="analysis"?"analysis":"field";document.querySelectorAll(".field-only").forEach(el=>el.classList.toggle("hidden",activeMode!=="field"));document.querySelectorAll(".analysis-only").forEach(el=>el.classList.toggle("hidden",activeMode!=="analysis"));$("field-mode-btn").classList.toggle("active",activeMode==="field");$("analysis-mode-btn").classList.toggle("active",activeMode==="analysis");$("field-mode-btn").classList.toggle("secondary",activeMode!=="field");$("analysis-mode-btn").classList.toggle("secondary",activeMode!=="analysis");if(currentAudit)render();}
function readinessDetail(r){return [...r.missingFieldInputs.map(x=>`Field: ${x}`),...r.missingAnalysisInputs.map(x=>`Office: ${x}`)].join(" • ")||"Required inputs available";}
function openRecipeCalculation(ecmId){editingEcmId=ecmId;const existing=(currentAudit.calculations||[]).find(c=>c.ecmId===ecmId);openCalculation(existing?.calculationId||null);}
function renderAnalysisQueue(){
  if(!WORKFLOW)return;
  const queue=WORKFLOW.analysisQueue(currentAudit,CALC_ENGINE),labels={READY_TO_CALCULATE:"Ready to Calculate",NEEDS_OFFICE_INPUT:"Needs Office Input",MISSING_FIELD_DATA:"Missing Field Data",CALCULATED:"Calculated",NEEDS_RECALCULATION:"Needs Recalculation",METHOD_REQUIRES_VALIDATION:"Method Requires Validation",NO_RECIPE:"No Recipe"};
  const endUse=END_USE_ANALYSIS?.analyze(currentAudit),candidates=FIELD_WORKFLOW?.candidates(currentAudit)||[],reviewable=candidates.filter(c=>!["REJECTED","DEFERRED","CONVERTED_TO_ECM"].includes(c.status));
  const utilityStatus=currentAudit.utilityFieldSummary?.historyStatus||((currentAudit.utilityAccounts||[]).length?"IMPORTED":"NOT_REQUESTED");
  const handoff=`<section class="queue-group"><h3>Post-Field Analysis</h3><div class="item"><strong>Utility History</strong><small>${escapeHtml(utilityStatus.replaceAll("_"," "))}</small></div><div class="item"><strong>ECM Candidate Review</strong><small>${candidates.length} candidates • ${reviewable.length} ready for review</small></div></section>`;
  const building=endUse?`<section class="queue-group"><h3>Building Analysis <span class="pill">${escapeHtml(endUse.status.replaceAll("_"," "))}</span></h3><div class="item"><small>${Object.entries(endUse.reconciliations).map(([type,r])=>`${type}: ${r.available?`${r.absoluteGapPercent.toFixed(1)}% gap (${r.quality})`:"utility baseline incomplete"}`).join(" • ")||"Add utility and end-use evidence to begin."}</small></div></section>`:"";
  const calculationGroups=Object.entries(labels).map(([key,label])=>{const items=queue[key]||[];if(!items.length)return "";return `<section class="queue-group"><h3>${label} <span class="pill">${items.length}</span></h3>${items.map(({ecm,readiness})=>`<button class="queue-item" onclick="openRecipeCalculation('${ecm.ecmId}')"><strong>${ecm.ecmId} — ${escapeHtml(ecm.title)}</strong><small>${escapeHtml(readinessDetail(readiness))}</small></button>`).join("")}</section>`;}).join("");
  $("analysis-queue").innerHTML=handoff+building+(calculationGroups||`<p class="muted">Accept an ECM candidate or create a custom ECM to prepare an analysis recipe.</p>`);
}

function endUseCategories(event){const type=$("endUseUtility").value,categories=END_USE_ANALYSIS?.CATEGORIES[type]||["Other"],existing=!event?(currentAudit?.endUseModels||[]).find(x=>x.endUseModelId===$("endUseId").value):null;$("endUseCategory").innerHTML=categories.map(x=>`<option>${escapeHtml(x)}</option>`).join("");$("endUseUnit").readOnly=type!=="Other Fuel";$("endUseUnit").value=type==="Electricity"?"kWh/yr":type==="Natural Gas"?"therms/yr":existing?.energyUnit||"";$("endUseUnit").placeholder=type==="Other Fuel"?"e.g. gallons/yr":"";}
function openEndUse(id=null){const existing=id?(currentAudit.endUseModels||[]).find(x=>x.endUseModelId===id):null;$("endUseId").value=existing?.endUseModelId||"";$("endUseUtility").value=existing?.utilityType||"Electricity";endUseCategories();$("endUseCategory").value=existing?.category||$("endUseCategory").value;$("endUseSubcategory").value=existing?.subcategory||"";$("endUseEnergy").value=existing?.annualEnergy??"";$("endUseProvenance").value=existing?.provenance||"Estimated";$("endUseEvidence").value=existing?.evidenceLevel||"C";$("endUseMaturity").value=existing?.maturity||"ENGINEERING_ESTIMATE";$("endUseBasis").value=existing?.basis||"";$("endUseAssumption").value=(existing?.assumptions||[]).join("\n");const selected=(ids,id)=>ids.includes(id)?" selected":"";$("endUseSystems").innerHTML=(currentAudit.systems||[]).map(s=>`<option value="${s.systemRecordId}"${selected(existing?.systemRecordIds||[],s.systemRecordId)}>${escapeHtml(s.systemId||s.name||s.systemType)}</option>`).join("");$("endUseEquipment").innerHTML=(currentAudit.equipment||[]).map(e=>`<option value="${e.recordId}"${selected(existing?.equipmentRecordIds||[],e.recordId)}>${escapeHtml(e.equipmentId)}</option>`).join("");$("endUseCalculations").innerHTML=(currentAudit.calculations||[]).filter(c=>c.status==="Calculated"&&END_USE_ANALYSIS.baselineOutputs(c).length).map(c=>`<option value="${c.calculationId}"${selected(existing?.calculationIds||[],c.calculationId)}>${escapeHtml(c.calculationId)} — ${escapeHtml(END_USE_ANALYSIS.baselineOutputs(c)[0].output.displayName)}</option>`).join("");$("end-use-dialog").showModal();}
function selectedValues(id){return [...$(id).selectedOptions].map(o=>o.value);}
async function saveEndUse(){const id=$("endUseId").value,energy=Number($("endUseEnergy").value),assumption=$("endUseAssumption").value.trim();if(!$("endUseCategory").value||!Number.isFinite(energy)||energy<0||!$("endUseBasis").value.trim()||!assumption){alert("Category, nonnegative annual energy, basis/method, and an explicit assumption are required.");return;}const calculationIds=selectedValues("endUseCalculations"),sourceVersions={};calculationIds.forEach(calcId=>{const calc=currentAudit.calculations.find(c=>c.calculationId===calcId),baseline=END_USE_ANALYSIS.baselineOutputs(calc)[0];if(baseline)sourceVersions[calcId]=END_USE_ANALYSIS.sourceVersion(calc,baseline.output);});const editable={origin:"MANUAL",utilityType:$("endUseUtility").value,category:$("endUseCategory").value,subcategory:$("endUseSubcategory").value.trim(),parentCategory:"",aggregationRole:"LEAF",annualEnergy:energy,energyUnit:$("endUseUnit").value,annualCost:null,provenance:$("endUseProvenance").value,evidenceLevel:$("endUseEvidence").value,maturity:$("endUseMaturity").value,basis:$("endUseBasis").value.trim(),assumptions:$("endUseAssumption").value.split("\n").map(x=>x.trim()).filter(Boolean),warnings:[],status:"CURRENT",systemRecordIds:selectedValues("endUseSystems"),equipmentRecordIds:selectedValues("endUseEquipment"),calculationIds,sourceVersions,monthlyValues:[]};currentAudit.endUseModels=Array.isArray(currentAudit.endUseModels)?currentAudit.endUseModels:[];let rollback;if(id){const record=currentAudit.endUseModels.find(x=>x.endUseModelId===id),previous=structuredClone(record);Object.assign(record,editable,{updatedAt:nowISO()});rollback=()=>Object.assign(record,previous);}else{const record={endUseModelId:uid(),...editable,createdAt:nowISO(),updatedAt:nowISO()};currentAudit.endUseModels.push(record);rollback=()=>currentAudit.endUseModels=currentAudit.endUseModels.filter(x=>x!==record);}if(await saveCurrent()){$("end-use-dialog").close();render();}else rollback();}
async function deleteEndUse(id){if(!confirm("Delete this manual end-use estimate?"))return;const previous=currentAudit.endUseModels;currentAudit.endUseModels=currentAudit.endUseModels.filter(x=>x.endUseModelId!==id);if(await saveCurrent())render();else currentAudit.endUseModels=previous;}
function renderEndUseAnalysis(){if(!END_USE_ANALYSIS)return;const analysis=END_USE_ANALYSIS.analyze(currentAudit),fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1});$("reconciliation-summary").innerHTML=`<div class="metric"><strong>${escapeHtml(analysis.status.replaceAll("_"," "))}</strong><span>Model status</span></div>`+Object.entries(analysis.reconciliations).map(([type,r])=>`<div class="metric"><strong>${r.available?`${fmt(r.absoluteGapPercent)}%`:"—"}</strong><span>${escapeHtml(type)} gap${r.available?` • ${r.quality}`:" • no complete baseline"}</span></div>`).join("");const leaves=END_USE_ANALYSIS.activeLeafModels(analysis.models),max=Math.max(...leaves.map(m=>m.annualEnergy),1);$("end-use-chart").innerHTML=leaves.map(m=>`<div class="end-use-bar"><span>${escapeHtml(m.category)}</span><i style="width:${Math.max(2,m.annualEnergy/max*100)}%" class="evidence-${escapeHtml(m.evidenceLevel)}"></i><b>${fmt(m.annualEnergy)} ${escapeHtml(m.energyUnit)}</b></div>`).join("")||`<p class="muted">No current end-use models yet.</p>`;$("end-use-list").innerHTML=analysis.models.map(m=>`<details class="disclosure"><summary><span>${escapeHtml(m.category)}${m.subcategory?` — ${escapeHtml(m.subcategory)}`:""}</span><span class="pill">${fmt(m.annualEnergy)} ${escapeHtml(m.energyUnit)} • ${escapeHtml(m.evidenceLevel||"?")}</span></summary><dl class="calculation-details"><dt>Origin / Status</dt><dd>${escapeHtml(m.origin)} • ${escapeHtml(m.status)}</dd><dt>Evidence</dt><dd>${escapeHtml(m.provenance)} • Level ${escapeHtml(m.evidenceLevel)} • ${escapeHtml(m.maturity)}</dd><dt>Basis</dt><dd>${escapeHtml(m.basis||"")}</dd><dt>Sources</dt><dd>${(m.calculationIds||[]).map(escapeHtml).join(", ")||"Manual site-specific estimate"}</dd><dt>Assumptions</dt><dd>${(m.assumptions||[]).map(escapeHtml).join("<br>")||"None recorded"}</dd></dl>${m.origin==="MANUAL"?`<div class="actions"><button class="secondary small" onclick="openEndUse('${m.endUseModelId}')">Edit</button><button class="danger-link" onclick="deleteEndUse('${m.endUseModelId}')">Delete</button></div>`:""}</details>`).join("")||`<p class="muted">Add a site-specific estimate or create a calculation with an explicit baseline-energy output.</p>`;$("end-use-coverage").innerHTML=analysis.coverage.map(c=>`<div class="item"><strong>${c.status==="MODELED"?"✓":c.status==="NOT_MODELED"?"⚠":"○"} ${escapeHtml(c.name||c.systemType)}</strong><small>${escapeHtml(c.expectedCategory||"No major-category mapping")} • ${escapeHtml(c.status.replaceAll("_"," "))}</small></div>`).join("")||`<p class="muted">No present systems in audit scope.</p>`;$("end-use-qa").innerHTML=analysis.qaFlags.map(q=>`<div class="item"><strong>⚠ ${escapeHtml(q.code.replaceAll("_"," "))}</strong><small>${escapeHtml(q.utilityType||q.category||q.endUseModelId||q.systemRecordId||"")}</small></div>`).join("")||`<p class="badge-ok">✓ No reconciliation QA flags.</p>`;}
function renderFieldExitReview(){if(!WORKFLOW)return;const items=WORKFLOW.fieldExitReview(currentAudit,CALC_ENGINE),seen=new Set(items.map(item=>`${item.recordId}:${item.label}`));(currentAudit.ecms||[]).forEach(ecm=>{const template=evaluateTemplate(ecm.templateKey,ecm.affectedEquipmentRecordIds||[]);(template.required||[]).filter(item=>item.status!=="Complete").forEach(missing=>{const key=`${ecm.ecmId}:${missing.label}`;if(!seen.has(key)){seen.add(key);items.push({recordId:ecm.ecmId,title:`${ecm.ecmId} — ${ecm.title}`,label:missing.label});}});});(currentAudit.equipment||[]).forEach(eq=>{evaluatePhotoCompleteness(eq).required.filter(item=>item.status!=="Complete").forEach(missing=>{const key=`${eq.recordId}:${missing.label}`;if(!seen.has(key)){seen.add(key);items.push({recordId:eq.recordId,title:`${eq.equipmentId} — ${eq.name||eq.systemType}`,label:missing.label});}});});const fieldQa=currentAuditQa();(fieldQa?.findings||[]).filter(f=>f.category==="FIELD_COMPLETENESS"&&["BLOCKER","HIGH"].includes(f.severity)&&["OPEN","REVIEWED"].includes(f.status)).forEach(f=>{const key=`qa:${f.findingId}`;if(!seen.has(key)){seen.add(key);items.push({recordId:key,title:`QA ${f.severity} — ${f.title}`,label:f.recommendedAction});}});$("field-exit-count").textContent=`${items.length} item${items.length===1?"":"s"}`;$("field-exit-review").innerHTML=items.length?items.map(item=>`<div class="item field-exit-item"><strong>${escapeHtml(item.title)}</strong><small>⚠ ${escapeHtml(item.label)}</small></div>`).join(""):`<p class="badge-ok">✓ No required field evidence is currently missing.</p>`;}
function openGroupDialog(){const options=availableEquipmentOptions([]);$("group-equipment").innerHTML=options;$("group-sampled").innerHTML=options;$("group-name").value="";$("group-population").value="";$("group-representative").checked=false;renderGroups();$("group-dialog").showModal();}
function renderGroups(){$("group-list").innerHTML=(currentAudit.equipmentGroups||[]).map(group=>`<div class="item"><strong>${escapeHtml(group.name)}</strong><small>${group.equipmentRecordIds.length} included${group.sampling?.representativeConfirmed?` • representative sample ${group.sampling.sampleSize}/${group.sampling.populationSize}`:""}</small></div>`).join("")||`<p class="muted">No explicit groups.</p>`;}
async function saveGroup(){const ids=[...$("group-equipment").selectedOptions].map(o=>o.value),sampled=[...$("group-sampled").selectedOptions].map(o=>o.value).filter(id=>ids.includes(id)),population=Number($("group-population").value||ids.length);if(!$("group-name").value.trim()||!ids.length){alert("Group name and included equipment are required.");return;}if($("group-representative").checked&&(!sampled.length||population<sampled.length)){alert("A representative sample requires sampled equipment and a population at least as large as the sample.");return;}const group={groupId:uid(),name:$("group-name").value.trim(),equipmentRecordIds:ids,sampling:$("group-representative").checked?{populationSize:population,sampleSize:sampled.length,sampledEquipmentRecordIds:sampled,representativeConfirmed:true,confirmedAt:nowISO(),provenance:"Estimated",evidenceLevel:"C"}:null,createdAt:nowISO()};currentAudit.equipmentGroups=Array.isArray(currentAudit.equipmentGroups)?currentAudit.equipmentGroups:[];currentAudit.equipmentGroups.push(group);if(await saveCurrent()){renderGroups();$("group-name").value="";}else currentAudit.equipmentGroups=currentAudit.equipmentGroups.filter(x=>x!==group);}

function renderEndUseRollups(){if(!END_USE_ANALYSIS)return;const analysis=END_USE_ANALYSIS.analyze(currentAudit),leaves=END_USE_ANALYSIS.activeLeafModels(analysis.models),fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1}),systems=new Map((currentAudit.systems||[]).map(s=>[s.systemRecordId,s.name||s.systemId||s.systemType])),systemTotals={};for(const model of leaves)for(const id of model.systemRecordIds||[]){const key=`${model.utilityType}|${model.energyUnit}|${id}`;systemTotals[key]=(systemTotals[key]||0)+Number(model.annualEnergy||0);}const categoryRows=Object.entries(analysis.aggregated).flatMap(([type,total])=>Object.entries(total.categories).map(([category,value])=>`<tr><td>${escapeHtml(type)}</td><td>${escapeHtml(category)}</td><td>${fmt(value)} ${escapeHtml(total.energyUnit)}</td></tr>`)),systemRows=Object.entries(systemTotals).map(([key,value])=>{const [type,unit,id]=key.split("|");return `<tr><td>${escapeHtml(type)}</td><td>${escapeHtml(systems.get(id)||id)}</td><td>${fmt(value)} ${escapeHtml(unit)}</td></tr>`;});$("end-use-rollups").innerHTML=categoryRows.length?`<details class="disclosure"><summary>Category &amp; system totals</summary><h4>By category / subcategory</h4><table><tbody>${categoryRows.join("")}</tbody></table>${systemRows.length?`<h4>By linked system</h4><table><tbody>${systemRows.join("")}</tbody></table>`:""}</details>`:"";}

function renderEndUseSources(){if(!END_USE_ANALYSIS)return;const models=END_USE_ANALYSIS.activeLeafModels(END_USE_ANALYSIS.models(currentAudit)),fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1}),equipment=new Map((currentAudit.equipment||[]).map(e=>[e.recordId,e.equipmentId])),systems=new Map((currentAudit.systems||[]).map(s=>[s.systemRecordId,s.name||s.systemId||s.systemType])),subtotals={};for(const m of models){const key=`${m.utilityType}|${m.energyUnit}|${m.category}|${m.subcategory||"(all)"}`;subtotals[key]=(subtotals[key]||0)+Number(m.annualEnergy||0);}const subtotalRows=Object.entries(subtotals).map(([key,value])=>{const [type,unit,category,subcategory]=key.split("|");return `<tr><td>${escapeHtml(type)}</td><td>${escapeHtml(category)} / ${escapeHtml(subcategory)}</td><td>${fmt(value)} ${escapeHtml(unit)}</td></tr>`;}),sourceRows=models.map(m=>`<tr><td>${escapeHtml(m.category)}${m.subcategory?` / ${escapeHtml(m.subcategory)}`:""}</td><td>${(m.calculationIds||[]).map(escapeHtml).join(", ")||"Manual"}</td><td>${(m.systemRecordIds||[]).map(id=>escapeHtml(systems.get(id)||id)).join(", ")||"—"}</td><td>${(m.equipmentRecordIds||[]).map(id=>escapeHtml(equipment.get(id)||id)).join(", ")||"—"}</td></tr>`);$("end-use-sources").innerHTML=models.length?`<details class="disclosure"><summary>Subcategory totals &amp; source relationships</summary><h4>By subcategory</h4><table><tbody>${subtotalRows.join("")}</tbody></table><h4>Traceability</h4><table><thead><tr><th>End use</th><th>Calculation</th><th>System</th><th>Equipment</th></tr></thead><tbody>${sourceRows.join("")}</tbody></table></details>`:"";}

function portfolioInteractionKey(r){return [...(r.ecmIds||[])].sort().join("|");}
function selectedPortfolioEcmIds(){return [...document.querySelectorAll(".portfolio-ecm-select:checked")].map(x=>x.value);}
function renderPortfolioInteractionEditor(existing=null){if(!PORTFOLIO_ANALYSIS)return;const ids=selectedPortfolioEcmIds(),prior=new Map((existing?.interactionRecords||[]).map(r=>[portfolioInteractionKey(r),r])),detected=PORTFOLIO_ANALYSIS.detectInteractions(currentAudit,ids);$("portfolio-interactions").innerHTML=detected.map((d,i)=>{const r=prior.get(portfolioInteractionKey(d))||d,type=r.interactionType||d.interactionType;return `<div class="item portfolio-interaction" data-index="${i}" data-ecms="${escapeHtml(d.ecmIds.join("|"))}" data-reasons="${escapeHtml(d.reasons.join("|"))}"><strong>${escapeHtml(d.ecmIds.join(" ↕ "))}</strong><small>${escapeHtml(d.reasons.join(" • "))}</small><label>Relationship<select class="portfolio-interaction-type">${PORTFOLIO_ANALYSIS.INTERACTION_TYPES.map(x=>`<option${x===type?" selected":""}>${x}</option>`).join("")}</select></label><label class="check-label"><input class="portfolio-interaction-confirmed" type="checkbox"${r.confirmed?" checked":""}/> Engineer confirms classification</label><label>Shared original baseline (only for sequential adjustment)<input class="portfolio-interaction-baseline" type="number" step="any" value="${r.adjustment?.baselineEnergy??""}" /></label><label>Assumption / reason<input class="portfolio-interaction-notes" value="${escapeHtml(r.engineerNotes||"")}" placeholder="Why this classification or sequence applies" /></label></div>`;}).join("")||`<p class="muted">No deterministic overlap signals among selected ECMs. Savings remain independently additive unless the engineer adds a relationship in a future release.</p>`;}
function openPortfolio(id=null){const existing=id?(currentAudit.ecmPortfolios||[]).find(p=>p.portfolioId===id):null;$("portfolio-id").value=existing?.portfolioId||"";$("portfolio-name").value=existing?.name||"Recommended Portfolio";$("portfolio-description").value=existing?.description||"";const sequence=new Map((existing?.sequence||[]).map((id,i)=>[id,i+1]));$("portfolio-ecms").innerHTML=(currentAudit.ecms||[]).map((e,i)=>`<div class="row"><label class="check-label"><input class="portfolio-ecm-select" type="checkbox" value="${escapeHtml(e.ecmId)}"${existing?.ecmIds?.includes(e.ecmId)?" checked":""}/> ${escapeHtml(e.ecmId)} — ${escapeHtml(e.title)} <small>${escapeHtml(e.recommendationStatus||"Candidate")}</small></label><label>Sequence<input class="portfolio-sequence" data-ecm="${escapeHtml(e.ecmId)}" type="number" min="1" value="${sequence.get(e.ecmId)||i+1}" /></label></div>`).join("")||`<p class="muted">Create ECMs before building a portfolio.</p>`;for(const input of document.querySelectorAll(".portfolio-ecm-select"))input.onchange=()=>renderPortfolioInteractionEditor(existing);$("portfolio-shared-cost").value=existing?.costAdjustments?.sharedMobilizationCost??"";$("portfolio-avoided-cost").value=existing?.costAdjustments?.avoidedReplacementCost??"";$("portfolio-incentives").value=existing?.costAdjustments?.incentives??"";$("portfolio-annual-cost-adjustment").value=existing?.costAdjustments?.annualCostSavingsAdjustment??"";renderPortfolioInteractionEditor(existing);$("portfolio-dialog").showModal();}
function nullableNumber(id){return $(id).value===""?null:Number($(id).value);}
async function savePortfolio(){const id=$("portfolio-id").value,ecmIds=selectedPortfolioEcmIds();if(!$("portfolio-name").value.trim()||!ecmIds.length){alert("Portfolio name and at least one explicitly selected ECM are required.");return;}const sequence=[...document.querySelectorAll(".portfolio-sequence")].filter(x=>ecmIds.includes(x.dataset.ecm)).sort((a,b)=>Number(a.value)-Number(b.value)).map(x=>x.dataset.ecm),interactionRecords=[...document.querySelectorAll(".portfolio-interaction")].map((row,i)=>{const ids=row.dataset.ecms.split("|"),type=row.querySelector(".portfolio-interaction-type").value,confirmed=row.querySelector(".portfolio-interaction-confirmed").checked,baseline=row.querySelector(".portfolio-interaction-baseline").value,notes=row.querySelector(".portfolio-interaction-notes").value.trim();return {interactionId:`${id||"portfolio"}-interaction-${i+1}`,ecmIds:ids,affectedUtilityType:"Electricity",affectedEndUse:"",affectedEquipmentRecordIds:[],interactionType:type,method:type==="SEQUENTIAL"?"SEQUENTIAL_REMAINING_BASELINE":"CLASSIFICATION_ONLY",adjustment:type==="SEQUENTIAL"?{apply:confirmed,baselineEnergy:baseline===""?null:Number(baseline)}:null,assumptions:notes?[notes]:[],warnings:confirmed?[]:["Interaction requires engineer review."],engineerNotes:notes,confirmed,reasons:row.dataset.reasons.split("|").filter(Boolean)};}),editable={name:$("portfolio-name").value.trim(),description:$("portfolio-description").value.trim(),ecmIds,sequence,interactionRecords,costAdjustments:{sharedMobilizationCost:nullableNumber("portfolio-shared-cost"),avoidedReplacementCost:nullableNumber("portfolio-avoided-cost"),incentives:nullableNumber("portfolio-incentives"),annualCostSavingsAdjustment:nullableNumber("portfolio-annual-cost-adjustment")}};currentAudit.ecmPortfolios=Array.isArray(currentAudit.ecmPortfolios)?currentAudit.ecmPortfolios:[];let record,rollback;if(id){record=currentAudit.ecmPortfolios.find(p=>p.portfolioId===id);const previous=structuredClone(record);Object.assign(record,editable,{updatedAt:nowISO()});rollback=()=>Object.assign(record,previous);}else{record={portfolioId:uid(),...editable,createdAt:nowISO(),updatedAt:nowISO()};currentAudit.ecmPortfolios.push(record);rollback=()=>currentAudit.ecmPortfolios=currentAudit.ecmPortfolios.filter(p=>p!==record);}const result=PORTFOLIO_ANALYSIS.analyzePortfolio(currentAudit,{...record,sourceFingerprint:null});Object.assign(record,{baselineEnergyByUtility:result.interactions.flatMap(r=>r.trace?[{utilityType:r.trace.utilityType,baselineEnergy:r.trace.originalBaseline,energyUnit:r.trace.energyUnit}]:[]),standaloneSavings:result.standaloneSavings,combinedSavings:result.combinedSavings,combinedCostSavings:result.combinedCostSavings,combinedImplementationCost:result.combinedImplementationCost,combinedEconomics:{simplePaybackYears:result.simplePaybackYears},warnings:result.warnings,qaFlags:result.qaFlags,evidenceLevel:result.evidenceLevel,maturity:result.maturity,status:result.status,calculationTrace:result.interactions.filter(r=>r.trace).map(r=>r.trace),sourceFingerprint:result.sourceFingerprint});if(await saveCurrent()){$("portfolio-dialog").close();render();}else rollback();}
async function deletePortfolio(id){if(!confirm("Delete this portfolio scenario? Standalone ECMs and calculations will be preserved."))return;const previous=currentAudit.ecmPortfolios;currentAudit.ecmPortfolios=currentAudit.ecmPortfolios.filter(p=>p.portfolioId!==id);if(await saveCurrent())render();else currentAudit.ecmPortfolios=previous;}
function renderPortfolios(){if(!PORTFOLIO_ANALYSIS)return;const results=(currentAudit.ecmPortfolios||[]).map(p=>PORTFOLIO_ANALYSIS.analyzePortfolio(currentAudit,p)),fmt=n=>n===null||n===undefined?"—":Number(n).toLocaleString(undefined,{maximumFractionDigits:1});$("portfolio-list").innerHTML=results.map(r=>`<details class="disclosure portfolio-card"><summary><span>${escapeHtml(r.name)} <span class="pill">${escapeHtml(r.status.replaceAll("_"," "))}</span></span><span>${r.ecmIds.length} ECMs</span></summary><div class="review-grid"><div class="metric"><strong>${fmt(r.standaloneSavings.electricKwh)}</strong><span>Standalone kWh/yr</span></div><div class="metric"><strong>${r.combinedSavings?fmt(r.combinedSavings.electricKwh):"INVALID"}</strong><span>Adjusted kWh/yr</span></div><div class="metric"><strong>$${fmt(r.combinedCostSavings)}</strong><span>Annual cost savings</span></div><div class="metric"><strong>$${fmt(r.combinedImplementationCost)}</strong><span>Implementation cost</span></div><div class="metric"><strong>${fmt(r.simplePaybackYears)}</strong><span>Simple payback (yr)</span></div><div class="metric"><strong>${r.qaFlags.length}</strong><span>QA flags</span></div></div><p><strong>Evidence ${escapeHtml(r.evidenceLevel)} • ${escapeHtml(r.maturity)}</strong><br><small>${escapeHtml(r.evidenceReason)}</small></p>${r.interactions.map(i=>`<div class="item"><strong>${escapeHtml(i.ecmIds.join(" ↕ "))} — ${escapeHtml(i.interactionType)}</strong><small>${escapeHtml(i.confirmed?i.method:"Requires engineer review")}</small>${i.trace?`<small>Baseline ${fmt(i.trace.originalBaseline)} → final ${fmt(i.trace.finalProposedEnergy)}; combined ${fmt(i.trace.combinedSavings)} ${escapeHtml(i.trace.energyUnit)}</small>`:""}</div>`).join("")}${r.qaFlags.map(q=>`<div class="badge-warn">⚠ ${escapeHtml(q.code.replaceAll("_"," "))}</div>`).join("")}<div class="actions"><button class="secondary small" onclick="openPortfolio('${r.portfolioId}')">Review / Edit</button><button class="danger-link" onclick="deletePortfolio('${r.portfolioId}')">Delete</button></div></details>`).join("")||`<p class="muted">No portfolio yet. Add only ECMs explicitly selected for a scenario.</p>`;}

function currentAuditQa(){return QA_ENGINE?.evaluate(currentAudit,{storedPhotos:[...availablePhotoIds].map(photoId=>({photoId}))})||null;}
async function setQaFindingState(findingId,status){
  const qa=currentAuditQa(),finding=qa?.findings.find(f=>f.findingId===findingId);if(!finding)return;
  let engineerNote="";if(["ACCEPTED_LIMITATION","NOT_APPLICABLE"].includes(status)){engineerNote=prompt("Engineer note required. Explain why this limitation is accepted or not applicable:","")?.trim()||"";if(!engineerNote)return;}
  currentAudit.qaFindingStates=Array.isArray(currentAudit.qaFindingStates)?currentAudit.qaFindingStates:[];
  const existing=currentAudit.qaFindingStates.find(s=>s.findingId===findingId),state={findingId,status,engineerNote,ruleId:finding.ruleId,ruleVersion:finding.ruleVersion,severity:finding.severity,category:finding.category,title:finding.title,updatedAt:nowISO()};
  if(existing)Object.assign(existing,state);else currentAudit.qaFindingStates.push(state);
  if(await saveCurrent())render();
}
async function confirmQaDeclaration(kind){currentAudit.qaDeclarations={...(currentAudit.qaDeclarations||{})};const field=kind==="field"?"fieldScopeReviewed":"analysisScopeReviewed";currentAudit.qaDeclarations[field]=true;currentAudit.qaDeclarations[`${field}At`]=nowISO();if(await saveCurrent())render();}
function renderAuditQa(){if(!QA_ENGINE)return;const qa=currentAuditQa(),labels={BLOCKER:"Blockers",HIGH:"High",MEDIUM:"Medium",LOW:"Low",INFO:"Info"},fieldLabel=currentAudit.qaDeclarations?.fieldScopeReviewed?"✓ Field Scope Reviewed":"Confirm Field Scope Review";$("audit-qa-summary").innerHTML=`<div class="metric"><strong>${escapeHtml(qa.readiness.replaceAll("_"," "))}</strong><span>Audit readiness</span></div>`+QA_ENGINE.SEVERITIES.map(s=>`<div class="metric"><strong>${qa.severitySummary[s]}</strong><span>${labels[s]}</span></div>`).join("");$("confirm-field-review-btn").textContent=fieldLabel;$("confirm-field-review-onsite-btn").textContent=fieldLabel;$("confirm-analysis-review-btn").textContent=currentAudit.qaDeclarations?.analysisScopeReviewed?"✓ Analysis Scope Reviewed":"Confirm Analysis Scope Review";$("audit-qa-categories").innerHTML=qa.categorySummaries.filter(c=>c.unresolvedCount).map(c=>`<div class="item"><strong>${escapeHtml(c.category.replaceAll("_"," "))}</strong><small>${c.unresolvedCount} unresolved • ${QA_ENGINE.SEVERITIES.filter(s=>c.severitySummary[s]).map(s=>`${c.severitySummary[s]} ${s}`).join(" • ")}</small></div>`).join("")||`<p class="badge-ok">✓ No unresolved deterministic findings.</p>`;const order=new Map(QA_ENGINE.SEVERITIES.map((s,i)=>[s,i]));$("audit-qa-findings").innerHTML=qa.findings.sort((a,b)=>(order.get(a.severity)-order.get(b.severity))||a.ruleId.localeCompare(b.ruleId)).map(f=>`<details class="disclosure qa-finding qa-${f.severity.toLowerCase()}"><summary><span>${escapeHtml(f.severity)} • ${escapeHtml(f.title)}</span><span>${escapeHtml(f.status.replaceAll("_"," "))}</span></summary><p>${escapeHtml(f.description)}</p><small>${escapeHtml(f.ruleId)} v${escapeHtml(f.ruleVersion)} • ${escapeHtml(f.category.replaceAll("_"," "))}${f.affectedRecordIds.length?` • ${f.affectedRecordIds.map(escapeHtml).join(", ")}`:""}</small>${f.evidence.length?`<details><summary>Evidence</summary><pre>${escapeHtml(JSON.stringify(f.evidence,null,2))}</pre></details>`:""}<p><strong>Recommended action:</strong> ${escapeHtml(f.recommendedAction)}</p>${f.engineerNote?`<p><strong>Engineer note:</strong> ${escapeHtml(f.engineerNote)}</p>`:""}<label>Finding state<select onchange="setQaFindingState('${escapeHtml(f.findingId)}',this.value)">${QA_ENGINE.STATES.filter(s=>s!=="RESOLVED").map(s=>`<option${s===f.status?" selected":""}>${s}</option>`).join("")}</select></label></details>`).join("")||`<p class="badge-ok">✓ Deterministic QA found no current issues.</p>`;}

function downloadLocalFile(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function prepareAiReview(){if(!AI_REVIEW||!PACKAGE_EXPORT){alert("AI review preparation is unavailable. Refresh once online and retry.");return;}if(!confirm("This package may contain confidential facility information. Only share it with an AI/service you are authorized to use. Audist will create files locally and will not transmit them."))return;await flushPendingSave();currentAudit.aiReviewExports=Array.isArray(currentAudit.aiReviewExports)?currentAudit.aiReviewExports:[];const marker={exportId:uid(),reviewSchemaVersion:AI_REVIEW.REVIEW_SCHEMA_VERSION,exportedAt:nowISO(),status:"EXPORTED_FOR_REVIEW"};currentAudit.aiReviewExports.push(marker);if(!await saveCurrent()){currentAudit.aiReviewExports=currentAudit.aiReviewExports.filter(x=>x!==marker);return;}const stored=await dbGetPhotosForAudit(currentAudit.auditId),request=AI_REVIEW.buildRequest(currentAudit,{storedPhotos:stored,appVersion:APP_VERSION}),files=[{path:"ai_review_request.json",blob:new Blob([JSON.stringify(request,null,2)],{type:"application/json"})},{path:"AI_REVIEW_INSTRUCTIONS.md",blob:new Blob([AI_REVIEW.INSTRUCTIONS],{type:"text/markdown"})}],blob=await PACKAGE_EXPORT.zip(files),safe=(currentAudit.site?.facilityName||"energy-audit").replace(/[^a-z0-9]+/gi,"_");downloadLocalFile(blob,`${safe}_Audist_AI_Review.zip`);renderAiReviews();}
async function copyAiInstructions(){try{await navigator.clipboard.writeText(AI_REVIEW.INSTRUCTIONS);alert("AI review instructions copied.");}catch{alert(AI_REVIEW.INSTRUCTIONS);}}
async function importAiReviewFile(file){if(!file)return;let text;try{text=await file.text();const checked=AI_REVIEW.validateResponse(text,currentAudit);if(!checked.valid)throw new Error(checked.errors.join("\n"));const v=checked.value,high=v.findings.filter(f=>f.priority==="HIGH").length;if(!confirm(`Import advisory AI review?\n\n${v.findings.length} findings (${high} high priority)\n${v.overlookedEcmCandidates.length} suggested ECM candidate(s)\n\nNo field facts, calculations, deterministic QA, costs, or savings will be changed.`))return;const review=AI_REVIEW.importResponse(v,currentAudit,{aiReviewId:uid(),importedAt:nowISO()}),before=structuredClone(currentAudit.aiReviews||[]);currentAudit.aiReviews=[...(currentAudit.aiReviews||[]),review];if(await saveCurrent())render();else currentAudit.aiReviews=before;}catch(error){alert(`AI review import rejected.\n\n${error.message||error}`);}finally{$("ai-review-input").value="";}}
async function setAiFindingDisposition(reviewId,findingId,status){const review=(currentAudit.aiReviews||[]).find(r=>r.aiReviewId===reviewId),finding=review?.findings?.find(f=>f.aiFindingId===findingId);if(!finding||!AI_REVIEW.FINDING_STATES.includes(status))return;let note="";if(["ACCEPTED","REJECTED","ACTION_REQUIRED"].includes(status)){note=prompt("Engineer note required for this disposition:",finding.engineerNote||"")?.trim()||"";if(!note){renderAiReviews();return;}}const prior=structuredClone(finding);Object.assign(finding,{disposition:status,engineerNote:note,dispositionAt:nowISO()});if(await saveCurrent())render();else Object.assign(finding,prior);}
async function markAiReviewComplete(reviewId){const review=(currentAudit.aiReviews||[]).find(r=>r.aiReviewId===reviewId);if(!review||AI_REVIEW.isStale(review,currentAudit))return;const open=(review.findings||[]).filter(f=>["OPEN","ACTION_REQUIRED"].includes(f.disposition));if(open.length){alert(`Disposition all ${open.length} open/action-required finding(s) before confirming this review complete.`);return;}if(!confirm("Confirm that a professional engineer has reviewed this advisory AI response and its dispositions? This does not change deterministic QA or audit readiness."))return;const prior=review.engineerReviewedAt;review.engineerReviewedAt=nowISO();if(await saveCurrent())render();else review.engineerReviewedAt=prior;}
async function setAiCandidateDisposition(reviewId,candidateId,status){const review=(currentAudit.aiReviews||[]).find(r=>r.aiReviewId===reviewId),candidate=review?.overlookedEcmCandidates?.find(c=>c.candidateId===candidateId);if(!candidate||!AI_REVIEW.CANDIDATE_STATES.includes(status))return;if(candidate.createdEcmId){alert(`This candidate already created ${candidate.createdEcmId}. Its historical disposition is locked; edit the normal ECM directly.`);renderAiReviews();return;}const prior=structuredClone(candidate),priorEcms=[...(currentAudit.ecms||[])];let created=null,note="";if(status==="ACCEPTED"){if(!confirm("Accept this advisory candidate and create a normal Audist ECM? No savings, costs, measurements, or proposed specifications will be created.")){renderAiReviews();return;}created=AI_REVIEW.createEcmFromCandidate(candidate,review,{ecmId:nextEcmId(),equipmentIds:(currentAudit.equipment||[]).map(e=>e.recordId),createdAt:nowISO()});currentAudit.ecms=[...(currentAudit.ecms||[]),created];note="Accepted by engineer; normal ECM evidence and calculation requirements apply.";}else if(status==="REJECTED"){note=prompt("Engineer note required to reject this candidate:",candidate.engineerNote||"")?.trim()||"";if(!note){renderAiReviews();return;}}Object.assign(candidate,{status,engineerNote:note,dispositionAt:nowISO(),createdEcmId:created?.ecmId||null});if(await saveCurrent()){render();if(created)openEcm(created.ecmId);}else{Object.assign(candidate,prior);currentAudit.ecms=priorEcms;}}
function renderAiReviews(){if(!AI_REVIEW)return;const reviews=currentAudit.aiReviews||[],latest=reviews.at(-1),status=latest?AI_REVIEW.effectiveStatus(latest,currentAudit):(currentAudit.aiReviewExports||[]).length?"EXPORTED_FOR_REVIEW":"NOT_REVIEWED",findings=latest?.findings||[],open=findings.filter(f=>["OPEN","ACTION_REQUIRED"].includes(f.disposition)),candidates=latest?.overlookedEcmCandidates||[],qa=currentAuditQa();$("ai-review-summary").innerHTML=`<div class="metric"><strong>${escapeHtml(qa?.readiness?.replaceAll("_"," ")||"UNAVAILABLE")}</strong><span>Deterministic QA (authoritative)</span></div><div class="metric"><strong>${escapeHtml(status.replaceAll("_"," "))}</strong><span>AI review (advisory)</span></div><div class="metric"><strong>${open.filter(f=>f.priority==="HIGH").length}</strong><span>High priority open</span></div><div class="metric"><strong>${open.length}</strong><span>Open observations</span></div><div class="metric"><strong>${candidates.filter(c=>!["ACCEPTED","REJECTED"].includes(c.status)).length}</strong><span>Suggested ECMs</span></div>`;$("ai-review-list").innerHTML=reviews.slice().reverse().map(review=>{const reviewStatus=AI_REVIEW.effectiveStatus(review,currentAudit),openCount=(review.findings||[]).filter(f=>["OPEN","ACTION_REQUIRED"].includes(f.disposition)).length;return `<details class="disclosure ai-review-card"><summary><span>AI Review • ${escapeHtml(review.importedAt?.slice(0,10)||"")}</span><span class="pill">${escapeHtml(reviewStatus.replaceAll("_"," "))}</span></summary>${reviewStatus==="STALE"?`<p class="badge-warn">⚠ Audit engineering data changed after this review. Generate a new review before relying on it.</p>`:""}<p>${escapeHtml(review.summary||review.overallAssessment||"No summary supplied.")}</p><small>${escapeHtml(review.reviewer)} • ${escapeHtml(review.model)} • advisory analysis</small><h4>Findings</h4>${(review.findings||[]).map(f=>`<details class="disclosure ai-finding"><summary><span>AI REVIEW • ${escapeHtml(f.priority)} • ${escapeHtml(f.title)}</span><span>${escapeHtml(f.disposition||"OPEN")}</span></summary><p>${escapeHtml(f.description)}</p><p><strong>Basis:</strong> ${(f.basis||[]).map(escapeHtml).join(" • ")||"Not supplied"}</p><p><strong>Recommendation:</strong> ${escapeHtml(f.recommendation)}</p><small>${escapeHtml(f.category.replaceAll("_"," "))} • AI confidence ${escapeHtml(f.confidence)}${f.affectedRecordIds.length?` • ${f.affectedRecordIds.map(escapeHtml).join(", ")}`:""}</small>${f.engineerNote?`<p><strong>Engineer note:</strong> ${escapeHtml(f.engineerNote)}</p>`:""}<label>Engineer disposition<select onchange="setAiFindingDisposition('${review.aiReviewId}','${f.aiFindingId}',this.value)">${AI_REVIEW.FINDING_STATES.map(s=>`<option${s===(f.disposition||"OPEN")?" selected":""}>${s}</option>`).join("")}</select></label></details>`).join("")||`<p class="muted">No AI findings supplied.</p>`}<h4>Suggested ECM Candidates</h4>${(review.overlookedEcmCandidates||[]).map(c=>`<div class="item ai-candidate"><strong>${escapeHtml(c.title)}</strong><small>${escapeHtml(c.reason)}</small><small>Additional data: ${(c.additionalDataNeeded||[]).map(escapeHtml).join(" • ")||"None identified"}</small>${c.createdEcmId?`<small>Created ECM: ${escapeHtml(c.createdEcmId)}</small>`:""}${c.engineerNote?`<small>Engineer note: ${escapeHtml(c.engineerNote)}</small>`:""}${c.createdEcmId?`<span class="pill">ACCEPTED</span>`:`<label>Status<select onchange="setAiCandidateDisposition('${review.aiReviewId}','${c.candidateId}',this.value)">${AI_REVIEW.CANDIDATE_STATES.map(s=>`<option${s===(c.status||"SUGGESTED")?" selected":""}>${s}</option>`).join("")}</select></label>`}</div>`).join("")||`<p class="muted">No overlooked ECM candidates supplied.</p>`}<details><summary>Calculation reviews and report notes</summary><pre>${escapeHtml(JSON.stringify({calculationReviews:review.calculationReviews,dataQualityObservations:review.dataQualityObservations,reportLimitations:review.reportLimitations,reportPreparationNotes:review.reportPreparationNotes,warnings:review.warnings},null,2))}</pre></details>${reviewStatus!=="STALE"&&!review.engineerReviewedAt?`<button class="secondary small" onclick="markAiReviewComplete('${review.aiReviewId}')"${openCount?" disabled":""}>Confirm Engineer Review Complete</button>`:""}</details>`;}).join("")||`<p class="muted">No AI review has been imported. Deterministic QA remains available without one.</p>`;}

function renderFieldExitReviewV63(){const items=[],seen=new Set(),add=item=>{const key=`${item.recordId}:${item.label}`;if(!seen.has(key)){seen.add(key);items.push(item);}};(currentAudit.equipment||[]).forEach(eq=>{if(!String(eq.equipmentId||"").trim())add({recordId:eq.recordId,title:"Equipment identity",label:"Assign a unique equipment ID"});if(!String(eq.equipmentSubtype||"").trim())add({recordId:eq.recordId,title:eq.equipmentId||"Equipment",label:"Record equipment subtype"});evaluatePhotoCompleteness(eq).required.filter(x=>x.status!=="Complete").forEach(x=>add({recordId:eq.recordId,title:`${eq.equipmentId||"Equipment"} — photo evidence`,label:x.label}));});for(const item of FIELD_WORKFLOW?.fieldExitOpportunityItems(currentAudit)||[])add(item);const fieldQa=currentAuditQa();(fieldQa?.findings||[]).filter(f=>f.category==="FIELD_COMPLETENESS"&&["BLOCKER","HIGH"].includes(f.severity)&&["OPEN","REVIEWED"].includes(f.status)).forEach(f=>add({recordId:`qa:${f.findingId}`,title:`QA ${f.severity} — ${f.title}`,label:f.recommendedAction}));$("field-exit-count").textContent=`${items.length} item${items.length===1?"":"s"}`;$("field-exit-review").innerHTML=items.length?items.map(item=>`<div class="item field-exit-item"><strong>${escapeHtml(item.title)}</strong><small>⚠ ${escapeHtml(item.label)}</small></div>`).join(""):`<p class="badge-ok">✓ No difficult-to-recover onsite evidence is currently missing.</p>`;}

function render(){
  if(!currentAudit) return;
  ensureFieldWorkflow();
  recalculateAllCompleteness();
  $("audit-title").textContent=currentAudit.site?.facilityName||"Untitled Audit";
  $("header-status").textContent=`${currentAudit.site?.facilityName||"Active audit"} • V${APP_VERSION}`;
  renderSystemInventory();
  renderAnalysisQueue();renderCandidates();renderAuditQa();renderAiReviews();renderLevel2Reports();renderEndUseAnalysis();renderEndUseRollups();renderEndUseSources();renderPortfolios();renderFieldExitReviewV63();
  const fieldUtility=currentAudit.utilityFieldSummary;$("field-electricity").checked=fieldUtility.electricityPresent;$("field-gas").checked=fieldUtility.naturalGasPresent;$("field-water").checked=fieldUtility.waterPresent;$("field-other-fuel").checked=fieldUtility.otherFuelPresent;$("field-utility-provider").value=fieldUtility.provider||"";$("field-rate-schedule").value=fieldUtility.rateSchedule||"";$("field-history-status").value=fieldUtility.historyStatus||"NOT_REQUESTED";$("field-approx-rate").value=fieldUtility.approximateRate??"";$("field-utility-notes").value=fieldUtility.notes||"";

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

  const utilityAnalysis=UTILITY_ANALYSIS?.analyze(currentAudit),accounts=currentAudit.utilityAccounts||[];
  $("utility-count").textContent=`${accounts.length} account${accounts.length===1?"":"s"}`;
  const eui=utilityAnalysis?.totals.eui,di=utilityAnalysis?.totals.demandIntensity,cost=utilityAnalysis?.totals.totalUtilityCost;
  $("utility-analysis-summary").innerHTML=`<div class="metric"><strong>${eui?eui.siteKbtuPerSqFt.toFixed(1):"—"}</strong><span>Site EUI (kBtu/ft²·yr)</span></div><div class="metric"><strong>${di?di.wattsPerSqFt.toFixed(2):"—"}</strong><span>Peak W/ft²</span></div><div class="metric"><strong>${cost!==null&&cost!==undefined?`$${cost.toLocaleString(undefined,{maximumFractionDigits:0})}`:"—"}</strong><span>Complete annual cost</span></div><div class="metric"><strong>${utilityAnalysis?.qaFlags.length||0}</strong><span>Baseline QA flags</span></div>`;
  $("utility-list").innerHTML=accounts.length?accounts.map((account,index)=>{const r=utilityAnalysis.accountResults[index],max=Math.max(...r.rows.map(x=>x.usage||0),1);return `<div class="item utility-account"><div class="row"><div><strong>${escapeHtml(account.accountLabel||account.utilityType)} — ${escapeHtml(account.utilityType)}</strong><small>${escapeHtml(account.provider||"Provider not recorded")} • ${r.completeness.status.replaceAll("_"," ")} • ${r.completeness.billCount} bills</small></div><div class="actions"><button class="secondary small" onclick="openUtilityBill('${account.utilityAccountId}')">+ Bill</button><button class="danger-link" onclick="deleteUtilityMonth('${account.utilityAccountId}')">Delete</button></div></div>${r.completeness.flags.length?`<p class="badge-warn">${r.completeness.flags.length} data-quality flag(s); review dates, units, and gaps.</p>`:""}<div class="utility-chart" aria-label="Monthly usage chart">${r.rows.map(row=>`<div class="utility-bar-row"><span>${escapeHtml(row.label)}</span><i style="width:${Math.max(2,(row.usage||0)/max*100)}%"></i><b>${row.usage??"—"} ${escapeHtml(row.usageUnit||"")}</b></div>`).join("")}</div><div class="list compact">${(account.bills||[]).map(b=>`<div class="row bill-row"><small>${escapeHtml(b.billingStartDate)} – ${escapeHtml(b.billingEndDate)} • ${b.usage} ${escapeHtml(b.usageUnit)} • $${b.cost}${b.estimatedBill?" • Estimated":""}</small><button class="secondary small" onclick="deleteUtilityBill('${account.utilityAccountId}','${b.utilityBillId}')">Delete</button></div>`).join("")}</div>${r.annual?`<small>Annual: ${r.annual.usage.toLocaleString()} ${escapeHtml(account.bills[0]?.usageUnit||"")} • blended $${r.annual.blendedRate?.toFixed(4)??"—"}/unit${r.baseload?` • baseload screen ${r.baseload.annualUsageScreening.toFixed(0)} units/yr`:""}</small>`:`<small>Partial period totals are shown; no annualization is performed.</small>`}</div>`;}).join(""):`<p class="muted">No utility accounts added yet. Add accounts and enter bills manually; partial periods will not be annualized.</p>`;

  $("equipment-count").textContent=`${currentAudit.equipment.length} items`;
  $("add-equipment-btn").textContent=activeType?`+ Add ${SYSTEM_LABELS[activeType]||activeType} Equipment`:`+ Select Audit Scope First`;
  $("add-equipment-btn").disabled=!activeType;

  $("ecm-list").innerHTML=currentAudit.ecms.length?currentAudit.ecms.map(x=>{
    const readiness=WORKFLOW?.engineeringReadiness(currentAudit,x,CALC_ENGINE);const hasCritical=(x.completenessItems||[]).some(item=>item.status==="Missing");
    const hasRecommended=(x.completenessItems||[]).some(item=>item.status==="Recommended");
    const status=hasCritical?{label:"Missing Critical Data",className:"status-critical"}:hasRecommended?{label:"Recommended Data Missing",className:"status-recommended"}:{label:"Complete",className:"status-complete"};
    return `<div class="item"><div class="row"><div onclick="openEcm('${x.ecmId}')" class="equipment-card-main">
      <strong>${x.ecmId}: ${escapeHtml(x.title)}</strong>
      <small>${escapeHtml(x.category)} • ${escapeHtml(x.confidence)} confidence</small>
      ${x.templateKey?`<div class="status-panel"><span class="status-badge ${status.className}">Field Documentation: ${status.label}</span>${readiness?` <span class="status-badge status-progress">Calculation: ${escapeHtml(readiness.status.replaceAll("_"," "))}</span>`:""}</div>`:""}
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
    <div class="metric"><strong>${(currentAudit.utilityAccounts||[]).reduce((n,a)=>n+(a.bills||[]).length,0)||(currentAudit.utility?.months?.length||0)}</strong><span>Utility Bills</span></div>
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
  exportCopy.engineeringAnalysis=WORKFLOW?.exportReadiness(currentAudit,CALC_ENGINE)||[];
  exportCopy.utilityAnalysis=UTILITY_ANALYSIS?.analyze(currentAudit)||null;
  exportCopy.endUseAnalysis=END_USE_ANALYSIS?.analyze(currentAudit)||null;
  exportCopy.portfolioAnalysis=PORTFOLIO_ANALYSIS?.analyze(currentAudit)||null;
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

function updatePackageProgress(event){const labels={validating:"Validating records…",photos:`Exporting photos ${event.done} / ${event.total}`,zipping:`Building ZIP ${event.done} / ${event.total}`,complete:"Verifying package…"};$("export-progress").querySelector("p").textContent=labels[event.stage]||"Preparing package…";$("export-progress-bar").max=Math.max(1,event.total||1);$("export-progress-bar").value=event.done||0;}
function downloadPackage(){if(!preparedPackage)return;const url=URL.createObjectURL(preparedPackage.blob),a=document.createElement("a");a.href=url;a.download=preparedPackage.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function saveOrSharePackage(){if(!preparedPackage)return;const file=new File([preparedPackage.blob],preparedPackage.fileName,{type:"application/zip"});try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:"Audist Audit Package"});return;}}catch(error){if(error?.name==="AbortError")return;console.warn(error);}downloadPackage();}
async function exportAuditPackage(){if(!PACKAGE_EXPORT){alert("Professional export module is unavailable. Refresh once online and retry.");return;}await flushPendingSave();const source=structuredClone(currentAudit),dialog=$("export-dialog");source.utilityAnalysis=UTILITY_ANALYSIS?.analyze(source)||null;preparedPackage=null;$("export-result").classList.add("hidden");$("save-package-btn").classList.add("hidden");$("export-progress").classList.remove("hidden");$("export-progress-bar").value=0;dialog.showModal();try{const stored=await dbGetPhotosForAudit(source.auditId),readiness=WORKFLOW?.exportReadiness(source,CALC_ENGINE)||[];preparedPackage=await PACKAGE_EXPORT.build(source,stored,readiness,updatePackageProgress);const m=preparedPackage.manifest,c=m.counts,failed=m.integrity.status==="FAIL";$("export-progress").classList.add("hidden");$("export-result").classList.remove("hidden");$("export-result").innerHTML=`<h3>Audit Package ${failed?"Incomplete":"Ready"}</h3><div class="review-grid"><div class="metric"><strong>${c.systems}</strong><span>Systems</span></div><div class="metric"><strong>${c.equipment}</strong><span>Equipment</span></div><div class="metric"><strong>${c.measurements}</strong><span>Measurements</span></div><div class="metric"><strong>${c.photosExported}/${c.photosReferenced}</strong><span>Photos</span></div><div class="metric"><strong>${c.ecms}</strong><span>ECMs</span></div><div class="metric"><strong>${c.calculations}</strong><span>Calculations</span></div></div><p class="integrity-${m.integrity.status.toLowerCase()}"><strong>Integrity: ${m.integrity.status.replaceAll("_"," ")}</strong></p>${m.integrity.errors.length?`<details open><summary>${m.integrity.errors.length} error(s)</summary><ul>${m.integrity.errors.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></details>`:""}${m.integrity.warnings.length?`<details><summary>${m.integrity.warnings.length} warning(s)</summary><ul>${m.integrity.warnings.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></details>`:""}`;if(!failed||confirm("The package is incomplete and its manifest records FAIL. Save this expert-review package anyway?"))$("save-package-btn").classList.remove("hidden");}catch(error){console.error(error);$("export-progress").classList.add("hidden");$("export-result").classList.remove("hidden");$("export-result").innerHTML=`<h3>Export Failed</h3><p class="badge-critical">${escapeHtml(error.message||String(error))}</p><p>The audit and stored evidence were not modified.</p>`;}}

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
  const prompt=`Act as a senior energy engineer performing an ASHRAE Level 2 analysis. Review the attached Audist V6.2 audit package. Read manifest.json first, treat audit.json as canonical, and use CSV/photo/report files as interoperable evidence. Keep imported AI reviews and report narrative advisory and separate from deterministic QA. Distinguish standalone ECM savings from adjusted portfolio savings. Respect confirmed interaction methods, sequence traces, excluded alternatives, utility/end-use boundaries, provenance, evidence, maturity, QA flags, stale status, and engineering readiness. Do not invent interaction factors, equipment specifications, measurements, schedules, utility rates, costs, savings, billing periods, end-use allocations, or weather effects.`;
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
$("save-utility-bill").onclick=saveUtilityBill;
$("cancel-utility-bill").onclick=$("close-utility-bill").onclick=()=>$("utility-bill-dialog").close();

$("add-ecm-btn").onclick=()=>openEcm(null);
$("ecm-template").addEventListener("change",updateEcmTemplateInfo);
$("field-mode-btn").onclick=()=>setWorkflowMode("field");
$("analysis-mode-btn").onclick=()=>setWorkflowMode("analysis");
$("confirm-field-review-btn").onclick=()=>confirmQaDeclaration("field");
$("confirm-field-review-onsite-btn").onclick=()=>confirmQaDeclaration("field");
$("confirm-analysis-review-btn").onclick=()=>confirmQaDeclaration("analysis");
$("prepare-ai-review-btn").onclick=prepareAiReview;
$("copy-ai-instructions-btn").onclick=copyAiInstructions;
$("import-ai-review-btn").onclick=()=>$("ai-review-input").click();
$("ai-review-input").onchange=e=>importAiReviewFile(e.target.files?.[0]);
$("add-opportunity-btn").onclick=addOpportunityFlag;
$("refresh-candidates-btn").onclick=renderCandidates;
for(const id of ["field-electricity","field-gas","field-water","field-other-fuel","field-utility-provider","field-rate-schedule","field-history-status","field-approx-rate","field-utility-notes"])$(id).addEventListener("change",saveUtilityFieldSummary);
$("prepare-utility-extraction-btn").onclick=()=>$("utility-source-file").click();
$("utility-source-file").onchange=e=>prepareUtilityExtraction(e.target.files?.[0]);
$("import-utility-response-btn").onclick=()=>$("utility-response-file").click();
$("utility-response-file").onchange=e=>importUtilityExtraction(e.target.files?.[0]);
$("prepare-report-btn").onclick=prepareLevel2Report;
$("copy-report-instructions-btn").onclick=copyReportInstructions;
$("import-report-btn").onclick=()=>$("report-input").click();
$("report-input").onchange=e=>importReportFile(e.target.files?.[0]);
$("manage-groups-btn").onclick=openGroupDialog;
$("close-group").onclick=()=>$("group-dialog").close();
$("cancel-group").onclick=()=>$("group-dialog").close();
$("save-group").onclick=saveGroup;
$("add-end-use-btn").onclick=()=>openEndUse(null);
$("endUseUtility").addEventListener("change",endUseCategories);
$("save-end-use").onclick=()=>{if(!$("endUseUnit").value.trim()){alert("Enter the native annual energy unit for this fuel (for example, gallons/yr).");return;}saveEndUse();};
$("close-end-use").onclick=$("cancel-end-use").onclick=()=>$("end-use-dialog").close();
$("add-portfolio-btn").onclick=()=>openPortfolio(null);
$("save-portfolio").onclick=savePortfolio;
$("close-portfolio").onclick=$("cancel-portfolio").onclick=()=>$("portfolio-dialog").close();
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
$("export-package-btn").onclick=exportAuditPackage;
$("save-package-btn").onclick=saveOrSharePackage;
$("close-export").onclick=$("cancel-export").onclick=()=>$("export-dialog").close();
$("export-migration-backup-btn").onclick=exportMigrationBackup;
$("delete-audit-btn").onclick=deleteCurrentAudit;
$("copy-prompt-btn").onclick=copyPrompt;

showDashboard();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js?v=6.3.0").catch(console.error); }
