import test from 'node:test';
import assert from 'node:assert/strict';
import {createStroke,strokeIntersectsPoint} from '../src/editor/ink.js';
test('normalized stroke hit testing for eraser',()=>{
  const stroke=createStroke('pen','#000',2,{x:.2,y:.2,p:.4});stroke.points.push({x:.8,y:.8,p:.6});
  assert.equal(strokeIntersectsPoint(stroke,{x:.5,y:.5}),true);
  assert.equal(strokeIntersectsPoint(stroke,{x:.1,y:.9}),false);
});
