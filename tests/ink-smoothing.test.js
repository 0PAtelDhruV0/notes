import test from 'node:test';
import assert from 'node:assert/strict';
import {renderStrokes,stabilizeInkPoints} from '../src/editor/ink.js';
test('jitter filter keeps endpoints and softens a noisy midpoint',()=>{
 const raw=[{x:0.1,y:.1,p:.3},{x:.2,y:.27,p:.8},{x:.3,y:.3,p:.2},{x:.4,y:.4,p:.7}];
 const result=stabilizeInkPoints(raw,800,800);
 assert.equal(result[0].x,80);
 assert.equal(result.at(-1).x,320);
 assert.notEqual(result[1].y,raw[1].y*800);
 assert.ok(result.every(p=>Number.isFinite(p.p)));
});
test('pressure rendering responds to variable pressure and preserves data',()=>{
 const widths=[];
 const ctx={
  clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
  quadraticCurveTo(){},stroke(){widths.push(this.lineWidth);},
  arc(){},fill(){},ellipse(){},rect(){},closePath(){},
  bezierCurveTo(){}
 };
 const pts=Array.from({length:20},(_,i)=>({x:.1+i*.02,y:.2+i*.013,p:i<10?.12:.98}));
 const original=JSON.stringify(pts);
 renderStrokes(ctx,[{tool:'pen',color:'#222',size:3,points:pts}],800,800);
 assert.ok(widths.length>1);
 assert.ok(Math.max(...widths)-Math.min(...widths)>.5);
 assert.equal(JSON.stringify(pts),original);
});
