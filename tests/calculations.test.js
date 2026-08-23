const test=require("node:test");
const assert=require("node:assert/strict");
const engine=require("../calculations.js");

const input=(parameterId,value,unit,overrides={})=>({parameterId,displayName:parameterId,value,unit,provenance:"Measured",evidenceLevel:"A",sourceDescription:"Field measurement",...overrides});
const value=(result,id)=>result.outputs.find(output=>output.parameterId===id)?.value;
const run=(methodId,inputs,context={})=>engine.run(methodId,inputs,context);

test("registry exposes only the approved Phase 1 methods",()=>{
  assert.deepEqual(Object.keys(engine.METHOD_REGISTRY).sort(),[
    "CALC-ELEC-001","CALC-ELEC-002","CALC-FAN-001","CALC-FAN-002","CALC-FIN-001",
    "CALC-GEN-001","CALC-HVAC-001","CALC-LTG-001","CALC-LTG-002","CALC-UTIL-001"
  ]);
});

test("GEN-001 calculates annual energy and savings",()=>{
  const result=run("CALC-GEN-001",[input("baselineKw",10,"kW"),input("annualHours",3000,"hr/yr"),input("proposedKw",6,"kW")]);
  assert.equal(value(result,"annualEnergyKwh"),30000);
  assert.equal(value(result,"annualKwhSavings"),12000);
});

test("electrical methods calculate single and balanced three-phase real power",()=>{
  assert.equal(value(run("CALC-ELEC-001",[input("voltage",240,"V"),input("current",10,"A"),input("powerFactor",0.9,"fraction")]),"realPowerKw"),2.16);
  assert.ok(Math.abs(value(run("CALC-ELEC-002",[input("lineVoltage",480,"V"),input("lineCurrent",100,"A"),input("powerFactor",0.9,"fraction")]),"realPowerKw")-74.824594886)<2e-9);
});

test("lighting retrofit and controls use explicit watts, quantity, power, and hours",()=>{
  const retrofit=run("CALC-LTG-001",[input("existingFixtureWatts",80,"W"),input("proposedFixtureWatts",30,"W"),input("quantity",100,"count"),input("annualHours",3000,"hr/yr")]);
  assert.equal(value(retrofit,"existingKw"),8);
  assert.equal(value(retrofit,"proposedKw"),3);
  assert.equal(value(retrofit,"demandReductionKw"),5);
  assert.equal(value(retrofit,"annualKwhSavings"),15000);
  const controls=run("CALC-LTG-002",[input("controlledLightingKw",8,"kW"),input("baselineHours",4000,"hr/yr"),input("proposedHours",3000,"hr/yr")]);
  assert.equal(value(controls,"annualKwhSavings"),8000);
});

test("HVAC schedule rejects proposed hours above baseline",()=>{
  const result=run("CALC-HVAC-001",[input("baselineAffectedKw",20,"kW"),input("baselineHours",2000,"hr/yr"),input("proposedHours",2500,"hr/yr")]);
  assert.equal(result.status,"Calculation not ready");
  assert.match(result.errors.join(" "),/cannot exceed baseline/);
});

test("fan measured-power and affinity-bin methods calculate deterministically",()=>{
  const measured=run("CALC-FAN-001",[input("measuredFanKw",10,"kW"),input("annualHours",2000,"hr/yr")]);
  assert.equal(value(measured,"annualFanEnergyKwh"),20000);
  const bins=input("operatingBins",[{speedFraction:0.5,hours:1000},{speedFraction:0.75,hours:2000}],"speed fraction, hr");
  const affinity=run("CALC-FAN-002",[input("baselineFanKw",10,"kW"),bins]);
  assert.equal(value(affinity,"annualKwhSavings"),20312.5);
  assert.equal(affinity.maturity,"ENGINEERING_ESTIMATE");
});

test("utility cost and simple payback are explicit linked stages",()=>{
  const cost=run("CALC-UTIL-001",[input("annualKwhSavings",10000,"kWh/yr"),input("electricRate",0.2,"$/kWh",{provenance:"Utility Bill"})]);
  assert.equal(value(cost,"annualCostSavings"),2000);
  assert.equal(value(run("CALC-FIN-001",[input("netImplementationCost",5000,"$"),input("annualCostSavings",2000,"$/yr")]),"simplePaybackYears"),2.5);
  assert.equal(run("CALC-FIN-001",[input("netImplementationCost",5000,"$"),input("annualCostSavings",0,"$/yr")]).status,"Calculation not ready");
});

test("missing, nonnumeric, negative, wrong-unit, and missing-provenance inputs do not calculate",()=>{
  const cases=[
    [input("baselineKw","bad","kW"),input("annualHours",1,"hr/yr")],
    [input("baselineKw",-1,"kW"),input("annualHours",1,"hr/yr")],
    [input("baselineKw",1,"W"),input("annualHours",1,"hr/yr")],
    [input("baselineKw",1,"kW",{provenance:""}),input("annualHours",1,"hr/yr")],
    [input("baselineKw",1,"kW")]
  ];
  cases.forEach(inputs=>assert.equal(run("CALC-GEN-001",inputs).status,"Calculation not ready"));
});

test("manual inputs cannot calculate without source descriptions or with undocumented estimates",()=>{
  const noSource=[input("baselineKw",10,"kW",{sourceDescription:""}),input("annualHours",3000,"hr/yr")];
  assert.match(run("CALC-GEN-001",noSource).errors.join(" "),/source or assumption description/);
  const undocumented=[input("baselineKw",10,"kW"),input("annualHours",3000,"hr/yr",{provenance:"Estimated",evidenceLevel:"C",assumptionRationale:""})];
  assert.match(run("CALC-GEN-001",undocumented).errors.join(" "),/assumption rationale/);
});

test("assumed/default evidence is visible and caps maturity at screening",()=>{
  const result=run("CALC-GEN-001",[input("baselineKw",10,"kW"),input("annualHours",3000,"hr/yr",{provenance:"Assumed",evidenceLevel:"D",sourceDescription:"Screening assumption",assumptionRationale:"Schedule not yet confirmed"})]);
  assert.equal(result.evidenceLevel,"D");
  assert.equal(result.maturity,"SCREENING");
  assert.ok(result.qaFlags.some(flag=>flag.code==="ASSUMED_DEFAULT_INPUT"));
  assert.match(result.assumptions[0].text,/not yet confirmed/);
});

test("runtime and facility-savings sanity checks emit QA flags",()=>{
  const result=run("CALC-GEN-001",[input("baselineKw",10,"kW"),input("annualHours",9000,"hr/yr"),input("proposedKw",0,"kW")],{audit:{utility:{months:[{kwh:1000}]}}});
  assert.ok(result.qaFlags.some(flag=>flag.code==="RUNTIME_OVER_8760"));
  assert.ok(result.qaFlags.some(flag=>flag.code==="SAVINGS_EXCEED_FACILITY"));
});

test("running a calculation does not mutate supplied inputs",()=>{
  const inputs=[input("baselineKw",10,"kW"),input("annualHours",3000,"hr/yr")];
  const before=structuredClone(inputs);
  run("CALC-GEN-001",inputs);
  assert.deepEqual(inputs,before);
});

test("method definitions carry applicability, units, evidence, source basis, and numerical validation references",()=>{
  Object.values(engine.METHOD_REGISTRY).forEach(method=>{
    assert.ok(method.applicability&&method.formula&&method.inputs.length&&method.outputs.length);
    assert.ok(method.inputs.every(item=>item.unit&&item.acceptedUnits.length));
    assert.match(method.evidenceRequirements,/provenance/);
    assert.match(method.sourceReferenceBasis,/V1\.1/);
    assert.match(method.numericalTestCases,/calculations\.test\.js/);
  });
});

test("source linkage and provenance are preserved in the reproducible input snapshot",()=>{
  const linked=input("baselineKw",10,"kW",{sourceKind:"measurement",sourceRecordId:"m-1",equipmentRecordId:"eq-1",sourceField:"value"});
  linked.sourceFingerprint=engine.sourceFingerprint(linked);
  const result=run("CALC-GEN-001",[linked,input("annualHours",3000,"hr/yr")]);
  assert.equal(result.inputs[0].sourceRecordId,"m-1");
  assert.equal(result.inputs[0].provenance,"Measured");
  assert.equal(result.inputs[0].sourceFingerprint,linked.sourceFingerprint);
});

