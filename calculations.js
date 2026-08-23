(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.AudistCalculations=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const VERSION="1.0";
  const DIRECT_PROVENANCE=new Set(["Measured","BAS / Trend","Utility Bill","Nameplate","Manufacturer","Calculated"]);
  const SITE_ESTIMATE_PROVENANCE=new Set(["Estimated"]);
  const ASSUMED_PROVENANCE=new Set(["Assumed","Default","Deemed","Reference"]);
  const PROVENANCE_OPTIONS=["Measured","Nameplate","Manufacturer","Utility Bill","BAS / Trend","Calculated","Estimated","Assumed"];
  const EVIDENCE_OPTIONS=["A","B","C","D"];

  const input=(parameterId,displayName,unit,options={})=>({parameterId,displayName,acceptedUnits:[unit],unit,...options});
  const output=(parameterId,displayName,unit,value)=>({parameterId,displayName,value:round(value),unit});
  const round=value=>Number.isFinite(value)?Number(value.toPrecision(12)):value;
  const numeric=value=>typeof value==="number"?value:Number(value);
  const hasValue=value=>value!==null&&value!==undefined&&value!=="";
  const get=(inputs,id)=>inputs.find(item=>item.parameterId===id);
  const val=(inputs,id)=>numeric(get(inputs,id)?.value);
  const normalizeUnit=unit=>String(unit||"").trim().toLowerCase().replace(/\s+/g," ");
  const sameUnit=(actual,accepted)=>accepted.some(unit=>normalizeUnit(unit)===normalizeUnit(actual));

  function baseDefinitions(){
    return [
      {
        methodId:"CALC-GEN-001",version:VERSION,title:"Annual Energy From Power and Runtime",
        applicability:"Annual energy or savings where representative baseline/proposed electrical power and affected runtime are supported.",
        formula:"Annual Energy (kWh/yr) = kW × hr/yr; Savings = (Baseline kW - Proposed kW) × affected hr/yr",
        inputs:[input("baselineKw","Baseline Power","kW"),input("annualHours","Affected Annual Runtime","hr/yr"),input("proposedKw","Proposed Power","kW",{optional:true})],
        outputs:["annualEnergyKwh","annualKwhSavings"],
        warnings:["Do not use nameplate capacity as actual operating power without documenting the assumption."],
        calculate(inputs){
          const baseline=val(inputs,"baselineKw"),hours=val(inputs,"annualHours");
          const outputs=[output("annualEnergyKwh","Baseline Annual Energy","kWh/yr",baseline*hours)];
          if(hasValue(get(inputs,"proposedKw")?.value)) outputs.push(output("annualKwhSavings","Annual Energy Savings","kWh/yr",(baseline-val(inputs,"proposedKw"))*hours));
          return outputs;
        }
      },
      {
        methodId:"CALC-ELEC-001",version:VERSION,title:"Single-Phase Real Power",
        applicability:"Single-phase loads with representative voltage, current, and power factor.",
        formula:"kW = V × A × PF / 1000",
        inputs:[input("voltage","Voltage","V"),input("current","Current","A"),input("powerFactor","Power Factor","fraction",{minExclusive:0,max:1})],
        outputs:["realPowerKw"],warnings:["Direct true-power measurement is preferred for variable or nonlinear loads."],
        calculate(inputs){return [output("realPowerKw","Real Power","kW",val(inputs,"voltage")*val(inputs,"current")*val(inputs,"powerFactor")/1000)];}
      },
      {
        methodId:"CALC-ELEC-002",version:VERSION,title:"Balanced Three-Phase Real Power",
        applicability:"Balanced three-phase loads using line-line voltage, line current, and power factor.",
        formula:"kW = √3 × V × A × PF / 1000",
        inputs:[input("lineVoltage","Line-Line Voltage","V"),input("lineCurrent","Line Current","A"),input("powerFactor","Power Factor","fraction",{minExclusive:0,max:1})],
        outputs:["realPowerKw"],warnings:["Do not apply blindly to materially unbalanced loads."],
        calculate(inputs){return [output("realPowerKw","Real Power","kW",Math.sqrt(3)*val(inputs,"lineVoltage")*val(inputs,"lineCurrent")*val(inputs,"powerFactor")/1000)];}
      },
      {
        methodId:"CALC-LTG-001",version:VERSION,title:"Lighting Retrofit",
        applicability:"Like-for-like lighting retrofit with documented fixture input watts, quantity, and affected hours.",
        formula:"Existing kW = Existing W × Quantity / 1000; Proposed kW = Proposed W × Quantity / 1000; Demand Reduction = Existing kW - Proposed kW; Annual kWh Savings = Demand Reduction × Annual Hours",
        inputs:[input("existingFixtureWatts","Existing Fixture Input","W"),input("proposedFixtureWatts","Proposed Fixture Input","W"),input("quantity","Fixture Quantity","count",{integer:true}),input("annualHours","Affected Annual Runtime","hr/yr")],
        outputs:["existingKw","proposedKw","demandReductionKw","annualKwhSavings"],
        warnings:["Maintain required illumination and functionality.","HVAC interactive effects are excluded from this Phase 1 result.","Connected-load reduction is not automatically billing-demand savings."],
        calculate(inputs){
          const existing=val(inputs,"existingFixtureWatts")*val(inputs,"quantity")/1000;
          const proposed=val(inputs,"proposedFixtureWatts")*val(inputs,"quantity")/1000;
          const reduction=existing-proposed;
          return [output("existingKw","Existing Connected Power","kW",existing),output("proposedKw","Proposed Connected Power","kW",proposed),output("demandReductionKw","Connected-Load Reduction","kW",reduction),output("annualKwhSavings","Annual Energy Savings","kWh/yr",reduction*val(inputs,"annualHours"))];
        }
      },
      {
        methodId:"CALC-LTG-002",version:VERSION,title:"Lighting Controls",
        applicability:"Lighting controls with supported controlled power and baseline/proposed hours.",
        formula:"Annual kWh Savings = Controlled Lighting kW × (Baseline Hours - Proposed Hours)",
        inputs:[input("controlledLightingKw","Controlled Lighting Power","kW"),input("baselineHours","Baseline Annual Hours","hr/yr"),input("proposedHours","Proposed Annual Hours","hr/yr")],
        outputs:["annualKwhSavings"],warnings:["No generic occupancy-sensor savings factor is supplied."],
        calculate(inputs){return [output("annualKwhSavings","Annual Energy Savings","kWh/yr",val(inputs,"controlledLightingKw")*(val(inputs,"baselineHours")-val(inputs,"proposedHours")))];}
      },
      {
        methodId:"CALC-HVAC-001",version:VERSION,title:"HVAC Schedule Reduction",
        applicability:"Schedule reduction where representative affected electrical operating power and baseline/proposed hours are supported.",
        formula:"Annual kWh Savings = Baseline Affected kW × (Baseline Hours - Proposed Hours)",
        inputs:[input("baselineAffectedKw","Baseline Affected Operating Power","kW",{rejectNameplateCapacity:true}),input("baselineHours","Baseline Annual Hours","hr/yr"),input("proposedHours","Proposed Annual Hours","hr/yr")],
        outputs:["annualKwhSavings"],warnings:["Review warm-up/pull-down, humidity, ventilation, process requirements, freeze protection, optimum start/stop, and operating/load variation.","HVAC nameplate cooling capacity is not electrical operating power."],
        calculate(inputs){return [output("annualKwhSavings","Annual Energy Savings","kWh/yr",val(inputs,"baselineAffectedKw")*(val(inputs,"baselineHours")-val(inputs,"proposedHours")))];}
      },
      {
        methodId:"CALC-FAN-001",version:VERSION,title:"Fan Energy From Measured Power",
        applicability:"Fan annual energy using representative measured true power and annual runtime.",
        formula:"Annual Fan Energy = Measured Fan kW × Annual Hours",
        inputs:[input("measuredFanKw","Measured Fan Power","kW",{allowedProvenance:["Measured","BAS / Trend"]}),input("annualHours","Annual Runtime","hr/yr")],
        outputs:["annualFanEnergyKwh"],warnings:["Confirm measured power represents the operating period being annualized."],
        calculate(inputs){return [output("annualFanEnergyKwh","Annual Fan Energy","kWh/yr",val(inputs,"measuredFanKw")*val(inputs,"annualHours"))];}
      },
      {
        methodId:"CALC-FAN-002",version:VERSION,title:"Fan VFD / Affinity-Law Screening",
        applicability:"Applicable variable-torque fan systems with supported baseline power and operating speed/hour bins.",
        formula:"P2 = P1 × (N2/N1)^3; Annual Savings = Σ[(P1 - P2) × Hours_bin]",
        inputs:[input("baselineFanKw","Representative Baseline Fan Power","kW"),{parameterId:"operatingBins",displayName:"Speed/Hour Bins",unit:"speed fraction, hr",acceptedUnits:["speed fraction, hr"],type:"bins"}],
        outputs:["annualKwhSavings"],warnings:["Screening method only; the cube law alone cannot establish HIGH_CONFIDENCE_ESTIMATE.","Review significant fixed/static pressure, minimum ventilation, nonrepresentative baseline power, damper/control interactions, changing system resistance, and material VFD/motor losses."],
        calculate(inputs){
          const baseline=val(inputs,"baselineFanKw");
          const bins=get(inputs,"operatingBins").value;
          const savings=bins.reduce((sum,bin)=>sum+(baseline-baseline*Math.pow(numeric(bin.speedFraction),3))*numeric(bin.hours),0);
          return [output("annualKwhSavings","Annual Fan Energy Savings","kWh/yr",savings)];
        }
      },
      {
        methodId:"CALC-UTIL-001",version:VERSION,title:"Simple Energy Cost",
        applicability:"Simple annual electric-energy savings valued at one applicable or blended energy rate.",
        formula:"Annual Cost Savings = Annual kWh Savings × $/kWh",
        inputs:[input("annualKwhSavings","Annual Energy Savings","kWh/yr"),input("electricRate","Applicable Electric Energy Rate","$/kWh")],
        outputs:["annualCostSavings"],warnings:["A blended rate is a simplification and excludes time-of-use and demand effects."],
        calculate(inputs){return [output("annualCostSavings","Annual Cost Savings","$/yr",val(inputs,"annualKwhSavings")*val(inputs,"electricRate"))];}
      },
      {
        methodId:"CALC-FIN-001",version:VERSION,title:"Simple Payback",
        applicability:"Simple screening economics with documented net implementation cost and positive annual cost savings.",
        formula:"Simple Payback (yr) = Net Implementation Cost / Annual Cost Savings",
        inputs:[input("netImplementationCost","Net Implementation Cost","$"),input("annualCostSavings","Annual Cost Savings","$/yr",{minExclusive:0})],
        outputs:["simplePaybackYears"],warnings:["Simple payback excludes discounting, escalation, financing, measure life, and replacement cycles."],
        calculate(inputs){return [output("simplePaybackYears","Simple Payback","yr",val(inputs,"netImplementationCost")/val(inputs,"annualCostSavings"))];}
      }
    ];
  }

  const REFERENCE_BASIS={
    "CALC-GEN-001":"Audist Engineering Calculation Library CA V1.1 §5.1",
    "CALC-ELEC-001":"Audist Engineering Calculation Library CA V1.1 §5.2",
    "CALC-ELEC-002":"Audist Engineering Calculation Library CA V1.1 §5.3",
    "CALC-LTG-001":"Audist Engineering Calculation Library CA V1.1 §6.1",
    "CALC-LTG-002":"Audist Engineering Calculation Library CA V1.1 §6.2",
    "CALC-HVAC-001":"Audist Engineering Calculation Library CA V1.1 §7.1",
    "CALC-FAN-001":"Audist Engineering Calculation Library CA V1.1 §7.2",
    "CALC-FAN-002":"Audist Engineering Calculation Library CA V1.1 §7.3",
    "CALC-UTIL-001":"Audist Engineering Calculation Library CA V1.1 §11.1",
    "CALC-FIN-001":"Audist Engineering Calculation Library CA V1.1 §12.1"
  };
  const METHOD_REGISTRY=Object.fromEntries(baseDefinitions().map(method=>[method.methodId,Object.freeze({
    ...method,
    evidenceRequirements:"Every material input requires unit, provenance, evidence level, and a visible source or assumption description. Level D/default inputs cap maturity at SCREENING.",
    sourceReferenceBasis:REFERENCE_BASIS[method.methodId],
    numericalTestCases:`Automated deterministic case: tests/calculations.test.js (${method.methodId}).`
  })]));

  function validateInputs(method,inputs){
    const missing=[],errors=[];
    for(const requirement of method.inputs){
      const provided=get(inputs,requirement.parameterId);
      if(!provided||!hasValue(provided.value)){if(!requirement.optional) missing.push(requirement.displayName);continue;}
      if(requirement.type==="bins"){
        if(!Array.isArray(provided.value)||provided.value.length===0){errors.push(`${requirement.displayName} must contain at least one operating bin.`);continue;}
        provided.value.forEach((bin,index)=>{
          const speed=numeric(bin.speedFraction),hours=numeric(bin.hours);
          if(!Number.isFinite(speed)||speed<0||speed>1) errors.push(`Operating bin ${index+1} speed fraction must be between 0 and 1.`);
          if(!Number.isFinite(hours)||hours<0) errors.push(`Operating bin ${index+1} hours must be a non-negative number.`);
        });
      }else{
        const number=numeric(provided.value);
        if(!Number.isFinite(number)) errors.push(`${requirement.displayName} must be numeric.`);
        if(Number.isFinite(number)&&number<0) errors.push(`${requirement.displayName} cannot be negative.`);
        if(requirement.minExclusive!==undefined&&number<=requirement.minExclusive) errors.push(`${requirement.displayName} must be greater than ${requirement.minExclusive}.`);
        if(requirement.max!==undefined&&number>requirement.max) errors.push(`${requirement.displayName} cannot exceed ${requirement.max}.`);
        if(requirement.integer&&!Number.isInteger(number)) errors.push(`${requirement.displayName} must be a whole number.`);
      }
      if(!provided.unit||!sameUnit(provided.unit,requirement.acceptedUnits)) errors.push(`${requirement.displayName} requires unit ${requirement.acceptedUnits.join(" or ")}.`);
      if(!provided.provenance) errors.push(`${requirement.displayName} requires provenance.`);
      if(!provided.evidenceLevel||!EVIDENCE_OPTIONS.includes(provided.evidenceLevel)) errors.push(`${requirement.displayName} requires evidence level A, B, C, or D.`);
      if(!String(provided.sourceDescription||"").trim()) errors.push(`${requirement.displayName} requires a source or assumption description.`);
      if((SITE_ESTIMATE_PROVENANCE.has(provided.provenance)||ASSUMED_PROVENANCE.has(provided.provenance))&&!String(provided.assumptionRationale||"").trim()) errors.push(`${requirement.displayName} requires an assumption rationale for ${provided.provenance} provenance.`);
      if(requirement.allowedProvenance&&!requirement.allowedProvenance.includes(provided.provenance)) errors.push(`${requirement.displayName} must use ${requirement.allowedProvenance.join(" or ")} provenance.`);
    }
    for(const pair of [["baselineHours","proposedHours"]]){
      if(get(inputs,pair[0])&&get(inputs,pair[1])&&val(inputs,pair[1])>val(inputs,pair[0])) errors.push("Proposed hours cannot exceed baseline hours for an avoided-runtime savings calculation.");
    }
    return {missing,errors};
  }

  function classifyEvidence(inputs,methodId){
    const material=inputs.filter(item=>hasValue(item.value));
    let evidenceLevel="B";
    if(material.some(item=>item.evidenceLevel==="D"||ASSUMED_PROVENANCE.has(item.provenance))) evidenceLevel="D";
    else if(material.some(item=>item.evidenceLevel==="C"||SITE_ESTIMATE_PROVENANCE.has(item.provenance))) evidenceLevel="C";
    else if(material.length&&material.every(item=>item.evidenceLevel==="A"&&DIRECT_PROVENANCE.has(item.provenance))) evidenceLevel="A";
    const maturity=evidenceLevel==="D"?"SCREENING":evidenceLevel==="A"&&methodId!=="CALC-FAN-002"?"HIGH_CONFIDENCE_ESTIMATE":"ENGINEERING_ESTIMATE";
    return {evidenceLevel,maturity};
  }

  function facilityAnnualElectricity(audit){
    const values=(audit?.utility?.months||[]).map(month=>numeric(month.kwh)).filter(Number.isFinite);
    return values.length?values.reduce((sum,value)=>sum+value,0):null;
  }

  function buildQaFlags(method,inputs,outputs,context={}){
    const flags=[];
    const add=(code,message)=>{if(!flags.some(flag=>flag.code===code)) flags.push({code,severity:"review",message});};
    inputs.forEach(item=>{
      if(/hours/i.test(item.parameterId)&&numeric(item.value)>8760) add("RUNTIME_OVER_8760",`${item.displayName} exceeds 8,760 hr/year.`);
      if(!item.provenance) add("MISSING_PROVENANCE",`${item.displayName} has no provenance.`);
      if(item.evidenceLevel==="D"||ASSUMED_PROVENANCE.has(item.provenance)) add("ASSUMED_DEFAULT_INPUT",`${item.displayName} depends on an assumed/default/reference input.`);
    });
    if(method.methodId==="CALC-LTG-001"&&val(inputs,"proposedFixtureWatts")>=val(inputs,"existingFixtureWatts")) add("PROPOSED_NOT_LOWER","Proposed lighting power is not lower than baseline power.");
    if(method.methodId==="CALC-LTG-001") add("DEMAND_NOT_INFERRED","Connected-load reduction is not billing-demand savings without peak-coincidence support.");
    if(method.methodId==="CALC-HVAC-001"&&get(inputs,"baselineAffectedKw")?.sourceField&&/capacity|tons/i.test(get(inputs,"baselineAffectedKw").sourceField)) add("NAMEPLATE_CAPACITY_AS_POWER","Nameplate capacity appears to have been selected as operating kW.");
    if(method.methodId==="CALC-FAN-002") add("FAN_AFFINITY_APPLICABILITY","Review fixed/static pressure, ventilation minimums, control interactions, resistance changes, and drive losses before relying on cube-law screening.");
    const linkedEquipment=new Set(context.ecm?.affectedEquipmentRecordIds||[]);
    inputs.filter(item=>item.sourceKind==="equipment"||item.sourceKind==="measurement").forEach(item=>{
      if(item.equipmentRecordId&&!linkedEquipment.has(item.equipmentRecordId)) add("EQUIPMENT_NOT_ON_ECM",`${item.displayName} uses equipment not associated with this ECM.`);
    });
    const annual=outputs.find(item=>item.parameterId==="annualKwhSavings")?.value;
    const facility=facilityAnnualElectricity(context.audit);
    if(Number.isFinite(annual)&&Number.isFinite(facility)&&annual>facility) add("SAVINGS_EXCEED_FACILITY",`Calculated annual kWh savings exceed the available facility annual electricity consumption (${round(facility)} kWh).`);
    return flags;
  }

  function run(methodId,rawInputs,context={}){
    const method=METHOD_REGISTRY[methodId];
    if(!method) return {status:"Calculation not ready",missing:[],errors:[`Unknown approved method: ${methodId}`],warnings:[],qaFlags:[]};
    const inputs=structuredClone(rawInputs||[]);
    const validation=validateInputs(method,inputs);
    const assumptions=inputs.filter(item=>item.provenance==="Assumed"||item.evidenceLevel==="D").map(item=>({parameterId:item.parameterId,text:item.assumptionRationale||`${item.displayName} is an assumed/default input.`,source:item.sourceDescription||"Unspecified"}));
    const warnings=[...method.warnings];
    if(assumptions.length) warnings.push("Savings depend on an assumed/default input. Collect site-specific evidence before finalizing this ECM where practical.");
    if(validation.missing.length||validation.errors.length) return {status:"Calculation not ready",methodId,methodVersion:method.version,formulaDescription:method.formula,inputs,outputs:[],assumptions,warnings,qaFlags:[],...validation};
    const outputs=method.calculate(inputs);
    if(outputs.some(item=>!Number.isFinite(item.value))) return {status:"Calculation not ready",methodId,methodVersion:method.version,formulaDescription:method.formula,inputs,outputs:[],assumptions,warnings,qaFlags:[],missing:[],errors:["Calculation produced a non-finite result."]};
    const classification=classifyEvidence(inputs,methodId);
    return {status:"Calculated",methodId,methodVersion:method.version,formulaDescription:method.formula,inputs,outputs,assumptions,warnings,qaFlags:buildQaFlags(method,inputs,outputs,context),missing:[],errors:[],...classification};
  }

  function sourceFingerprint(input){
    return JSON.stringify({value:input.value,unit:input.unit,provenance:input.provenance,evidenceLevel:input.evidenceLevel,sourceKind:input.sourceKind||null,sourceRecordId:input.sourceRecordId||null,sourceField:input.sourceField||null});
  }

  return {VERSION,METHOD_REGISTRY,PROVENANCE_OPTIONS,EVIDENCE_OPTIONS,run,validateInputs,classifyEvidence,sourceFingerprint};
});

