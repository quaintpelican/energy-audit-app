"use strict";

const fs=require("node:fs"),path=require("node:path"),renderer=require("../report-renderer.js"),fixture=require("../tests/fixtures/v7-synthetic-audit.js");
const root=path.resolve(__dirname,".."),output=path.join(root,"output","pdf"),audit=fixture();
fs.mkdirSync(output,{recursive:true});
// The visual fixture deliberately omits fabricated photography. Real report figures
// are rendered from the audit's selected evidence Blobs without alteration.
audit.equipment[0].photos=[];
const model=renderer.buildModel(audit,{reportId:"SYNTHETIC-V7-VISUAL",generatedAt:"2026-08-24T12:00:00Z",reportDate:"2026-08-24",preparedFor:"Software acceptance testing only",preparedBy:"Audist sample report workflow",projectNumber:"SYNTHETIC-V7",theme:{companyName:"Audist",accentColor:"#123b5d",footerText:"Audist | Synthetic test report",confidentialityText:"SYNTHETIC TEST REPORT - NOT FOR CLIENT USE",logo:"../../audist-icon.png"}});
model.sections.find(s=>s.sectionId==="executive-summary").narrative="This synthetic report demonstrates Audist's professional reporting system. All utility, equipment, ECM, cost, and savings values are fabricated for software and visual acceptance testing; they are not verified engineering results.";
const html=renderer.renderHtml(model,audit);
const htmlPath=path.join(output,"Audist_V7_Premium_Synthetic_Report.html");
fs.writeFileSync(htmlPath,html,"utf8");
console.log(htmlPath);
