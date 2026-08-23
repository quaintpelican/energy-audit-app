(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.AudistCalculations=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const VERSION="1.1";
  const READY="READY-V1";
  const VALIDATE="VALIDATE-V2";
  const DIRECT_PROVENANCE=new Set(["Measured","BAS / Trend","Utility Bill","Nameplate","Manufacturer","Calculated"]);
  const ESTIMATE_PROVENANCE=new Set(["Estimated"]);
  const ASSUMED_PROVENANCE=new Set(["Assumed","Default","Deemed","Reference"]);
  const PROVENANCE_OPTIONS=["Measured","Nameplate","Manufacturer","Utility Bill","BAS / Trend","Calculated","Estimated","Assumed"];
  const EVIDENCE_OPTIONS=["A","B","C","D"];
  const CANONICAL_UNITS=Object.freeze([
    "W","kW","kWh","kWh/yr","V","A","fraction","Hz","rpm","%","gpm","ft head","cfm","Btu/h","Btu","Btu/yr",
    "therm/yr","MMBtu","ton","°F","Δ°F","Btu/lb","gallons/day","days/year","hr/yr","kW/ton","kW/100 cfm",
    "COP","Btu/(hr·ft²·°F)","ft²","degree-hours","$/kWh","$/kW","$/yr","$","yr","hp","count",
    "speed fraction, hr","kWh and $/kWh","kW and $/kW","year and $"
  ]);

  const numeric=value=>typeof value==="number"?value:Number(value);
  const hasValue=value=>value!==null&&value!==undefined&&value!=="";
  const get=(inputs,id)=>inputs.find(item=>item.parameterId===id);
  const val=(inputs,id)=>numeric(get(inputs,id)?.value);
  const round=value=>Number.isFinite(value)?Number(value.toPrecision(12)):value;
  const normalizeUnit=unit=>String(unit||"").trim().toLowerCase().replace(/\s+/g," ");
  const sameUnit=(actual,accepted)=>accepted.some(unit=>normalizeUnit(unit)===normalizeUnit(actual));
  const input=(parameterId,displayName,unit,options={})=>({parameterId,displayName,unit,acceptedUnits:[unit],...options});
  const enumInput=(parameterId,displayName,options,settings={})=>({parameterId,displayName,type:"enum",unit:"selection",acceptedUnits:["selection"],options,...settings});
  const seriesInput=(parameterId,displayName,unit,fields,settings={})=>({parameterId,displayName,type:"series",unit,acceptedUnits:[unit],fields,...settings});
  const output=(parameterId,displayName,unit,value)=>({parameterId,displayName,value:round(value),unit});
  const method=(methodId,title,definition)=>({
    methodId,title,version:VERSION,status:READY,implementationStatus:"IMPLEMENTED",recommendedInputs:[],
    evidenceRequirements:"Every material input requires an explicit unit, provenance, evidence level, and source or assumption description. Estimated/Assumed inputs require a rationale; Level D caps maturity at SCREENING.",
    sourceReferenceBasis:"Audist Engineering Calculation Library CA V1.1",
    numericalTestCases:`Automated deterministic cases: tests/calculations.test.js (${methodId}).`,
    ...definition
  });
  const pending=(methodId,title,applicableSystemTypes,inputs,recommendedInputs,warnings)=>method(methodId,title,{
    status:VALIDATE,implementationStatus:"REQUIRES_ENGINEERING_VALIDATION",applicableSystemTypes,inputs,recommendedInputs,
    applicability:"Method and field-readiness definition recognized; governing deterministic savings methodology is not yet validated.",
    formula:"Not yet validated — no numerical savings formula is executed.",
    outputs:[],warnings
  });

  function readyMethods(){
    return [
      method("CALC-GEN-001","Annual Energy From Power and Runtime",{
        applicableSystemTypes:["Other","MotorsDrives","Fans","Pumps","PlugLoads","ProcessLoads"],
        applicability:"Annual energy or savings where representative baseline/proposed electrical power and affected runtime are supported.",
        formula:"Annual Energy = Baseline kW × hr/yr; Savings = (Baseline kW - Proposed kW) × affected hr/yr",
        inputs:[input("baselineKw","Baseline Power","kW"),input("annualHours","Affected Annual Runtime","hr/yr"),input("proposedKw","Proposed Power","kW",{optional:true})],
        outputs:["annualEnergyKwh","annualKwhSavings"],warnings:["Nameplate capacity is not actual operating power without an explicit documented assumption."],
        calculate(i){const b=val(i,"baselineKw"),h=val(i,"annualHours"),o=[output("annualEnergyKwh","Baseline Annual Energy","kWh/yr",b*h)];if(hasValue(get(i,"proposedKw")?.value))o.push(output("annualKwhSavings","Annual Energy Savings","kWh/yr",(b-val(i,"proposedKw"))*h));return o;}
      }),
      method("CALC-ELEC-001","Single-Phase Real Power",{
        applicableSystemTypes:["Other","MotorsDrives","Fans","Pumps","PlugLoads","ProcessLoads"],
        applicability:"Single-phase loads with representative voltage, current, and power factor.",formula:"kW = V × A × PF / 1000",
        inputs:[input("voltage","Voltage","V"),input("current","Current","A"),input("powerFactor","Power Factor","fraction",{minExclusive:0,max:1})],
        outputs:["realPowerKw"],warnings:["Direct true-power measurement is preferred for variable or nonlinear loads."],
        calculate(i){return [output("realPowerKw","Real Power","kW",val(i,"voltage")*val(i,"current")*val(i,"powerFactor")/1000)];}
      }),
      method("CALC-ELEC-002","Balanced Three-Phase Real Power",{
        applicableSystemTypes:["Other","MotorsDrives","Fans","Pumps","PackagedHVAC","ChilledWater"],
        applicability:"Balanced three-phase loads using line-line voltage, line current, and power factor.",formula:"kW = √3 × V × A × PF / 1000",
        inputs:[input("lineVoltage","Line-Line Voltage","V"),input("lineCurrent","Line Current","A"),input("powerFactor","Power Factor","fraction",{minExclusive:0,max:1})],
        outputs:["realPowerKw"],warnings:["Do not apply blindly to materially unbalanced loads."],
        calculate(i){return [output("realPowerKw","Real Power","kW",Math.sqrt(3)*val(i,"lineVoltage")*val(i,"lineCurrent")*val(i,"powerFactor")/1000)];}
      }),
      method("CALC-LTG-001","Lighting Retrofit",{
        applicableSystemTypes:["Lighting"],applicability:"Like-for-like lighting retrofit with documented fixture input watts, quantity, and affected hours.",
        formula:"Existing kW = Existing W × Quantity / 1000; Proposed kW = Proposed W × Quantity / 1000; Savings = (Existing kW - Proposed kW) × Annual Hours",
        inputs:[input("existingFixtureWatts","Existing Fixture Input","W"),input("proposedFixtureWatts","Proposed Fixture Input","W"),input("quantity","Fixture Quantity","count",{integer:true}),input("annualHours","Affected Annual Runtime","hr/yr")],
        outputs:["existingKw","proposedKw","demandReductionKw","annualKwhSavings"],
        warnings:["Maintain required illumination and functionality.","HVAC interactive effects are separate components.","Connected-load reduction is not billing-demand savings."],
        calculate(i){const e=val(i,"existingFixtureWatts")*val(i,"quantity")/1000,p=val(i,"proposedFixtureWatts")*val(i,"quantity")/1000,d=e-p;return [output("existingKw","Existing Connected Power","kW",e),output("proposedKw","Proposed Connected Power","kW",p),output("demandReductionKw","Connected-Load Reduction","kW",d),output("annualKwhSavings","Annual Energy Savings","kWh/yr",d*val(i,"annualHours"))];}
      }),
      method("CALC-LTG-002","Lighting Controls",{
        applicableSystemTypes:["Lighting"],applicability:"Lighting controls with supported controlled power and baseline/proposed hours.",
        formula:"Annual kWh Savings = Controlled Lighting kW × (Baseline Hours - Proposed Hours)",
        inputs:[input("controlledLightingKw","Controlled Lighting Power","kW"),input("baselineHours","Baseline Annual Hours","hr/yr"),input("proposedHours","Proposed Annual Hours","hr/yr")],
        outputs:["annualKwhSavings"],warnings:["No generic occupancy-sensor reduction factor is supplied."],
        calculate(i){return [output("annualKwhSavings","Annual Energy Savings","kWh/yr",val(i,"controlledLightingKw")*(val(i,"baselineHours")-val(i,"proposedHours")))];}
      }),
      method("CALC-HVAC-001","HVAC Schedule Reduction",{
        applicableSystemTypes:["PackagedHVAC","AirHandling","BASControls"],applicability:"Schedule reduction with supported affected electrical operating power and baseline/proposed hours.",
        formula:"Annual kWh Savings = Baseline Affected kW × (Baseline Hours - Proposed Hours)",
        inputs:[input("baselineAffectedKw","Baseline Affected Operating Power","kW"),input("baselineHours","Baseline Annual Hours","hr/yr"),input("proposedHours","Proposed Annual Hours","hr/yr")],
        outputs:["annualKwhSavings"],warnings:["Review warm-up/pull-down, humidity, ventilation, process, freeze protection, and load variation.","Cooling capacity is not electrical operating kW."],
        calculate(i){return [output("annualKwhSavings","Annual Energy Savings","kWh/yr",val(i,"baselineAffectedKw")*(val(i,"baselineHours")-val(i,"proposedHours")))];}
      }),
      method("CALC-FAN-001","Fan Energy From Measured Power",{
        applicableSystemTypes:["Fans","AirHandling","PackagedHVAC"],applicability:"Fan annual energy using representative measured true power and runtime.",formula:"Annual Fan Energy = Measured Fan kW × Annual Hours",
        inputs:[input("measuredFanKw","Measured Fan Power","kW",{allowedProvenance:["Measured","BAS / Trend"]}),input("annualHours","Annual Runtime","hr/yr")],
        outputs:["annualFanEnergyKwh"],warnings:["Confirm measured power represents the annualized operating period."],
        calculate(i){return [output("annualFanEnergyKwh","Annual Fan Energy","kWh/yr",val(i,"measuredFanKw")*val(i,"annualHours"))];}
      }),
      method("CALC-FAN-002","Fan VFD / Affinity-Law Screening",{
        applicableSystemTypes:["Fans","AirHandling","PackagedHVAC"],applicability:"Applicable variable-torque fan systems with supported baseline power and speed/hour bins.",
        formula:"P2 = P1 × (N2/N1)^3; Annual Savings = Σ[(P1 - P2) × Hours_bin]",
        inputs:[input("baselineFanKw","Representative Baseline Fan Power","kW"),{parameterId:"operatingBins",displayName:"Speed/Hour Bins",unit:"speed fraction, hr",acceptedUnits:["speed fraction, hr"],type:"bins"}],
        recommendedInputs:["staticPressureProfile","minimumVentilation","systemCurve"],outputs:["annualKwhSavings"],
        warnings:["Affinity-law screening cannot alone establish high-confidence maturity.","Review static pressure, minimum ventilation, control interactions, system resistance, and drive losses."],
        calculate(i){const b=val(i,"baselineFanKw");return [output("annualKwhSavings","Annual Fan Energy Savings","kWh/yr",get(i,"operatingBins").value.reduce((s,x)=>s+(b-b*Math.pow(numeric(x.speedFraction),3))*numeric(x.hours),0))];}
      }),
      method("CALC-PUMP-001","Pump Hydraulic and Input Power",{
        applicableSystemTypes:["Pumps","ChilledWater","BoilersHeatingWater"],applicability:"Pump input power from supported flow, TDH, fluid SG, pump efficiency, and motor efficiency; measured input kW is preferred when representative.",
        formula:"Hydraulic hp = Q × H × SG / 3960; Modeled kW = Hydraulic hp × 0.746 / (ηpump × ηmotor)",
        inputs:[input("flowGpm","Flow","gpm"),input("totalDynamicHeadFt","Total Dynamic Head","ft head"),input("specificGravity","Fluid Specific Gravity","fraction",{minExclusive:0}),input("pumpEfficiency","Pump Efficiency","fraction",{minExclusive:0,max:1}),input("motorEfficiency","Motor Efficiency","fraction",{minExclusive:0,max:1}),input("measuredInputKw","Measured Input Power","kW",{optional:true,allowedProvenance:["Measured","BAS / Trend"]})],
        outputs:["hydraulicHp","modeledElectricalKw","electricalKw"],warnings:["Do not assume pump or motor efficiency.","Measured input kW is preferred when simultaneous and representative."],
        calculate(i){const hp=val(i,"flowGpm")*val(i,"totalDynamicHeadFt")*val(i,"specificGravity")/3960,modeled=hp*0.746/(val(i,"pumpEfficiency")*val(i,"motorEfficiency")),measured=get(i,"measuredInputKw");return [output("hydraulicHp","Hydraulic Power","hp",hp),output("modeledElectricalKw","Modeled Electrical Input","kW",modeled),output("electricalKw","Selected Electrical Input","kW",hasValue(measured?.value)?numeric(measured.value):modeled)];}
      }),
      method("CALC-PUMP-002","Pump VFD / Affinity-Law Screening",{
        applicableSystemTypes:["Pumps","ChilledWater","BoilersHeatingWater"],applicability:"Variable-torque pump screening with supported baseline input power and speed/hour bins.",
        formula:"Q2/Q1=N2/N1; H2/H1=(N2/N1)^2; P2/P1=(N2/N1)^3; Savings=Σ[(P1-P2)×Hours]",
        inputs:[input("baselinePumpKw","Representative Baseline Pump Power","kW"),{parameterId:"operatingBins",displayName:"Speed/Hour Bins",unit:"speed fraction, hr",acceptedUnits:["speed fraction, hr"],type:"bins"},enumInput("significantStaticHead","Significant Static Head",["Yes","No","Unknown"])],
        recommendedInputs:["actualSystemCurve","differentialPressureTrend"],outputs:["annualKwhSavings"],warnings:["Significant static head can invalidate ideal cube-law savings; use actual system and pump curves for higher confidence."],
        calculate(i){const b=val(i,"baselinePumpKw");return [output("annualKwhSavings","Annual Pump Energy Savings","kWh/yr",get(i,"operatingBins").value.reduce((s,x)=>s+(b-b*Math.pow(numeric(x.speedFraction),3))*numeric(x.hours),0))];}
      }),
      method("CALC-WTR-001","Water-Side Thermal Load",{
        applicableSystemTypes:["ChilledWater","BoilersHeatingWater"],applicability:"Approximate water-side load near normal HVAC water conditions using sufficiently simultaneous flow and ΔT.",
        formula:"Btu/h = 500 × gpm × ΔT; Cooling tons = Btu/h / 12,000",
        inputs:[input("flowGpm","Water Flow","gpm"),input("deltaTemperatureF","Water Temperature Difference","Δ°F"),enumInput("fluidType","Fluid",["Water","Glycol","Other"]),enumInput("simultaneousMeasurements","Flow and Temperatures Simultaneous",["Yes","No","Unknown"])],
        outputs:["thermalLoadBtuPerHour","coolingTons"],warnings:["The factor 500 approximates water density × specific heat × 60 min/hr.","Use fluid-specific properties for glycol/non-water fluids or unusual temperatures."],
        calculate(i){const q=500*val(i,"flowGpm")*val(i,"deltaTemperatureF");return [output("thermalLoadBtuPerHour","Water-Side Thermal Load","Btu/h",q),output("coolingTons","Cooling Load","ton",q/12000)];}
      }),
      method("CALC-CHW-001","Chiller Operating Efficiency",{
        applicableSystemTypes:["ChilledWater"],applicability:"Chiller efficiency from simultaneous electrical power and cooling tons with an explicit electrical boundary.",
        formula:"kW/ton = Chiller kW / Simultaneous Cooling Tons",
        inputs:[input("chillerKw","Electrical Input","kW"),input("simultaneousCoolingTons","Simultaneous Cooling Load","ton",{minExclusive:0}),enumInput("electricalBoundary","Electrical Boundary",["Chiller only","Chiller + pumps","Plant","Other"]),enumInput("simultaneousMeasurements","Power and Load Simultaneous",["Yes","No","Unknown"])],
        outputs:["operatingEfficiencyKwPerTon"],warnings:["Do not mix baseline and proposed electrical boundaries.","Cooling tons may depend on CALC-WTR-001 only when flow and temperatures are adequately supported."],
        calculate(i){return [output("operatingEfficiencyKwPerTon","Operating Efficiency","kW/ton",val(i,"chillerKw")/val(i,"simultaneousCoolingTons"))];}
      }),
      method("CALC-AIR-001","Air-Side Sensible Heat Transfer",{
        applicableSystemTypes:["AirHandling","PackagedHVAC"],applicability:"Approximate standard-air sensible load; latent load is excluded.",formula:"Sensible Btu/h = 1.08 × cfm × ΔT",
        inputs:[input("airflowCfm","Airflow","cfm"),input("deltaTemperatureF","Dry-Bulb Temperature Difference","Δ°F"),enumInput("latentLoadMaterial","Latent Load Material",["Yes","No","Unknown"])],
        outputs:["sensibleLoadBtuPerHour"],warnings:["1.08 is an approximate standard-air constant.","Correct for nonstandard density when higher accuracy is required.","Do not use sensible-only results without warning when latent load is material."],
        calculate(i){return [output("sensibleLoadBtuPerHour","Sensible Heat Transfer","Btu/h",1.08*val(i,"airflowCfm")*val(i,"deltaTemperatureF"))];}
      }),
      method("CALC-AIR-002","Air-Side Total Heat Transfer From Enthalpy",{
        applicableSystemTypes:["AirHandling","PackagedHVAC"],applicability:"Approximate standard-air total heat transfer from airflow and internally consistent enthalpy difference.",formula:"Total Btu/h = 4.5 × cfm × Δh",
        inputs:[input("airflowCfm","Airflow","cfm"),input("enthalpyDifference","Enthalpy Difference","Btu/lb"),enumInput("psychrometricInputsConsistent","Psychrometric Inputs Internally Consistent",["Yes","No"],{mustEqual:"Yes"})],
        outputs:["totalLoadBtuPerHour"],warnings:["4.5 is an approximate standard-air constant; psychrometric states must be internally consistent."],
        calculate(i){return [output("totalLoadBtuPerHour","Total Heat Transfer","Btu/h",4.5*val(i,"airflowCfm")*val(i,"enthalpyDifference"))];}
      }),
      method("CALC-BLR-001","Boiler Efficiency Upgrade",{
        applicableSystemTypes:["BoilersHeatingWater","Steam"],applicability:"Fuel savings from supported useful annual load and baseline/proposed seasonal or system efficiencies.",
        formula:"Baseline Fuel = Useful Load/η1; Proposed Fuel = Useful Load/η2; Savings = Useful Load×(1/η1-1/η2)",
        inputs:[input("usefulLoadBtu","Annual Useful Load","Btu/yr",{optional:true}),input("baselineFuelInputBtu","Supported Baseline Fuel Input","Btu/yr",{optional:true}),input("baselineEfficiency","Baseline Seasonal/System Efficiency","fraction",{minExclusive:0,max:1}),input("proposedEfficiency","Proposed Seasonal/System Efficiency","fraction",{minExclusive:0,max:1}),enumInput("baselineEfficiencyBasis","Baseline Efficiency Basis",["Seasonal/system","Combustion/nameplate","Measured/modelled"])],
        outputs:["usefulLoadBtu","baselineFuelInputBtu","proposedFuelInputBtu","fuelSavingsBtu","fuelSavingsTherms"],
        warnings:["Nameplate combustion efficiency is not automatically seasonal/system efficiency."],
        validate(i){if(!hasValue(get(i,"usefulLoadBtu")?.value)&&!hasValue(get(i,"baselineFuelInputBtu")?.value))return ["Provide annual useful load or independently supported baseline fuel input."];return [];},
        calculate(i){const e1=val(i,"baselineEfficiency"),useful=hasValue(get(i,"usefulLoadBtu")?.value)?val(i,"usefulLoadBtu"):val(i,"baselineFuelInputBtu")*e1,b=useful/e1,p=useful/val(i,"proposedEfficiency"),s=b-p;return [output("usefulLoadBtu","Annual Useful Load","Btu/yr",useful),output("baselineFuelInputBtu","Baseline Fuel Input","Btu/yr",b),output("proposedFuelInputBtu","Proposed Fuel Input","Btu/yr",p),output("fuelSavingsBtu","Annual Fuel Savings","Btu/yr",s),output("fuelSavingsTherms","Annual Fuel Savings","therm/yr",s/100000)];}
      }),
      method("CALC-DHW-001","Domestic Hot Water Thermal Load",{
        applicableSystemTypes:["DHW"],applicability:"Useful DHW load from daily volume, inlet/delivery temperatures, and operating days.",formula:"Daily Btu = gal/day × 8.33 × ΔT; Annual Useful Btu = Daily Btu × operating days",
        inputs:[input("dailyGallons","Daily Hot-Water Volume","gallons/day"),input("inletTemperatureF","Inlet Temperature","°F"),input("deliveryTemperatureF","Delivery Temperature","°F"),input("operatingDays","Operating Days","days/year",{integer:true,max:366})],
        outputs:["dailyUsefulBtu","annualUsefulBtu"],warnings:["8.33 lb/gal approximates water density.","Recirculation, storage, standby, distribution, and process losses are separate."],
        validate(i){return val(i,"deliveryTemperatureF")<val(i,"inletTemperatureF")?["Delivery temperature cannot be below inlet temperature for a heating-load calculation."]:[];},
        calculate(i){const d=val(i,"dailyGallons")*8.33*(val(i,"deliveryTemperatureF")-val(i,"inletTemperatureF"));return [output("dailyUsefulBtu","Daily Useful Thermal Load","Btu",d),output("annualUsefulBtu","Annual Useful Thermal Load","Btu/yr",d*val(i,"operatingDays"))];}
      }),
      method("CALC-DHW-002","Water-Heating Efficiency / Fuel Switch",{
        applicableSystemTypes:["DHW"],applicability:"Baseline/proposed annual consumption from a supported useful load with explicitly selected combustion or electric/COP performance.",
        formula:"Combustion Fuel Input = Useful Load/Efficiency; Electric kWh = Useful Load/(3412×COP)",
        inputs:[input("annualUsefulBtu","Annual Useful Load","Btu/yr"),enumInput("baselineTechnology","Baseline Technology",["Combustion","Electric / heat pump"]),input("baselineEfficiency","Baseline Combustion Efficiency","fraction",{optional:true,minExclusive:0,max:1}),input("baselineCop","Baseline Electric / Heat-Pump COP","COP",{optional:true,minExclusive:0}),enumInput("proposedTechnology","Proposed Technology",["Combustion","Electric / heat pump"]),input("proposedEfficiency","Proposed Combustion Efficiency","fraction",{optional:true,minExclusive:0,max:1}),input("proposedCop","Proposed Electric / Heat-Pump COP","COP",{optional:true,minExclusive:0}),enumInput("copBasis","COP Basis",["Not applicable","Rated","Annual/system","Measured/modelled"])],
        outputs:["baselineFuelInputBtu","proposedFuelInputBtu","baselineElectricKwh","proposedElectricKwh"],warnings:["Rated COP is not automatically annual system COP.","Do not combine unlike fuel/electric quantities into a single energy-savings number without an approved conversion/economic stage."],
        validate(i){const errors=[];const required=(technology,efficiency,cop,label)=>{if(technology==="Combustion"&&!hasValue(get(i,efficiency)?.value))errors.push(`${label} combustion efficiency is required.`);if(technology==="Electric / heat pump"&&!hasValue(get(i,cop)?.value))errors.push(`${label} COP is required.`);};required(get(i,"baselineTechnology")?.value,"baselineEfficiency","baselineCop","Baseline");required(get(i,"proposedTechnology")?.value,"proposedEfficiency","proposedCop","Proposed");return errors;},
        calculate(i){const u=val(i,"annualUsefulBtu"),o=[];if(get(i,"baselineTechnology").value==="Combustion")o.push(output("baselineFuelInputBtu","Baseline Fuel Input","Btu/yr",u/val(i,"baselineEfficiency")));else o.push(output("baselineElectricKwh","Baseline Electric Consumption","kWh/yr",u/(3412*val(i,"baselineCop"))));if(get(i,"proposedTechnology").value==="Combustion")o.push(output("proposedFuelInputBtu","Proposed Fuel Input","Btu/yr",u/val(i,"proposedEfficiency")));else o.push(output("proposedElectricKwh","Proposed Electric Consumption","kWh/yr",u/(3412*val(i,"proposedCop"))));return o;}
      }),
      method("CALC-REF-001","Evaporator / Case Fan Retrofit",{
        applicableSystemTypes:["Refrigeration"],applicability:"Direct evaporator/case fan electrical savings with explicit input watts, quantity, and hours.",formula:"Direct kWh Savings = (Baseline W - Proposed W) × Quantity × Hours / 1000",
        inputs:[input("baselineFanWatts","Baseline Fan Input","W"),input("proposedFanWatts","Proposed Fan Input","W"),input("quantity","Fan Quantity","count",{integer:true}),input("annualHours","Affected Annual Runtime","hr/yr")],
        outputs:["annualKwhSavings"],warnings:["Refrigeration interactive effects are excluded and remain a separate future component."],
        calculate(i){return [output("annualKwhSavings","Direct Annual Fan Savings","kWh/yr",(val(i,"baselineFanWatts")-val(i,"proposedFanWatts"))*val(i,"quantity")*val(i,"annualHours")/1000)];}
      }),
      method("CALC-CA-001","Compressed-Air End-Use / Leak Energy",{
        applicableSystemTypes:["CompressedAir"],applicability:"End-use/leak savings when reduced flow and actual system/control specific power are supported.",
        formula:"kW Reduction = Flow Reduction cfm × Specific Power kW/100cfm / 100; Savings = kW Reduction × Hours",
        inputs:[input("flowReductionCfm","Flow Reduction","cfm"),input("specificPower","System Specific Power","kW/100 cfm"),input("annualHours","Affected Annual Runtime","hr/yr"),enumInput("specificPowerBasis","Specific Power Basis",["Measured system","BAS / Trend","Engineering model","Generic / unsupported"])],
        outputs:["kwReduction","annualKwhSavings"],warnings:["Do not use a generic kW/100 cfm factor as site-specific savings.","Specific power must represent the actual compressor-system/control condition."],
        calculate(i){const k=val(i,"flowReductionCfm")*val(i,"specificPower")/100;return [output("kwReduction","Power Reduction","kW",k),output("annualKwhSavings","Annual Energy Savings","kWh/yr",k*val(i,"annualHours"))];}
      }),
      method("CALC-ENV-001","Envelope Conductive Load Difference",{
        applicableSystemTypes:["Envelope"],applicability:"Conductive-load screening only; utility savings require a separate HVAC conversion.",formula:"Instantaneous ΔBtu/h = ΔU×Area×ΔT; Annual Thermal Btu = ΔU×Area×Degree-Hours",
        inputs:[input("existingUFactor","Existing U-Factor","Btu/(hr·ft²·°F)"),input("proposedUFactor","Proposed U-Factor","Btu/(hr·ft²·°F)"),input("areaSqFt","Envelope Area","ft²"),enumInput("calculationMode","Calculation Mode",["Instantaneous","Annual"]),input("deltaTemperatureF","Temperature Difference","Δ°F",{optional:true}),input("degreeHours","Degree-Hours","degree-hours",{optional:true})],
        outputs:["instantaneousLoadReductionBtuPerHour","annualThermalLoadReductionBtu"],
        warnings:["Does not capture solar effects, infiltration, thermal bridges, dynamic mass, HVAC cycling, or humidity.","Do not present thermal load difference as utility savings without a separate HVAC conversion."],
        validate(i){const mode=get(i,"calculationMode")?.value;if(mode==="Instantaneous"&&!hasValue(get(i,"deltaTemperatureF")?.value))return ["Instantaneous mode requires Temperature Difference."];if(mode==="Annual"&&!hasValue(get(i,"degreeHours")?.value))return ["Annual mode requires Degree-Hours."];return [];},
        calculate(i){const du=val(i,"existingUFactor")-val(i,"proposedUFactor"),a=val(i,"areaSqFt");return get(i,"calculationMode").value==="Instantaneous"?[output("instantaneousLoadReductionBtuPerHour","Conductive Load Reduction","Btu/h",du*a*val(i,"deltaTemperatureF"))]:[output("annualThermalLoadReductionBtu","Annual Conductive Thermal Reduction","Btu/yr",du*a*val(i,"degreeHours"))];}
      }),
      method("CALC-UTIL-001","Simple Energy Cost",{
        applicableSystemTypes:["Utility"],applicability:"Annual electric energy savings valued at an explicit applicable or blended rate.",formula:"Annual Cost Savings = Annual kWh Savings × $/kWh",
        inputs:[input("annualKwhSavings","Annual Energy Savings","kWh/yr"),input("electricRate","Applicable Electric Energy Rate","$/kWh")],
        outputs:["annualCostSavings"],warnings:["A blended rate is a simplification and excludes time-of-use and demand effects."],
        calculate(i){return [output("annualCostSavings","Annual Cost Savings","$/yr",val(i,"annualKwhSavings")*val(i,"electricRate"))];}
      }),
      method("CALC-UTIL-002","Time-of-Use Energy Cost",{
        applicableSystemTypes:["Utility"],applicability:"Period-specific energy savings valued with actual project rates.",formula:"Annual Energy Cost Savings = Σ(kWh_period × Rate_period)",
        inputs:[seriesInput("touPeriods","TOU Savings Periods","kWh and $/kWh",[{id:"label",type:"text"},{id:"kwh",type:"number",min:0},{id:"rate",type:"number",min:0}])],
        outputs:["annualCostSavings"],warnings:["Rates must be actual project data; no California tariff is hardcoded."],
        calculate(i){return [output("annualCostSavings","Annual TOU Energy Cost Savings","$/yr",get(i,"touPeriods").value.reduce((s,x)=>s+numeric(x.kwh)*numeric(x.rate),0))];}
      }),
      method("CALC-UTIL-003","Demand-Charge Savings",{
        applicableSystemTypes:["Utility"],applicability:"Period-specific coincident peak demand reduction valued with actual project demand rates.",formula:"Demand Cost Savings = Σ(Peak kW Reduction_period × Demand Rate_period)",
        inputs:[seriesInput("demandPeriods","Demand Savings Periods","kW and $/kW",[{id:"label",type:"text"},{id:"peakKwReduction",type:"number",min:0},{id:"demandRate",type:"number",min:0},{id:"coincidenceSupported",type:"boolean"}])],
        outputs:["annualDemandCostSavings"],warnings:["Connected-load reduction is not billing-demand reduction; peak coincidence must be supported."],
        validate(i){return get(i,"demandPeriods").value.some(x=>x.coincidenceSupported!==true)?["Every demand period requires explicit peak-coincidence support."]:[];},
        calculate(i){return [output("annualDemandCostSavings","Annual Demand Cost Savings","$/yr",get(i,"demandPeriods").value.reduce((s,x)=>s+numeric(x.peakKwReduction)*numeric(x.demandRate),0))];}
      }),
      method("CALC-FIN-001","Simple Payback",{
        applicableSystemTypes:["Financial"],applicability:"Simple screening economics with documented net cost and positive annual cost savings.",formula:"Simple Payback = Net Implementation Cost / Annual Cost Savings",
        inputs:[input("netImplementationCost","Net Implementation Cost","$"),input("annualCostSavings","Annual Cost Savings","$/yr",{minExclusive:0})],
        outputs:["simplePaybackYears"],warnings:["Excludes discounting, escalation, financing, measure life, and replacement cycles."],
        calculate(i){return [output("simplePaybackYears","Simple Payback","yr",val(i,"netImplementationCost")/val(i,"annualCostSavings"))];}
      }),
      method("CALC-FIN-002","Net Present Value",{
        applicableSystemTypes:["Financial"],applicability:"NPV with an explicit initial cost, discount rate, analysis period, and period cash flows.",formula:"NPV = -C0 + Σ[CFt/(1+r)^t]",
        inputs:[input("initialCost","Initial Cost","$"),input("discountRate","Discount Rate","fraction",{min:0}),input("analysisPeriod","Analysis Period","yr",{integer:true,minExclusive:0}),seriesInput("cashFlows","Cash Flows by Year","year and $",[{id:"year",type:"number",min:1,integer:true},{id:"cashFlow",type:"number"}]),enumInput("cashFlowConvention","Cash-Flow Convention",["End of year","Beginning of year"])],
        outputs:["netPresentValue"],warnings:["No discount rate, escalation, cash flow, or measure life is assumed.","Document the cash-flow convention and use NIST/BLCC conventions for formal LCCA."],
        validate(i){const p=val(i,"analysisPeriod"),flows=get(i,"cashFlows").value,years=flows.map(x=>numeric(x.year));const e=[];if(years.some(y=>y>p))e.push("Cash-flow year cannot exceed the analysis period.");if(new Set(years).size!==years.length)e.push("Cash-flow years must be unique.");return e;},
        calculate(i){const r=val(i,"discountRate"),begin=get(i,"cashFlowConvention").value==="Beginning of year",pv=get(i,"cashFlows").value.reduce((s,x)=>s+numeric(x.cashFlow)/Math.pow(1+r,numeric(x.year)-(begin?1:0)),0);return [output("netPresentValue","Net Present Value","$",pv-val(i,"initialCost"))];}
      })
    ];
  }

  function validateMethods(){
    const commonEvidence=["equipment association","baseline definition","proposed definition","affected operation","provenance"];
    return [
      pending("CALC-HVAC-002","Unitary HVAC Efficiency Upgrade",["PackagedHVAC"],[input("baselineEfficiency","Baseline Efficiency","fraction"),input("proposedEfficiency","Proposed Efficiency","fraction"),input("loadProfile","Load Profile","kWh/yr")],[...commonEvidence,"weather/load profile","fan interaction","manufacturer performance"],["No flat efficiency or percent-savings assumption is permitted."]),
      pending("CALC-HVAC-003","Economizer Repair / Optimization",["PackagedHVAC","AirHandling","BASControls"],[input("outsideAirTemperature","Outside-Air Temperature","°F"),input("returnAirTemperature","Return-Air Temperature","°F"),input("supplyAirTemperature","Supply-Air Temperature","°F")],[...commonEvidence,"weather bins/hourly data","OA/RA psychrometrics","minimum ventilation","cooling efficiency","control limits"],["Do not use a flat percent savings assumption."]),
      pending("CALC-CTRL-001","BAS / HVAC Controls",["BASControls","PackagedHVAC","AirHandling","ChilledWater","BoilersHeatingWater"],[input("baselineAffectedKw","Affected Baseline Power","kW"),input("baselineHours","Baseline Hours","hr/yr")],[...commonEvidence,"specific control sequence","trends before/after","affected loads"],["Calculate specific control changes; no generic BAS savings percentage."]),
      pending("CALC-CHW-002","Chiller Efficiency / Plant Optimization",["ChilledWater"],[input("baselinePlantKw","Baseline Plant Power","kW"),input("coolingTons","Cooling Load","ton")],[...commonEvidence,"simultaneous load/kW","part-load profile","condenser conditions","plant boundary","staging","proposed performance"],["Do not mix chiller-only and plant boundaries."]),
      pending("CALC-REF-002","Refrigeration Floating Head Pressure",["Refrigeration"],[input("baselineRackKw","Baseline Rack Power","kW")],[...commonEvidence,"compressor/rack performance","ambient distribution","condensing controls","minimum pressure"],["Weather/load and compressor performance methodology requires validation."]),
      pending("CALC-REF-003","Anti-Sweat Heater Controls",["Refrigeration"],[input("connectedHeaterKw","Connected Heater Load","kW"),input("baselineHours","Baseline Hours","hr/yr")],[...commonEvidence,"baseline duty","proposed duty/control","ambient conditions"],["Do not assume a generic duty-cycle reduction."]),
      pending("CALC-FOOD-001","Commercial Food-Service Equipment",["ProcessLoads","Other"],[input("baselineAnnualEnergy","Baseline Annual Energy","kWh/yr"),input("proposedAnnualEnergy","Proposed Annual Energy","kWh/yr")],[...commonEvidence,"specific appliance class","measured or standardized/manufacturer performance","usage profile"],["No generic appliance savings percentage."]),
      pending("CALC-KV-001","Demand-Control Kitchen Ventilation",["Fans","AirHandling","ProcessLoads"],[input("baselineFanKw","Baseline Fan Power","kW"),input("baselineHours","Baseline Hours","hr/yr")],[...commonEvidence,"proposed speed profile","makeup-air heating/cooling interaction","hood control strategy"],["Direct fan savings may use CALC-FAN-002; thermal interactions remain separate components."]),
      pending("CALC-PLUG-001","Plug-Load Scheduling / Controls",["PlugLoads"],[input("controlledKw","Controlled Load","kW"),input("verifiedAvoidedHours","Verified Avoided Hours","hr/yr")],[...commonEvidence,"verified schedule/avoidance"],["Avoid generic percent savings unless explicitly documented as a screening assumption."]),
      pending("CALC-RCX-001","Retrocommissioning / Operational Measures",["BASControls","Other"],[],[...commonEvidence,"explicit individual operational changes","before/after trends"],["Represent RCx as explicit component calculations, not one generic percentage."]),
      pending("CALC-FIN-003","Savings-to-Investment Ratio",["Financial"],[input("presentValueSavings","Present Value of Savings","$"),input("presentValueInvestmentCosts","Present Value of Investment-Related Costs","$")],[...commonEvidence,"replacement/residual/cost boundaries","NIST/FEMP definition"],["SIR remains unimplemented until lifecycle cost boundaries are defined."])
    ];
  }

  const METHOD_REGISTRY=Object.fromEntries([...readyMethods(),...validateMethods()].map(x=>[x.methodId,Object.freeze(x)]));

  function validateSeries(requirement,value){
    const errors=[];
    if(!Array.isArray(value)||value.length===0)return [`${requirement.displayName} must contain at least one row.`];
    value.forEach((row,index)=>requirement.fields.forEach(field=>{
      const v=row?.[field.id];
      if(field.type==="text"&&!String(v||"").trim())errors.push(`${requirement.displayName} row ${index+1} requires ${field.id}.`);
      if(field.type==="boolean"&&typeof v!=="boolean")errors.push(`${requirement.displayName} row ${index+1} requires true/false ${field.id}.`);
      if(field.type==="number"){
        const n=numeric(v);
        if(!Number.isFinite(n))errors.push(`${requirement.displayName} row ${index+1} ${field.id} must be numeric.`);
        if(Number.isFinite(n)&&field.min!==undefined&&n<field.min)errors.push(`${requirement.displayName} row ${index+1} ${field.id} cannot be below ${field.min}.`);
        if(field.integer&&Number.isFinite(n)&&!Number.isInteger(n))errors.push(`${requirement.displayName} row ${index+1} ${field.id} must be a whole number.`);
      }
    }));
    return errors;
  }

  function validateInputs(methodDef,inputs,{readinessOnly=false}={}){
    const missing=[],errors=[];
    for(const requirement of methodDef.inputs){
      const provided=get(inputs,requirement.parameterId);
      if(!provided||!hasValue(provided.value)){if(!requirement.optional)missing.push(requirement.displayName);continue;}
      if(requirement.type==="bins"){
        if(!Array.isArray(provided.value)||provided.value.length===0)errors.push(`${requirement.displayName} must contain at least one operating bin.`);
        else provided.value.forEach((bin,index)=>{const speed=numeric(bin.speedFraction),hours=numeric(bin.hours);if(!Number.isFinite(speed)||speed<0||speed>1)errors.push(`Operating bin ${index+1} speed fraction must be between 0 and 1.`);if(!Number.isFinite(hours)||hours<0)errors.push(`Operating bin ${index+1} hours must be non-negative.`);});
      }else if(requirement.type==="series") errors.push(...validateSeries(requirement,provided.value));
      else if(requirement.type==="enum"){
        if(!requirement.options.includes(provided.value))errors.push(`${requirement.displayName} must use an approved selection.`);
        if(requirement.mustEqual!==undefined&&provided.value!==requirement.mustEqual)errors.push(`${requirement.displayName} must be ${requirement.mustEqual} before calculation.`);
      }else{
        const n=numeric(provided.value);
        if(!Number.isFinite(n))errors.push(`${requirement.displayName} must be numeric.`);
        if(Number.isFinite(n)&&n<0)errors.push(`${requirement.displayName} cannot be negative.`);
        if(requirement.min!==undefined&&n<requirement.min)errors.push(`${requirement.displayName} cannot be below ${requirement.min}.`);
        if(requirement.minExclusive!==undefined&&n<=requirement.minExclusive)errors.push(`${requirement.displayName} must be greater than ${requirement.minExclusive}.`);
        if(requirement.max!==undefined&&n>requirement.max)errors.push(`${requirement.displayName} cannot exceed ${requirement.max}.`);
        if(requirement.integer&&Number.isFinite(n)&&!Number.isInteger(n))errors.push(`${requirement.displayName} must be a whole number.`);
      }
      if(!provided.unit||!sameUnit(provided.unit,requirement.acceptedUnits))errors.push(`${requirement.displayName} requires unit ${requirement.acceptedUnits.join(" or ")}.`);
      if(!readinessOnly){
        if(!provided.provenance)errors.push(`${requirement.displayName} requires provenance.`);
        if(!provided.evidenceLevel||!EVIDENCE_OPTIONS.includes(provided.evidenceLevel))errors.push(`${requirement.displayName} requires evidence level A, B, C, or D.`);
        if(!String(provided.sourceDescription||"").trim())errors.push(`${requirement.displayName} requires a source or assumption description.`);
        if((ESTIMATE_PROVENANCE.has(provided.provenance)||ASSUMED_PROVENANCE.has(provided.provenance))&&!String(provided.assumptionRationale||"").trim())errors.push(`${requirement.displayName} requires an assumption rationale for ${provided.provenance} provenance.`);
        if(requirement.allowedProvenance&&!requirement.allowedProvenance.includes(provided.provenance))errors.push(`${requirement.displayName} must use ${requirement.allowedProvenance.join(" or ")} provenance.`);
      }
    }
    if(get(inputs,"baselineHours")&&get(inputs,"proposedHours")&&val(inputs,"proposedHours")>val(inputs,"baselineHours"))errors.push("Proposed hours cannot exceed baseline hours for avoided-runtime savings.");
    if(methodDef.validate&&missing.length===0)errors.push(...methodDef.validate(inputs));
    return {missing,errors};
  }

  function classifyEvidence(inputs,methodId){
    const material=inputs.filter(x=>hasValue(x.value));
    let evidenceLevel="B";
    if(material.some(x=>x.evidenceLevel==="D"||ASSUMED_PROVENANCE.has(x.provenance)))evidenceLevel="D";
    else if(material.some(x=>x.evidenceLevel==="C"||ESTIMATE_PROVENANCE.has(x.provenance)))evidenceLevel="C";
    else if(material.length&&material.every(x=>x.evidenceLevel==="A"&&DIRECT_PROVENANCE.has(x.provenance)))evidenceLevel="A";
    const p=id=>get(inputs,id)?.provenance;
    const high=evidenceLevel==="A"&&(
      (["CALC-ELEC-001","CALC-ELEC-002"].includes(methodId)&&material.every(x=>["Measured","BAS / Trend"].includes(x.provenance)))||
      (methodId==="CALC-GEN-001"&&["Measured","BAS / Trend"].includes(p("baselineKw"))&&p("annualHours")==="BAS / Trend")||
      (methodId==="CALC-LTG-001"&&["Nameplate","Manufacturer","Measured"].includes(p("existingFixtureWatts"))&&["Manufacturer","Nameplate"].includes(p("proposedFixtureWatts"))&&p("annualHours")==="BAS / Trend")||
      (methodId==="CALC-FAN-001"&&["Measured","BAS / Trend"].includes(p("measuredFanKw"))&&p("annualHours")==="BAS / Trend")
    );
    return {evidenceLevel,maturity:evidenceLevel==="D"?"SCREENING":high?"HIGH_CONFIDENCE_ESTIMATE":"ENGINEERING_ESTIMATE"};
  }

  function annualUtility(audit,key){const values=(audit?.utility?.months||[]).map(x=>numeric(x[key])).filter(Number.isFinite);return values.length?values.reduce((s,x)=>s+x,0):null;}
  function buildQaFlags(methodDef,inputs,outputs,context={}){
    const flags=[],add=(code,message,severity="review")=>{if(!flags.some(x=>x.code===code))flags.push({code,severity,message});};
    inputs.forEach(x=>{if(/hours/i.test(x.parameterId)&&numeric(x.value)>8760)add("RUNTIME_OVER_8760",`${x.displayName} exceeds 8,760 hr/year.`);if(x.evidenceLevel==="D"||ASSUMED_PROVENANCE.has(x.provenance))add("ASSUMED_DEFAULT_INPUT",`${x.displayName} depends on assumed/default/reference evidence.`);});
    const m=methodDef.methodId;
    if(["CALC-LTG-001","CALC-REF-001"].includes(m)&&val(inputs,m==="CALC-LTG-001"?"proposedFixtureWatts":"proposedFanWatts")>=val(inputs,m==="CALC-LTG-001"?"existingFixtureWatts":"baselineFanWatts"))add("PROPOSED_NOT_LOWER","Proposed input power is not lower than baseline power.");
    if(m==="CALC-LTG-001")add("DEMAND_NOT_INFERRED","Connected-load reduction is not billing-demand savings without peak coincidence.");
    if(m==="CALC-FAN-002")add("FAN_AFFINITY_APPLICABILITY","Review static pressure, ventilation minimums, resistance, control interactions, and drive losses.");
    if(m==="CALC-PUMP-002"&&get(inputs,"significantStaticHead")?.value!=="No")add("PUMP_STATIC_HEAD","Significant or unknown static head may invalidate ideal cube-law savings.");
    if(m==="CALC-WTR-001"&&get(inputs,"fluidType")?.value!=="Water")add("FLUID_PROPERTIES_REQUIRED","Non-water fluid requires fluid-specific density and heat capacity review.");
    if(["CALC-WTR-001","CALC-CHW-001"].includes(m)&&get(inputs,"simultaneousMeasurements")?.value!=="Yes")add("NON_SIMULTANEOUS_MEASUREMENTS","This method requires sufficiently simultaneous operating measurements.");
    if(m==="CALC-CHW-001"&&!get(inputs,"electricalBoundary")?.value)add("MISSING_CALCULATION_BOUNDARY","Chiller electrical boundary is missing.");
    if(m==="CALC-AIR-001"&&get(inputs,"latentLoadMaterial")?.value!=="No")add("SENSIBLE_ONLY_WITH_LATENT_LOAD","Latent load is material or unknown; sensible-only load is incomplete.");
    if(m==="CALC-BLR-001"&&get(inputs,"baselineEfficiencyBasis")?.value==="Combustion/nameplate")add("COMBUSTION_NOT_SEASONAL","Combustion/nameplate efficiency is not automatically seasonal/system efficiency.");
    if(m==="CALC-DHW-002"&&get(inputs,"copBasis")?.value==="Rated")add("RATED_COP_NOT_ANNUAL","Rated COP is not automatically annual system COP.");
    if(m==="CALC-CA-001"&&get(inputs,"specificPowerBasis")?.value==="Generic / unsupported")add("SPECIFIC_POWER_SITE_BASIS","Compressed-air specific power lacks a supported site-system basis.");
    if(m==="CALC-UTIL-001")add("BLENDED_RATE_SIMPLIFICATION","A single/blended energy rate is a simplification.");
    if(m==="CALC-UTIL-003")add("DEMAND_COINCIDENCE_REQUIRED","Demand savings require explicit peak-coincidence evidence.");
    if(m==="CALC-ENV-001")add("ENVELOPE_NOT_UTILITY_SAVINGS","Envelope conductive-load output is not utility savings without a separate HVAC conversion.");
    const associated=new Set(context.ecm?.affectedEquipmentRecordIds||[]);
    inputs.filter(x=>["equipment","measurement"].includes(x.sourceKind)).forEach(x=>{if(x.equipmentRecordId&&!associated.has(x.equipmentRecordId))add("EQUIPMENT_NOT_ON_ECM",`${x.displayName} uses equipment not associated with this ECM.`);});
    const kwh=outputs.find(x=>x.parameterId==="annualKwhSavings")?.value,facilityKwh=annualUtility(context.audit,"kwh");
    if(Number.isFinite(kwh)&&Number.isFinite(facilityKwh)&&kwh>facilityKwh)add("SAVINGS_EXCEED_FACILITY","Calculated annual kWh savings exceed facility annual electricity use.");
    const therms=outputs.find(x=>x.parameterId==="fuelSavingsTherms")?.value,facilityTherms=annualUtility(context.audit,"therms");
    if(Number.isFinite(therms)&&Number.isFinite(facilityTherms)&&therms>facilityTherms)add("FUEL_SAVINGS_EXCEED_FACILITY","Calculated annual fuel savings exceed facility annual fuel use.");
    const meta=context.metadata||{},equipment=new Set(meta.equipmentRecordIds||context.ecm?.affectedEquipmentRecordIds||[]);
    (context.audit?.calculations||[]).filter(x=>x.status==="Calculated"&&x.ecmId!==context.ecm?.ecmId).forEach(other=>{
      const overlap=(other.equipmentRecordIds||[]).some(id=>equipment.has(id));
      if(overlap&&meta.affectedEndUse&&other.affectedEndUse===meta.affectedEndUse&&meta.baselineEnergyStream&&other.baselineEnergyStream===meta.baselineEnergyStream)add("POTENTIAL_ECM_OVERLAP",`Potential overlap with ${other.calculationId} / ${other.ecmId} on the same equipment, end use, and baseline stream.`);
    });
    return flags;
  }

  function assessReadiness(methodId,rawInputs=[]){
    const methodDef=METHOD_REGISTRY[methodId];
    if(!methodDef)return {status:"UNKNOWN_METHOD",missing:[],available:[],recommended:[],errors:[`Unknown method: ${methodId}`]};
    const inputs=structuredClone(rawInputs||[]),validation=validateInputs(methodDef,inputs,{readinessOnly:true});
    const available=methodDef.inputs.filter(req=>hasValue(get(inputs,req.parameterId)?.value)).map(req=>req.displayName);
    return {status:methodDef.status===VALIDATE?"METHOD_REQUIRES_VALIDATION":validation.missing.length||validation.errors.length?"NOT_READY":"READY",missing:validation.missing,available,recommended:[...(methodDef.recommendedInputs||[])],errors:validation.errors,implementationStatus:methodDef.implementationStatus};
  }

  function run(methodId,rawInputs,context={}){
    const methodDef=METHOD_REGISTRY[methodId];
    if(!methodDef)return {status:"Calculation not ready",missing:[],errors:[`Unknown approved method: ${methodId}`],warnings:[],qaFlags:[]};
    const inputs=structuredClone(rawInputs||[]),validation=validateInputs(methodDef,inputs);
    const assumptions=inputs.filter(x=>x.provenance==="Assumed"||x.evidenceLevel==="D").map(x=>({parameterId:x.parameterId,text:x.assumptionRationale||`${x.displayName} is assumed/default evidence.`,source:x.sourceDescription||"Unspecified"}));
    const warnings=[...methodDef.warnings];if(assumptions.length)warnings.push("Savings depend on assumed/default evidence; collect site-specific evidence where practical.");
    const base={methodId,methodVersion:methodDef.version,methodStatus:methodDef.status,formulaDescription:methodDef.formula,inputs,assumptions,warnings,missing:validation.missing,errors:validation.errors};
    if(methodDef.status===VALIDATE){const material=inputs.filter(x=>hasValue(x.value));const classification=material.length?classifyEvidence(inputs,methodId):{evidenceLevel:null,maturity:"NOT_ASSESSED"};return {...base,status:"METHOD_REQUIRES_VALIDATION",outputs:[],qaFlags:[],...classification,readiness:assessReadiness(methodId,inputs)};}
    if(validation.missing.length||validation.errors.length)return {...base,status:"Calculation not ready",outputs:[],qaFlags:[]};
    const outputs=methodDef.calculate(inputs);
    if(outputs.some(x=>!Number.isFinite(x.value)))return {...base,status:"Calculation not ready",outputs:[],qaFlags:[],missing:[],errors:["Calculation produced a non-finite result."]};
    const classification=classifyEvidence(inputs,methodId);
    return {...base,status:"Calculated",outputs,qaFlags:buildQaFlags(methodDef,inputs,outputs,context),missing:[],errors:[],...classification};
  }

  function sourceFingerprint(input){
    return JSON.stringify({value:input.value,unit:input.unit,provenance:input.provenance,evidenceLevel:input.evidenceLevel,sourceKind:input.sourceKind||null,sourceRecordId:input.sourceRecordId||null,sourceField:input.sourceField||null,sourceVersion:input.sourceVersion||null});
  }

  return {VERSION,READY,VALIDATE,METHOD_REGISTRY,CANONICAL_UNITS,PROVENANCE_OPTIONS,EVIDENCE_OPTIONS,run,assessReadiness,validateInputs,classifyEvidence,sourceFingerprint};
});

