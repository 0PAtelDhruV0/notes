/**
 * Zoom / pan controller for the full-screen iPad note.
 * Does NOT touch the saved page coordinates or browser IndexedDB.
 * Keeps two-finger double-tap undo distinct from moving/pinching.
 */
export const MIN_ZOOM=0.5;
export const MAX_ZOOM=3;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const touchPoint=touch=>({x:touch.clientX,y:touch.clientY});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

export function mountPageZoom(viewport,surface,controls,{
  onGesture=()=>{},onSettled=()=>{},min=MIN_ZOOM,max=MAX_ZOOM
}={}){
  let zoom=1,x=0,y=0,pinch=null,disposed=false;
  const elements=[viewport,surface,controls];
  if(elements.some(el=>!el))throw Error('Page zoom requires a viewport, page and controls');
  function dimensions(){
    return {w:viewport.clientWidth||viewport.getBoundingClientRect().width,
      h:viewport.clientHeight||viewport.getBoundingClientRect().height,
      pageW:surface.offsetWidth||viewport.clientWidth,
      pageH:surface.offsetHeight||viewport.clientHeight};
  }
  function constrain(){
    const {w,h,pageW,pageH}=dimensions();
    const scaledW=pageW*zoom,scaledH=pageH*zoom;
    x=scaledW<=w?(w-scaledW)/2:clamp(x,w-scaledW,0);
    y=scaledH<=h?(h-scaledH)/2:clamp(y,h-scaledH,0);
  }
  function display(){
    if(disposed)return;
    constrain();
    surface.style.transformOrigin='0 0';
    surface.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+zoom+')';
    const value=controls.querySelector('[data-zoom-value]');
    if(value)value.textContent=Math.round(zoom*100)+'%';
    for(const item of controls.querySelectorAll('button[data-zoom]')){
      if(item.dataset.zoom==='in')item.disabled=zoom>=max-.001;
      if(item.dataset.zoom==='out')item.disabled=zoom<=min+.001;
    }
  }
  function setZoom(next,anchorX=null,anchorY=null,{settled=true}={}){
    const z=clamp(Number(next)||1,min,max);
    const {w,h}=dimensions();
    const ax=anchorX==null?w/2:anchorX;
    const ay=anchorY==null?h/2:anchorY;
    const contentX=(ax-x)/zoom,contentY=(ay-y)/zoom;
    x=ax-contentX*z;y=ay-contentY*z;zoom=z;
    display();
    if(settled)onSettled();
  }
  function reset(){
    zoom=1;x=0;y=0;display();onSettled();
  }
  function click(event){
    const button=event.target.closest('button[data-zoom]');
    if(!button||!controls.contains(button))return;
    onGesture();
    if(button.dataset.zoom==='in')setZoom(zoom*1.25);
    else if(button.dataset.zoom==='out')setZoom(zoom/1.25);
    else if(button.dataset.zoom==='reset')reset();
  }
  function touches(event){
    const array=Array.from(event.touches||[]);
    return array.some(t=>t.touchType==='stylus')?[]:array;
  }
  function start(event){
    if(disposed)return;
    const pts=touches(event);
    if(pts.length!==2){pinch=null;return;}
    const a=touchPoint(pts[0]),b=touchPoint(pts[1]);
    pinch={center:midpoint(a,b),dist:Math.max(1,distance(a,b)),
      activated:false};
  }
  function move(event){
    if(disposed||!pinch)return;
    const pts=touches(event);
    if(pts.length!==2){pinch=null;return;}
    const a=touchPoint(pts[0]),b=touchPoint(pts[1]);
    const center=midpoint(a,b),dist=Math.max(1,distance(a,b));
    const moved=distance(center,pinch.center);
    // Don't interpret two quick stationary taps as zoom/pan.
    if(!pinch.activated && moved<7 && Math.abs(dist-pinch.dist)<7)return;
    if(!pinch.activated){pinch.activated=true;onGesture();}
    if(event.cancelable)event.preventDefault();
    const viewportRect=viewport.getBoundingClientRect();
    const oldCenter={x:pinch.center.x-viewportRect.left,y:pinch.center.y-viewportRect.top};
    const newCenter={x:center.x-viewportRect.left,y:center.y-viewportRect.top};
    const contentX=(oldCenter.x-x)/zoom,contentY=(oldCenter.y-y)/zoom;
    const nextZoom=clamp(zoom*(dist/pinch.dist),min,max);
    x=newCenter.x-contentX*nextZoom;
    y=newCenter.y-contentY*nextZoom;
    zoom=nextZoom;
    pinch.center=center;pinch.dist=dist;
    display();
  }
  function end(event){
    if(!pinch)return;
    if(Array.from(event.touches||[]).length<2){
      const changed=pinch.activated;
      pinch=null;
      if(changed)onSettled();
    }
  }
  function resize(){display();onSettled();}
  const opts={passive:false};
  controls.addEventListener('click',click);
  viewport.addEventListener('touchstart',start,opts);
  viewport.addEventListener('touchmove',move,opts);
  viewport.addEventListener('touchend',end,opts);
  viewport.addEventListener('touchcancel',end,opts);
  window.addEventListener('resize',resize);
  display();
  return {
    getState:()=>({zoom,x,y}),
    setZoom:(next)=>setZoom(next),
    zoomIn:()=>setZoom(zoom*1.25),
    zoomOut:()=>setZoom(zoom/1.25),
    reset,
    destroy(){
      if(disposed)return;disposed=true;
      controls.removeEventListener('click',click);
      viewport.removeEventListener('touchstart',start);
      viewport.removeEventListener('touchmove',move);
      viewport.removeEventListener('touchend',end);
      viewport.removeEventListener('touchcancel',end);
      window.removeEventListener('resize',resize);
    }
  };
}
