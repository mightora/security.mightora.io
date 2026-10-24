import test from 'node:test';
import assert from 'node:assert/strict';
import { demoModel } from '../src/model.js';
import { hierarchySVG, relationshipSVG, heatmapSVG, heatmapRows } from '../src/visuals.js';
test('all three diagrams have exportable SVG markup',()=>{
 const m=demoModel();
 for(const diagram of [hierarchySVG(m),relationshipSVG(m),heatmapSVG(m)]) {
  assert.match(diagram,/<svg /);
  assert.match(diagram,/<\/svg>/);
  assert.doesNotMatch(diagram,/<script/i);
 }
});
test('business unit hierarchy links parent-child data',()=>{
 const diagram=hierarchySVG(demoModel());
 assert.match(diagram,/Marine Claims/);
 assert.match(diagram,/Business-unit hierarchy/);
 assert.match(diagram,/path d=/);
});
test('role-table map only shows configured relationships',()=>{
 const m=demoModel(); const diagram=relationshipSVG(m,'claims-handler');
 assert.match(diagram,/Claims Handler/);
 assert.match(diagram,/Claim/);
 assert.doesNotMatch(diagram,/Claims Supervisor/);
});
test('heatmap filters depth and operation',()=>{
 const m=demoModel();
 const rows=heatmapRows(m,'claims-supervisor','claim','Read',4);
 assert.equal(rows.length,1);
 assert.equal(rows[0].cells.length,1);
 assert.equal(rows[0].cells[0].level,4);
 assert.match(heatmapSVG(m,'claims-supervisor','claim','Read',4),/ORG/);
});
test('imported labels escaped in SVGs',()=>{
 const m=demoModel();m.tables[0].name='<img onerror=alert(1)>';
 const d=relationshipSVG(m);
 assert.doesNotMatch(d,/<img /);
 assert.match(d,/&lt;img/);
});
