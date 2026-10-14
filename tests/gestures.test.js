import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTwoFingerDoubleTap} from '../src/editor/gestures.js';

function harness(){
  let time=0,undos=0,enabled=true;
  const handlers=new Map();
  const target={
    addEventListener:(name,fn)=>handlers.set(name,fn),
    removeEventListener:(name)=>handlers.delete(name)
  };
  const mounted=mountTwoFingerDoubleTap(target,{
    onUndo:()=>undos++,
    enabled:()=>enabled,
    now:()=>time
  });
  const mk=(id,x=100,y=100,type='direct')=>({identifier:id,clientX:x,clientY:y,touchType:type});
  const emit=(name,touches,changed=touches)=>{
    let prevented=false;
    handlers.get(name)?.({touches,changedTouches:changed,cancelable:true,
      preventDefault:()=>{prevented=true;}});
    return prevented;
  };
  const tap=(first=[mk(1),mk(2)],duration=70)=>{
    emit('touchstart',[first[0]],[first[0]]);
    time+=12;
    emit('touchstart',first,[first[1]]);
    time+=duration;
    emit('touchend',[first[1]],[first[0]]);
    time+=8;
    emit('touchend',[],[first[1]]);
  };
  return {tap,emit,mk,mounted,
    setEnabled:value=>enabled=value,advance:ms=>time+=ms,
    get undos(){return undos;},get listenerCount(){return handlers.size}};
}

test('two short two-finger taps undo exactly once',()=>{
  const h=harness();h.tap();assert.equal(h.undos,0);
  h.advance(140);h.tap();assert.equal(h.undos,1);
  h.tap();assert.equal(h.undos,1);
  h.advance(120);h.tap();assert.equal(h.undos,2);
});

test('a single two-finger tap or delayed second tap is not undo',()=>{
  const h=harness();h.tap();assert.equal(h.undos,0);
  h.advance(550);h.tap();assert.equal(h.undos,0);
});

test('single-finger, stylus, and three-finger touches do not undo',()=>{
  const h=harness();const {mk,emit}=h;
  emit('touchstart',[mk(1)]);emit('touchend',[],[mk(1)]);
  h.tap([mk(1,100,100,'stylus'),mk(2)]);
  emit('touchstart',[mk(1),mk(2),mk(3)]);
  emit('touchend',[],[mk(1),mk(2),mk(3)]);
  assert.equal(h.undos,0);
});

test('moving or pinching across the sheet never triggers undo',()=>{
  const h=harness();const {mk,emit}=h;
  h.tap();h.advance(100);
  emit('touchstart',[mk(1)]);
  h.advance(10);emit('touchstart',[mk(1),mk(2)]);
  emit('touchmove',[mk(1,10,10),mk(2,200,200)]);
  emit('touchend',[],[mk(1,10,10),mk(2,200,200)]);
  assert.equal(h.undos,0);
});

test('disabled tool and destroy prevent undo; handlers cleaned up',()=>{
  const h=harness();h.setEnabled(false);h.tap();h.advance(100);h.tap();assert.equal(h.undos,0);
  h.mounted.destroy();assert.equal(h.listenerCount,0);
});
