import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPageZoom} from '../src/editor/zoom.js';

function fakeSurface(){
 const listeners={};
 const eventTarget={
  clientWidth:1000,clientHeight:800,
  getBoundingClientRect:()=>({left:0,top:0,width:1000,height:800}),
  addEventListener:(name,fn)=>listeners[name]=fn,
  removeEventListener:(name)=>delete listeners[name]
 };
 const surface={offsetWidth:1000,offsetHeight:800,style:{}};
 const buttons=['in','out','reset'].map(zoom=>({dataset:{zoom},disabled:false}));
 const value={textContent:'100%'};
 const controls={
  addEventListener:(name,fn)=>listeners['control-'+name]=fn,
  removeEventListener:(name)=>delete listeners['control-'+name],
  querySelector:()=>value,querySelectorAll:()=>buttons,contains:()=>true
 };
 return {listeners,eventTarget,surface,controls,value,buttons};
}
test('zoom buttons and clamping preserve sheet position',()=>{
 const el=fakeSurface();
 const zoom=mountPageZoom(el.eventTarget,el.surface,el.controls);
 zoom.setZoom(2);
 assert.equal(zoom.getState().zoom,2);
 assert.equal(zoom.getState().x,-500);
 assert.equal(zoom.getState().y,-400);
 zoom.setZoom(4);assert.equal(zoom.getState().zoom,3);
 zoom.setZoom(.1);assert.equal(zoom.getState().zoom,.5);
 zoom.reset();assert.equal(zoom.getState().zoom,1);
 zoom.destroy();
});
test('pinch enlarges and two-finger movement pans without affecting ink',()=>{
 const el=fakeSurface();
 let interactions=0;
 const zoom=mountPageZoom(el.eventTarget,el.surface,el.controls,{onGesture:()=>interactions++});
 const t=(x,y,id)=>({clientX:x,clientY:y,identifier:id});
 const trigger=(name,touches)=>{
  el.listeners[name]({touches,cancelable:true,preventDefault(){}});
 };
 trigger('touchstart',[t(400,400,1),t(600,400,2)]);
 trigger('touchmove',[t(320,400,1),t(680,400,2)]);
 assert.ok(zoom.getState().zoom>1);
 assert.equal(interactions,1);
 trigger('touchmove',[t(340,380,1),t(700,380,2)]);
 assert.ok(zoom.getState().y<0);
 trigger('touchend',[]);
 zoom.destroy();
 assert.equal(Object.keys(el.listeners).length,0);
});
test('stationary double-tap positions never zoom or cancel undo',()=>{
 const el=fakeSurface();let interactions=0;
 const zoom=mountPageZoom(el.eventTarget,el.surface,el.controls,{onGesture:()=>interactions++});
 const t=(x,y,id)=>({clientX:x,clientY:y,identifier:id});
 for(let i=0;i<2;i++){
  el.listeners.touchstart({touches:[t(400,400,1),t(600,400,2)]});
  el.listeners.touchend({touches:[]});
 }
 assert.equal(interactions,0);
 assert.equal(zoom.getState().zoom,1);
 zoom.destroy();
});
