import {clone,id} from '../core/model.js';
/** Strokes use normalized 0..1 coordinates; they survive iPad rotation and zoom. */
const clamp=v=>Math.max(0,Math.min(1,v));
const point=(event,rect)=>({x:clamp((event.clientX-rect.left)/rect.width),y:clamp((event.clientY-rect.top)/rect.height),p:clamp(event.pressure||0.5)});
export function createStroke(tool,color,size,p){return {id:id('stroke'),tool,color,size,points:[p]};}
export function strokeIntersectsPoint(stroke,needle,radius=0.02){
  const pts=stroke.points||[];
  for(let i=0;i<pts.length;i++){
    const p=pts[i],prev=pts[i-1]||p,dx=p.x-prev.x,dy=p.y-prev.y,denom=dx*dx+dy*dy;
    const t=denom?Math.max(0,Math.min(1,((needle.x-prev.x)*dx+(needle.y-prev.y)*dy)/denom)):0;
    if(Math.hypot(needle.x-(prev.x+dx*t),needle.y-(prev.y+dy*t))<radius)return true;
  }
  return false;
}
export function renderStrokes(ctx,strokes,width,height){
  ctx.clearRect(0,0,width,height);
  for(const stroke of strokes){
    const pts=stroke.points||[];if(!pts.length)continue;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=stroke.color||'#202020';ctx.fillStyle=stroke.color||'#202020';
    ctx.globalAlpha=stroke.tool==='highlighter'?0.3:1;
    const size=(stroke.size||2)*width/800;
    ctx.lineWidth=stroke.tool==='highlighter'?size*6:size;
    ctx.beginPath();
    if(['line','rectangle'].includes(stroke.tool)){
      const a=pts[0],b=pts[pts.length-1];
      if(stroke.tool==='line'){ctx.moveTo(a.x*width,a.y*height);ctx.lineTo(b.x*width,b.y*height);ctx.stroke();}
      else ctx.strokeRect(a.x*width,a.y*height,(b.x-a.x)*width,(b.y-a.y)*height);
    }else if(pts.length===1){ctx.arc(pts[0].x*width,pts[0].y*height,Math.max(0.7,size/2),0,Math.PI*2);ctx.fill();}
    else{
      ctx.moveTo(pts[0].x*width,pts[0].y*height);
      for(let i=1;i<pts.length;i++){
        const p=pts[i];ctx.lineWidth=Math.max(.5,size*(0.65+(p.p||.5)*.7))*(stroke.tool==='highlighter'?5:1);
        ctx.lineTo(p.x*width,p.y*height);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
/**
 * Pointer input adapter. Embeddable in ANY future UI (React, Vue, native WebView).
 * Use .destroy() before unmounting. Keep strokes in app state, not on the canvas.
 */
export function mountInkCanvas(canvas,{initialStrokes=[],onCommit=()=>{},getTool=()=> 'pen',getColor=()=> '#242938',getSize=()=>2,pencilOnly=()=>false}={}){
  let strokes=clone(initialStrokes),active=null,undo=[],redo=[],disposed=false;
  const maxHistory=50;
  const paint=()=>{
    if(disposed)return;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const ctx=canvas.getContext('2d');if(ctx)renderStrokes(ctx,strokes,w,h);
  };
  const commit=()=>{onCommit(clone(strokes));};
  const snapshot=()=>{undo.push(clone(strokes));if(undo.length>maxHistory)undo.shift();redo=[];};
  function down(e){
    if(e.pointerType==='touch'&&pencilOnly())return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(active)return;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const tool=getTool();if(!['pen','highlighter','eraser','line','rectangle'].includes(tool))return;
    e.preventDefault();canvas.setPointerCapture?.(e.pointerId);
    snapshot();active={pointerId:e.pointerId,tool};
    const p=point(e,rect);
    if(tool==='eraser'){strokes=strokes.filter(s=>!strokeIntersectsPoint(s,p));}
    else strokes.push(createStroke(tool,getColor(),getSize(),p));
    paint();
  }
  function move(e){
    if(!active||active.pointerId!==e.pointerId)return;
    e.preventDefault();const rect=canvas.getBoundingClientRect();
    const samples=typeof e.getCoalescedEvents==='function'&&active.tool!=='rectangle'&&active.tool!=='line'?e.getCoalescedEvents():[e];
    for(const ev of samples.length?samples:[e]){
      const p=point(ev,rect);
      if(active.tool==='eraser')strokes=strokes.filter(s=>!strokeIntersectsPoint(s,p));
      else{
        const curr=strokes[strokes.length-1];
        if(curr){if(['line','rectangle'].includes(active.tool))curr.points=[curr.points[0],p];else curr.points.push(p);}
      }
    }
    paint();
  }
  function up(e){if(!active||active.pointerId!==e.pointerId)return;active=null;paint();commit();}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(paint):null;resize?.observe(canvas);
  paint();
  return {
    getStrokes:()=>clone(strokes),setStrokes(next){strokes=clone(next);undo=[];redo=[];paint();},
    undo(){if(!undo.length)return false;redo.push(clone(strokes));strokes=undo.pop();paint();commit();return true;},
    redo(){if(!redo.length)return false;undo.push(clone(strokes));strokes=redo.pop();paint();commit();return true;},
    clear(){snapshot();strokes=[];paint();commit();},
    redraw:paint,
    destroy(){disposed=true;resize?.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);}
  };
}
