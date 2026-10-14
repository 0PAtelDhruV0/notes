/* Presentation-only upgrade over the stable Notebook services and editor. */
const path={
grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
note:'<path d="M6 3h9l4 4v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h8M8 16h7"/>',
pen:'<path d="m4 20 4-.8L20 7l-3-3L5 16l-1 4Zm11-14 3 3"/>',
type:'<path d="M4 7V4h16v3M12 4v16M8 20h8"/>',
highlighter:'<path d="m5 16 10-11 4 4-10 11H5v-4ZM4 21h16M13 7l4 4"/>',
eraser:'<path d="m4 15 10-11 6 6-10 10H8l-4-5ZM9 9l7 7M11 20h9"/>',
line:'<path d="M4 20 20 4"/>',
rectangle:'<rect x="4" y="5" width="16" height="14" rx="1"/>',
undo:'<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6"/>',
redo:'<path d="m15 7 5 5-5 5M20 12H10a6 6 0 0 0-6 6"/>',
trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h9l1-13"/>',
plus:'<path d="M12 4v16M4 12h16"/>',
grip:'<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
star:'<path d="m12 2 3.1 6.3 7 .9-5 4.9 1.2 6.9L12 17.8l-6.3 3.2 1.2-6.9-5-4.9 7-.9L12 2Z"/>',
book:'<path d="M5 4h15v16H6a3 3 0 0 1-1-6V4Zm0 12c0-1.2 1.2-2 2.5-2H20M9 8h7"/>',
folder:'<path d="M3 7h7l2 2h9v11H3V7Z"/>',
back:'<path d="m14 5-7 7 7 7"/>'
};
const svg=(name)=>'<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(path[name]||path.note)+'</svg>';
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TPOS='notes-toolbar-position-v3';
export function enhanceNotesUI(app,shell){
 const screen=document.getElementById('screen'),nav=document.getElementById('navigation'),locationLabel=document.getElementById('screen-location');
 let drag=null;let raf=0;
 function currentSection(){
  if(screen.querySelector('#writing-surface'))return 'editor';
  const h=screen.querySelector('.screen-header h1');
  return (h?.textContent||'Overview').toLowerCase();
 }
 function decorateNavigation(){
  if(nav.querySelector('.brand'))return;
  nav.insertAdjacentHTML('afterbegin','<div class="brand"><div class="brand-mark"><i></i><i></i><i></i><i></i></div><span>notes<b>.</b></span><small>STUDY SPACE</small></div><button type="button" class="sidebar-new" id="sidebar-new">'+svg('plus')+'New note <span>⌘N</span></button><div class="nav-kicker">WORKSPACE</div>');
  const labels=[['home','Overview','grid'],['notes','All notes','note'],['planner','Planner','book'],['study','Flashcards','star'],['files','Files','folder'],['trash','Recently deleted','trash']];
  nav.querySelectorAll('[data-to]').forEach(btn=>{const info=labels.find(x=>x[0]===btn.dataset.to);if(!info)return;btn.innerHTML=svg(info[2])+'<span>'+info[1]+'</span>';});
  nav.querySelector('[data-to="notes"]')?.insertAdjacentHTML('afterend','<button type="button" class="nav-shortcut" data-quick="subjects">'+svg('book')+'<span>Subjects</span></button><button type="button" class="nav-shortcut" data-quick="favorites">'+svg('star')+'<span>Favorites</span></button>');
  nav.insertAdjacentHTML('beforeend','<div class="nav-bottom"><span class="status-indicator"></span><strong>On-device workspace</strong><small>Private notes stored in this browser</small></div>');
  nav.querySelector('#sidebar-new')?.addEventListener('click',()=>shell.showNewNote());
 }
 function createPreview(n){
  const text=(n.pages?.[0]?.text||'').trim().slice(0,150);
  return '<span class="paper-thumb" data-paper="'+esc(n.pages?.[0]?.paper||'ruled')+'"><span>'+esc(text||'A new page for your ideas…')+'</span></span>';
 }
 function decorateRows(){
  for(const b of screen.querySelectorAll('.note-list button[data-id]')){
   if(b.dataset.decorated)return;b.dataset.decorated='1';const n=app.notes.get(b.dataset.id);if(!n)continue;
   b.innerHTML=createPreview(n)+'<span class="note-row-title">'+esc(n.title)+'</span><small>'+esc(app.store.snapshot.subjects.find(s=>s.id===n.subjectId)?.name||'Unclassified')+' · '+n.pages.length+' page'+(n.pages.length===1?'':'s')+'</small>';
  }
 }
 function decorateHome(){
  const hdr=screen.querySelector('.screen-header');if(!hdr||hdr.dataset.decorated)return;
  hdr.dataset.decorated='1';hdr.classList.add('welcome-header');
  const h=hdr.querySelector('h1');if(h)h.textContent='Make space for ideas.';
  const btn=hdr.querySelector('button');if(btn){btn.innerHTML=svg('plus')+' Create new note';btn.classList.add('primary-btn');}
  hdr.insertAdjacentHTML('beforebegin','<p class="eyebrow">✦ &nbsp; YOUR STUDY SPACE</p>');
  const para=hdr.nextElementSibling;if(para?.classList.contains('muted'))para.textContent='Everything you need for your studies, all in one place.';
  const n=app.notes.list()[0];
  const stats=screen.querySelector('.inline:has(.panel)');
  if(stats)stats.classList.add('stats-row');
  const noteList=screen.querySelector('.note-list');
  const sectionHeading=noteList?.previousElementSibling;
  if(sectionHeading?.tagName==='H2')sectionHeading.textContent='Recent notes';
  if(n && stats){
   const label=app.store.snapshot.subjects.find(s=>s.id===n.subjectId)?.name||'Your notebook';
   stats.insertAdjacentHTML('afterend','<h2 class="continue-heading">Continue working</h2><button class="continue-card" data-action="open-note" data-id="'+esc(n.id)+'"><span><small>PICK UP WHERE YOU LEFT OFF</small><strong>'+esc(n.title)+'</strong><em>'+esc(label)+'</em><b>Continue writing →</b></span>'+createPreview(n)+'</button>');
  }else if(stats){
   stats.insertAdjacentHTML('afterend','<section class="empty-hero"><strong>Your next idea begins here.</strong><span>Create a notebook, choose a subject, and start writing.</span><button type="button" class="primary-btn" data-action="new-note">'+svg('plus')+' Create your first note</button></section>');
  }
  const subjects=app.store.snapshot.subjects.slice(0,8);
  if(subjects.length){
   const zone=document.createElement('section');zone.className='subject-section';zone.innerHTML='<h2>Your subjects</h2><div class="subject-chips">'+subjects.map((s,i)=>'<button data-ui-subject="'+esc(s.name)+'"><span class="chip-dot" style="--chip:'+['#a88eff','#82b7dc','#83bba5','#f2b081','#d79ac8'][i%5]+'"></span>'+esc(s.name)+'<small>→</small></button>').join('')+'</div>';
   screen.append(zone);
  }
 }
 function decorateEditor(){
  const surface=screen.querySelector('#writing-surface');if(!surface||surface.dataset.decorated)return;
  surface.dataset.decorated='1';
  const hdr=screen.querySelector('.screen-header');hdr?.classList.add('editor-header');
  const back=screen.querySelector('[data-action="back-to-notes"]');
  if(back){back.innerHTML=svg('back')+' <span>Library</span>';back.classList.add('back-btn');}
  const trash=screen.querySelector('[data-action="trash-note"]');
  if(trash){trash.innerHTML=svg('trash');trash.title='Move note to recently deleted';trash.setAttribute('aria-label','Move note to trash');}
  const title=screen.querySelector('#note-title');
  if(title){title.setAttribute('aria-label','Note title');title.placeholder='Untitled note';}
  screen.querySelector('#note-title')?.closest('.fields')?.classList.add('editor-meta');
  const options=screen.querySelector('#paper-choice')?.closest('.inline');
  options?.classList.add('page-actions');
  if(hdr&&options){
   const menu=document.createElement('button');
   menu.type='button';menu.id='editor-page-menu';menu.title='Pages and attachments';
   menu.setAttribute('aria-label','Pages and attachments');
   menu.setAttribute('aria-expanded','false');
   menu.innerHTML=svg('note')+' <span>Pages</span>';
   hdr.querySelector('.inline')?.append(menu);
   menu.addEventListener('click',()=>{
    const visible=options.classList.toggle('open');
    menu.setAttribute('aria-expanded',String(visible));
   });
  }
  const bar=screen.querySelector('button[data-action="tool"]')?.closest('.inline');
  if(!bar)return;
  bar.classList.add('floating-tools');bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Writing tools');
  const label=bar.querySelector('span');if(label)label.remove();
  const grip=document.createElement('button');grip.id='toolbar-grip';grip.className='tool-grip';grip.type='button';grip.title='Drag toolbar';grip.setAttribute('aria-label','Drag toolbar');grip.innerHTML=svg('grip');bar.prepend(grip);
  bar.querySelectorAll('button[data-action="tool"]').forEach(b=>{let name=b.dataset.tool;b.title=name==='type'?'Text':name[0].toUpperCase()+name.slice(1);b.setAttribute('aria-label',b.title);b.innerHTML=svg(name);b.classList.add('tool-btn');});
  ['undo','redo','clear-ink'].forEach(name=>{const b=bar.querySelector('[data-action="'+name+'"]');if(!b)return;b.title=name==='clear-ink'?'Clear handwriting':name[0].toUpperCase()+name.slice(1);b.setAttribute('aria-label',b.title);b.innerHTML=svg(name==='clear-ink'?'trash':name);b.classList.add('tool-btn');});
  const paper=options?.querySelector('#paper-choice')?.closest('label');if(paper){paper.classList.add('toolbar-paper');bar.append(paper);}
  if(options){
   const tags=screen.querySelector('#note-tags')?.closest('.field');
   if(tags){tags.classList.add('page-meta-field');options.append(tags);}
   const star=screen.querySelector('#star-note')?.closest('label');
   if(star){star.classList.add('page-meta-check');options.append(star);}
   const review=screen.querySelector('#review-date');
   if(review){const line=document.createElement('label');line.className='page-meta-field';line.textContent='Review date';line.append(review);options.append(line);}
  }
  const color=bar.querySelector('#pen-color');if(color){color.title='Ink color';color.setAttribute('aria-label','Ink color');}
  const size=bar.querySelector('#pen-size');if(size){size.setAttribute('aria-label','Pen thickness');}
  if(options)options.querySelectorAll('button[data-action]').forEach(b=>{const a=b.dataset.action;b.classList.add('small-action');if(a==='add-page')b.innerHTML=svg('plus')+' Page';});
  const head=screen.querySelector('.editor-layout');head?.classList.add('focus-layout');
  const attachmentPanel=screen.querySelector('.editor-layout + .panel');
  if(attachmentPanel&&options){
    attachmentPanel.classList.add('attachment-panel');
    options.append(attachmentPanel);
  }
  positionToolbar(bar);
  grip.addEventListener('pointerdown',e=>{
   if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.stopPropagation();
   const box=bar.getBoundingClientRect();
   drag={id:e.pointerId,dx:e.clientX-box.left,dy:e.clientY-box.top,bar};
   grip.setPointerCapture(e.pointerId);bar.classList.add('dragging');
  });
  grip.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
   setToolbarPos(bar,e.clientX-drag.dx,e.clientY-drag.dy);
  });
  const stop=e=>{if(!drag||e.pointerId!==drag.id)return;const r=bar.getBoundingClientRect();savePosition(r.left,r.top);bar.classList.remove('dragging');drag=null;};
  grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);
 }
 function savePosition(x,y){try{localStorage.setItem(TPOS,JSON.stringify({x,y}));}catch{}}
 function setToolbarPos(el,x,y){
  const w=el.offsetWidth||490,h=el.offsetHeight||55;
  el.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';
  el.style.top=Math.max(8,Math.min(y,innerHeight-h-8))+'px';
  el.style.bottom='auto';el.style.transform='none';
 }
 function positionToolbar(bar){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(TPOS)||'null');}catch{}
  const width=bar.offsetWidth||530,height=bar.offsetHeight||58;
  const x=saved&&Number.isFinite(saved.x)?saved.x:Math.max(8,(innerWidth-width)/2);
  const y=saved&&Number.isFinite(saved.y)?saved.y:innerHeight-height-33;
  setToolbarPos(bar,x,y);
 }
 function decorate(){
  decorateNavigation();
  const editor=!!screen.querySelector('#writing-surface');
  document.body.classList.toggle('editor-mode',editor);
  if(editor){locationLabel.textContent='Editing';decorateEditor();}
  else{
   const heading=screen.querySelector('.screen-header h1');
   locationLabel.textContent=heading?.textContent==='Student workspace'?'Overview':heading?.textContent||'Overview';
   if(heading?.textContent==='Student workspace')decorateHome();
   if(screen.querySelector('#notes-results')&&!screen.querySelector('.subject-section')){
    const names=app.store.snapshot.subjects.slice(0,40);
    const zone=document.createElement('section');zone.className='subject-section subject-filter';
    zone.innerHTML='<h2>Subjects <span class="subject-hint">Select a subject to filter your notes</span></h2><div class="subject-chips">'+(names.length?names.map((s,i)=>'<button data-ui-subject="'+esc(s.name)+'"><span class="chip-dot" style="--chip:'+['#a88eff','#82b7dc','#83bba5','#f2b081','#d79ac8'][i%5]+'"></span>'+esc(s.name)+'<small>→</small></button>').join(''):'<p class="muted">Subjects appear here when you create your first note.</p>')+'</div>';
    const header=screen.querySelector('.screen-header');header?.after(zone);
   }
   decorateRows();
  }
 }
 const observer=new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;decorate();});});
 observer.observe(screen,{childList:true});
 observer.observe(nav,{childList:true});
 document.getElementById('header-search')?.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;const text=e.target.value;shell.navigate('notes');
  requestAnimationFrame(()=>{const input=document.getElementById('search-notes');if(input){input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}});
 });
 nav.addEventListener('click',e=>{
  const item=e.target.closest('button[data-quick]');if(!item)return;
  const type=item.dataset.quick;
  shell.navigate('notes');
  requestAnimationFrame(()=>{
   const input=document.getElementById('search-notes');
   if(type==='favorites'){
    const star=document.getElementById('star-filter');
    if(star){star.checked=true;star.dispatchEvent(new Event('input',{bubbles:true}));}
    screen.querySelector('.screen-header h1').textContent='Favorites';
    document.getElementById('screen-location').textContent='Favorites';
   }else{
    screen.querySelector('.subject-section')?.scrollIntoView({behavior:'smooth',block:'start'});
   }
  });
 });
 screen.addEventListener('click',e=>{
  const btn=e.target.closest('[data-ui-subject]');if(!btn)return;
  const text=btn.getAttribute('data-ui-subject');shell.navigate('notes');
  requestAnimationFrame(()=>{const input=document.getElementById('search-notes');if(input){input.value=text;input.dispatchEvent(new Event('input',{bubbles:true}));}});
 });
 document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();shell.showNewNote();}
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.getElementById('header-search')?.focus();}
  if(e.key==='Escape'&&document.body.classList.contains('editor-mode')&&!document.querySelector('dialog[open]')){shell.navigate('notes');}
 });
 window.addEventListener('resize',()=>{const b=screen.querySelector('.floating-tools');if(b&&!drag)positionToolbar(b);});
 app.store.subscribe((_,status)=>{const el=document.getElementById('save-status');if(el)el.textContent=status;});
 decorate();
}
