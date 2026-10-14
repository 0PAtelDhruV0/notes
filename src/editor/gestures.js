/**
 * Two-finger double tap to undo on the iPad note canvas.
 * Two short, stationary TWO-finger taps are required in succession.
 * Palm contacts, gestures with >=3 fingers, Pencil touches, pinch/drag,
 * and single two-finger taps do not trigger an undo.
 *
 * This is intentionally UI-only. It invokes the existing ink.undo() method,
 * which persists changes using the application's normal note service.
 */
export function mountTwoFingerDoubleTap(target,{
  onUndo=()=>{},
  enabled=()=>true,
  now=()=>Date.now(),
  maxTapDuration=260,
  maxFingerJoinDelay=130,
  maxGapBetweenTaps=430,
  maxMovement=22,
  maxDistanceBetweenTaps=135,
}={}){
  let disposed=false;
  let attempt=null;
  let previous=null;

  const reset=()=>{attempt=null;previous=null;};
  const list=touches=>Array.from(touches||[]);
  const stylus=touch=>touch.touchType==='stylus';
  function touchStart(event){
    if(disposed||!enabled()){reset();return;}
    const touches=list(event.touches);
    if(touches.length===0||touches.length>2||touches.some(stylus)){reset();return;}
    const time=now();
    if(touches.length===1){
      const t=touches[0];
      attempt={started:time,positions:new Map([[t.identifier,{x:t.clientX,y:t.clientY}]]),two:false,invalid:false};
      return;
    }
    // Two fingers may arrive in a single event or two near-simultaneous events.
    if(!attempt)attempt={started:time,positions:new Map(),two:false,invalid:false};
    if(time-attempt.started>maxFingerJoinDelay){reset();return;}
    for(const t of touches){
      if(!attempt.positions.has(t.identifier)){
        attempt.positions.set(t.identifier,{x:t.clientX,y:t.clientY});
      }
    }
    attempt.two=attempt.positions.size===2;
    if(event.cancelable)event.preventDefault();
  }
  function touchMove(event){
    if(disposed||!attempt)return;
    const touches=list(event.touches);
    if(touches.length>2||touches.some(stylus)){reset();return;}
    for(const t of touches){
      const start=attempt.positions.get(t.identifier);
      if(!start||Math.hypot(t.clientX-start.x,t.clientY-start.y)>maxMovement){
        attempt.invalid=true;
        previous=null;
      }
    }
    if(attempt.two&&event.cancelable)event.preventDefault();
  }
  function touchEnd(event){
    if(disposed||!attempt)return;
    const changed=list(event.changedTouches);
    for(const t of changed){
      const start=attempt.positions.get(t.identifier);
      if(!start||Math.hypot(t.clientX-start.x,t.clientY-start.y)>maxMovement)
        attempt.invalid=true;
    }
    // Both fingers must have left the surface.
    if(list(event.touches).length)return;
    const time=now();
    const valid=attempt.two&&!attempt.invalid&&
      attempt.positions.size===2&&time-attempt.started<=maxTapDuration;
    if(!valid){reset();return;}
    const pts=[...attempt.positions.values()];
    const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    if(event.cancelable)event.preventDefault();
    if(previous&&time-previous.time<=maxGapBetweenTaps&&
      Math.hypot(center.x-previous.x,center.y-previous.y)<=maxDistanceBetweenTaps){
      previous=null;
      attempt=null;
      onUndo();
      return;
    }
    previous={time,x:center.x,y:center.y};
    attempt=null;
  }
  function touchCancel(){reset();}
  const opts={passive:false};
  target.addEventListener('touchstart',touchStart,opts);
  target.addEventListener('touchmove',touchMove,opts);
  target.addEventListener('touchend',touchEnd,opts);
  target.addEventListener('touchcancel',touchCancel,opts);
  return {destroy(){
    if(disposed)return;
    disposed=true;reset();
    target.removeEventListener('touchstart',touchStart);
    target.removeEventListener('touchmove',touchMove);
    target.removeEventListener('touchend',touchEnd);
    target.removeEventListener('touchcancel',touchCancel);
  }};
}
