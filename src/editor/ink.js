import {clone,id} from '../core/model.js';

/**
 * Apple Pencil ink engine.
 * Completed strokes are rasterized into an in-memory backing canvas.
 * Pointer samples update only the active stroke, once per animation frame.
 * Data remains normalized (0..1) and compatible with old notes/backups.
 */
const clamp = value => Math.max(0, Math.min(1, value));
const point = (event, rect) => ({
  x: clamp((event.clientX - rect.left) / rect.width),
  y: clamp((event.clientY - rect.top) / rect.height),
  p: clamp(event.pressure > 0 ? event.pressure : 0.5)
});

export const SHAPE_TYPES=Object.freeze(['line','rectangle','rounded-rectangle','ellipse','circle','triangle','arrow','diamond','pentagon','hexagon','star','parallelogram','heart']);
const isShape=tool=>SHAPE_TYPES.includes(tool);
function polygon(ctx,points){
  if(!points.length)return;
  ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
}
function regularPolygon(cx,cy,rx,ry,count,rotation=-Math.PI/2){
  return Array.from({length:count},(_,i)=>{
    const a=rotation+i*2*Math.PI/count;
    return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];
  });
}
function drawShape(ctx,stroke,width,height){
  const first=stroke.points[0],last=stroke.points[stroke.points.length-1]||first;
  const ax=first.x*width,ay=first.y*height,bx=last.x*width,by=last.y*height;
  const left=Math.min(ax,bx),top=Math.min(ay,by),w=Math.abs(bx-ax),h=Math.abs(by-ay);
  const cx=(ax+bx)/2,cy=(ay+by)/2,rx=w/2,ry=h/2;
  const radius=Math.min(w,h)*0.18;
  ctx.beginPath();
  switch(stroke.tool){
    case 'line':
      ctx.moveTo(ax,ay);ctx.lineTo(bx,by);break;
    case 'arrow':{
      ctx.moveTo(ax,ay);ctx.lineTo(bx,by);
      const angle=Math.atan2(by-ay,bx-ax);
      const length=Math.min(24,Math.max(10,Math.hypot(bx-ax,by-ay)*.22));
      ctx.moveTo(bx-length*Math.cos(angle-Math.PI/7),by-length*Math.sin(angle-Math.PI/7));
      ctx.lineTo(bx,by);
      ctx.lineTo(bx-length*Math.cos(angle+Math.PI/7),by-length*Math.sin(angle+Math.PI/7));
      break;
    }
    case 'rectangle':
      ctx.rect(left,top,w,h);break;
    case 'rounded-rectangle':{
      const cr=Math.min(radius,16);
      ctx.moveTo(left+cr,top);ctx.lineTo(left+w-cr,top);
      ctx.quadraticCurveTo(left+w,top,left+w,top+cr);
      ctx.lineTo(left+w,top+h-cr);ctx.quadraticCurveTo(left+w,top+h,left+w-cr,top+h);
      ctx.lineTo(left+cr,top+h);ctx.quadraticCurveTo(left,top+h,left,top+h-cr);
      ctx.lineTo(left,top+cr);ctx.quadraticCurveTo(left,top,left+cr,top);ctx.closePath();break;
    }
    case 'ellipse':
      ctx.ellipse(cx,cy,Math.max(rx,0.5),Math.max(ry,0.5),0,0,2*Math.PI);break;
    case 'circle':{
      const radius=Math.max(0.5,Math.min(rx,ry));
      ctx.arc(cx,cy,radius,0,2*Math.PI);break;
    }
    case 'triangle':
      polygon(ctx,[[cx,top],[left+w,top+h],[left,top+h]]);break;
    case 'diamond':
      polygon(ctx,[[cx,top],[left+w,cy],[cx,top+h],[left,cy]]);break;
    case 'pentagon':
      polygon(ctx,regularPolygon(cx,cy,rx,ry,5));break;
    case 'hexagon':
      polygon(ctx,regularPolygon(cx,cy,rx,ry,6));break;
    case 'star':{
      const points=[];
      for(let i=0;i<10;i++){
        const a=-Math.PI/2+i*Math.PI/5;
        points.push([cx+Math.cos(a)*rx*(i%2?.44:1),cy+Math.sin(a)*ry*(i%2?.44:1)]);
      }
      polygon(ctx,points);break;
    }
    case 'parallelogram':{
      const shift=w*.25;
      polygon(ctx,[[left+shift,top],[left+w,top],[left+w-shift,top+h],[left,top+h]]);break;
    }
    case 'heart':{
      ctx.moveTo(cx,top+h*.88);
      ctx.bezierCurveTo(left-w*.13,top+h*.45,left+w*.04,top-h*.15,cx,top+h*.24);
      ctx.bezierCurveTo(left+w*.96,top-h*.15,left+w*1.13,top+h*.45,cx,top+h*.88);
      ctx.closePath();break;
    }
    default:return false;
  }
  ctx.stroke();
  return true;
}

export function createStroke(tool, color, size, p) {
  return {id:id('stroke'), tool, color, size, points:[p]};
}
export function strokeIntersectsPoint(stroke, needle, radius=0.02) {
  const pts=stroke.points||[];
  for(let i=0;i<pts.length;i++){
    const p=pts[i], prev=pts[i-1]||p, dx=p.x-prev.x, dy=p.y-prev.y;
    const d=dx*dx+dy*dy;
    const t=d ? Math.max(0,Math.min(1,((needle.x-prev.x)*dx+(needle.y-prev.y)*dy)/d)) : 0;
    if(Math.hypot(needle.x-(prev.x+dx*t), needle.y-(prev.y+dy*t)) < radius)return true;
  }
  return false;
}
function renderOne(ctx, stroke, width, height) {
  const pts=stroke.points||[];
  if(!pts.length)return;
  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.strokeStyle=stroke.color||'#202020';
  ctx.fillStyle=stroke.color||'#202020';
  ctx.globalAlpha=stroke.tool==='highlighter' ? 0.28 : 1;
  const base=Math.max(0.75, (stroke.size||2)*width/800);
  const thick=stroke.tool==='highlighter' ? 5.3 : 1;
  // Consistent path width avoids hundreds of expensive ctx.stroke() calls per frame.
  const pressure=pts[0].p||0.5;
  ctx.lineWidth=base*thick*(0.7+pressure*0.6);
  const first=pts[0], last=pts[pts.length-1];
  if(isShape(stroke.tool)){
    drawShape(ctx,stroke,width,height);
  }else if(pts.length===1){
    ctx.beginPath();
    ctx.arc(first.x*width,first.y*height,Math.max(0.75,ctx.lineWidth/2),0,Math.PI*2);
    ctx.fill();
  }else{
    // Smooth quadratic midpoints using coalesced Pencil samples;
    // existing stored points remain unchanged and backwards compatible.
    ctx.beginPath();
    ctx.moveTo(first.x*width,first.y*height);
    for(let i=1;i<pts.length-1;i++){
      const p=pts[i],next=pts[i+1];
      ctx.quadraticCurveTo(p.x*width,p.y*height,
        (p.x+next.x)*width/2,(p.y+next.y)*height/2);
    }
    const end=pts[pts.length-1];
    ctx.lineTo(end.x*width,end.y*height);
    ctx.stroke();
  }
  ctx.restore();
}
export function renderStrokes(ctx,strokes,width,height){
  ctx.clearRect(0,0,width,height);
  for(const s of strokes)renderOne(ctx,s,width,height);
}

/**
 * Draws directly on a canvas without turning handwriting into DOM text.
 * Only pointerdown contacts from pointerType='pen' can create marks.
 * Finger, palm, hover, and mouse never draw. Typing uses a separate Text tool.
 */
export function mountInkCanvas(canvas,{
  initialStrokes=[],onCommit=()=>{},getTool=()=> 'pen',
  getColor=()=> '#242938',getSize=()=>2,pencilOnly=()=>false
}={}){
  let strokes=clone(initialStrokes);
  let history=[],future=[],active=null,disposed=false,paintRequest=0;
  let needsBase=false;
  const limit=50;
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  const backing=document.createElement('canvas');
  const backingCtx=backing.getContext('2d',{alpha:true});
  let rect={left:0,top:0,width:0,height:0},width=0,height=0;
  canvas.style.touchAction='none';
  canvas.style.webkitUserSelect='none';
  canvas.style.userSelect='none';
  canvas.style.webkitTouchCallout='none';

  function syncSize(force=false){
    const next=canvas.getBoundingClientRect();
    if(!next.width||!next.height)return false;
    rect={left:next.left,top:next.top,width:next.width,height:next.height};
    // 1.75x is crisp on iPad, with substantially less raster work than 2x.
    const dpr=Math.min(Number(globalThis.devicePixelRatio)||1,1.75);
    const w=Math.max(1,Math.round(next.width*dpr));
    const h=Math.max(1,Math.round(next.height*dpr));
    if(force||canvas.width!==w||canvas.height!==h){
      width=w;height=h;
      canvas.width=w;canvas.height=h;
      backing.width=w;backing.height=h;
      needsBase=true;
    }
    return true;
  }
  function rebuild(){
    if(!backingCtx||!width||!height)return;
    // The current active path should be painted only on the visible canvas.
    const base=active?.stroke ? strokes.slice(0,-1) : strokes;
    renderStrokes(backingCtx,base,width,height);
    needsBase=false;
  }
  function drawFrame(){
    paintRequest=0;
    if(disposed||!ctx)return;
    if(!width||!height){if(!syncSize())return;}
    if(needsBase)rebuild();
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(backing,0,0);
    if(active?.stroke)renderOne(ctx,active.stroke,width,height);
  }
  function schedule(){
    if(!disposed&&!paintRequest)paintRequest=requestAnimationFrame(drawFrame);
  }
  function flushFrame(){
    if(paintRequest){cancelAnimationFrame(paintRequest);paintRequest=0;}
    drawFrame();
  }
  function snapshot(){
    // Copy-on-write: no deep-clone of ALL strokes at the start of each mark.
    history.push(strokes);
    if(history.length>limit)history.shift();
    future=[];
    strokes=strokes.slice();
  }
  function erased(p){
    const next=strokes.filter(s=>!strokeIntersectsPoint(s,p,0.014));
    if(next.length!==strokes.length){strokes=next;needsBase=true;}
  }
  function sample(e){
    if(!active)return;
    const p=point(e,rect);
    if(active.tool==='eraser'){erased(p);return;}
    const s=active.stroke;if(!s)return;
    if(isShape(active.tool)){
      s.points.length=1;s.points.push(p);
    }else{
      const prev=s.points[s.points.length-1];
      if(!prev||Math.abs(p.x-prev.x)>0.00008||Math.abs(p.y-prev.y)>0.00008)s.points.push(p);
    }
  }
  function down(e){
    if(disposed||active)return;
    // A pointerdown from the Pencil tip is a real contact. Hover, fingers,
    // palms and mouse clicks must never add marks to the handwriting canvas.
    if(e.pointerType!=='pen'){
      if(e.cancelable)e.preventDefault();
      return;
    }
    const tool=getTool();
    if(!['pen','highlighter','eraser'].includes(tool)&&!isShape(tool))return;
    if(!syncSize())return;
    if(e.cancelable)e.preventDefault();
    try{canvas.setPointerCapture?.(e.pointerId);}catch{}
    snapshot();
    active={pointerId:e.pointerId,tool,stroke:null};
    if(tool==='eraser')erased(point(e,rect));
    else{
      active.stroke=createStroke(tool,getColor(),getSize(),point(e,rect));
      strokes.push(active.stroke);
    }
    schedule();
  }
  function move(e){
    if(disposed||!active||e.pointerId!==active.pointerId)return;
    if(e.cancelable)e.preventDefault();
    const shape=isShape(active.tool);
    const events=!shape&&typeof e.getCoalescedEvents==='function' ? e.getCoalescedEvents() : null;
    if(events?.length){
      for(const ev of events)sample(ev);
      const last=events[events.length-1];
      if(last.clientX!==e.clientX||last.clientY!==e.clientY)sample(e);
    }else sample(e);
    schedule();
  }
  function up(e){
    if(!active||e.pointerId!==active.pointerId)return;
    if(e.cancelable)e.preventDefault();
    if(e.type==='pointerup')sample(e);
    const finished=active;
    active=null;
    try{canvas.releasePointerCapture?.(e.pointerId);}catch{}
    if(finished.tool==='eraser'){
      needsBase=true;
    }else if(backingCtx&&!needsBase){
      // Add only this finished stroke to the existing raster cache.
      renderOne(backingCtx,finished.stroke,width,height);
    }else needsBase=true;
    schedule();
    onCommit(clone(strokes)); // Persistence is deliberately once per stroke.
  }
  function touchBlock(e){
    if(getTool()==='type')return;
    if(e.cancelable)e.preventDefault();
  }
  function blockSelection(e){if(getTool()!=='type')e.preventDefault();}
  canvas.addEventListener('pointerdown',down,{passive:false});
  canvas.addEventListener('pointermove',move,{passive:false});
  canvas.addEventListener('pointerup',up,{passive:false});
  canvas.addEventListener('pointercancel',up,{passive:false});
  canvas.addEventListener('touchstart',touchBlock,{passive:false});
  canvas.addEventListener('touchmove',touchBlock,{passive:false});
  canvas.addEventListener('contextmenu',blockSelection);
  canvas.addEventListener('selectstart',blockSelection);
  canvas.addEventListener('gesturestart',touchBlock,{passive:false});
  const resize=typeof ResizeObserver==='function'
    ?new ResizeObserver(()=>{if(syncSize())schedule();}):null;
  resize?.observe(canvas);
  syncSize();
  schedule();
  return {
    getStrokes:()=>clone(strokes),
    setStrokes(next){
      active=null;strokes=clone(next);history=[];future=[];
      needsBase=true;schedule();
    },
    undo(){
      if(!history.length)return false;
      future.push(strokes);
      strokes=history.pop();active=null;needsBase=true;schedule();
      onCommit(clone(strokes));return true;
    },
    redo(){
      if(!future.length)return false;
      history.push(strokes);
      strokes=future.pop();active=null;needsBase=true;schedule();
      onCommit(clone(strokes));return true;
    },
    clear(){
      snapshot();active=null;strokes=[];needsBase=true;schedule();
      onCommit(clone(strokes));
    },
    redraw:()=>{syncSize();needsBase=true;schedule();},
    destroy(){
      disposed=true;
      if(paintRequest)cancelAnimationFrame(paintRequest);
      resize?.disconnect();
      canvas.removeEventListener('pointerdown',down);
      canvas.removeEventListener('pointermove',move);
      canvas.removeEventListener('pointerup',up);
      canvas.removeEventListener('pointercancel',up);
      canvas.removeEventListener('touchstart',touchBlock);
      canvas.removeEventListener('touchmove',touchBlock);
      canvas.removeEventListener('contextmenu',blockSelection);
      canvas.removeEventListener('selectstart',blockSelection);
      canvas.removeEventListener('gesturestart',touchBlock);
    }
  };
}
