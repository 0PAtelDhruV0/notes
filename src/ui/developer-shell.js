/**
 * Temporary wiring harness, NOT the final interface.
 * Replace this file with your own UI/UX. The data layer is src/app.js.
 */
import {mountInkCanvas,SHAPE_TYPES} from '../editor/ink.js';
import {mountTwoFingerDoubleTap} from '../editor/gestures.js';
import {NOTE_TEMPLATES,PAPER_TYPES} from '../core/model.js';
const $=(query,root=document)=>root.querySelector(query);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opts=(values,chosen='')=>values.map(v=>`<option value="${escape(v)}" ${v===chosen?'selected':''}>${escape(v)}</option>`).join('');
const saveAs=(filename,blob)=>{const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);};
export function mountDeveloperShell(app){
  const nav=$('#navigation'),screen=$('#screen'),fileInput=$('#attach-file');
  let screenName='home',noteId=null,pageId=null,ink=null,twoFingerUndo=null,tool='pen',color='#202020',size=3,inputTimeout=null;
  const sectionNames=[['home','Home'],['notes','Notes'],['planner','Planner'],['study','Study'],['files','Files'],['trash','Trash']];
  app.store.subscribe((_,status,error)=>{$('#save-status').textContent=status+(error?' · '+error.message:'');});
  $('#save-status').textContent=app.store.status;
  const flashMessage=text=>{const element=$('#status-message');if(element){element.textContent=text;setTimeout(()=>{if(element.textContent===text)element.textContent='';},3000);}else alert(text);};
  const subjectName=(id)=>app.store.snapshot.subjects.find(s=>s.id===id)?.name||'Unclassified';
  const sectionName=(n)=>app.store.snapshot.subjects.find(s=>s.id===n.subjectId)?.subsections.find(x=>x.id===n.subsectionId)?.name||'';
  const noteRows=(notes)=>notes.length?`<div class="note-list">${notes.map(n=>`<button type="button" data-action="open-note" data-id="${escape(n.id)}"><strong>${escape(n.title)}</strong><small>${escape(subjectName(n.subjectId))} · ${escape(sectionName(n))} · ${n.pages.length} page(s)</small></button>`).join('')}</div>`:'<p class="muted">No matching notes.</p>';
  function persistEditorInputs(){
    clearTimeout(inputTimeout);
    if(screenName!=='editor'||!noteId||!pageId)return;
    const title=$('#note-title'),textarea=$('#page-text');
    if(title&&app.notes.get(noteId)?.title!==title.value)app.notes.update(noteId,{title:title.value});
    if(textarea&&app.notes.page(noteId,pageId)?.text!==textarea.value)app.notes.updatePage(noteId,pageId,{text:textarea.value});
  }
  function navigate(destination){persistEditorInputs();ink?.destroy();ink=null;screenName=destination;render();screen.focus();}
  function render(){
    twoFingerUndo?.destroy();twoFingerUndo=null;
    nav.innerHTML=sectionNames.map(([id,label])=>`<button type="button" data-action="navigate" data-to="${id}" ${screenName===id?'aria-current="page"':''}>${label}</button>`).join('');
    if(screenName==='home'){
      const ws=app.store.snapshot;
      screen.innerHTML=`<div class="screen-header"><h1>Student workspace</h1><button data-action="new-note">+ New note</button></div><p class="muted">Foundation demo. Replace all UI with your own designs.</p><div class="inline"><div class="panel">Notes: ${app.notes.list().length}</div><div class="panel">Subjects used: ${ws.subjects.length}</div><div class="panel">Assignments: ${ws.tasks.filter(t=>!t.done).length}</div><div class="panel">Flashcards due: ${app.study.dueCards().length}</div></div><h2>Recent notes</h2>${noteRows(app.notes.list().slice(0,8))}<p id="status-message" role="status"></p>`;
    }else if(screenName==='notes'){
      screen.innerHTML=`<div class="screen-header"><h1>Notes</h1><button data-action="new-note">+ Create note</button></div><div class="fields"><div class="field"><label for="search-notes">Search title, text, tags, subjects</label><input id="search-notes" placeholder="Search all notes…"></div><label class="inline"><input type="checkbox" id="star-filter"> Starred only</label><label class="inline"><input type="checkbox" id="review-filter"> Review due</label></div><div id="notes-results">${noteRows(app.notes.list())}</div>`;
    }else if(screenName==='editor'){
      const n=app.notes.get(noteId);if(!n){navigate('notes');return;}
      if(!n.pages.some(p=>p.id===pageId))pageId=n.lastPageId||n.pages[0].id;
      const page=n.pages.find(p=>p.id===pageId);
      screen.innerHTML=`<div class="screen-header"><h1>Edit note</h1><div class="inline"><button data-action="back-to-notes">← Library</button><button data-action="trash-note">Move to Trash</button></div></div>
        <div class="fields"><div class="field"><label for="note-title">Title</label><input id="note-title" value="${escape(n.title)}"></div><div class="field"><label for="note-tags">Tags (comma-separated)</label><input id="note-tags" value="${escape(n.tags.join(', '))}"></div></div>
        <div class="inline"><label><input id="star-note" type="checkbox" ${n.starred?'checked':''}> Starred</label><label for="review-date">Review on</label><input id="review-date" type="date" value="${escape((n.reviewAt||'').slice(0,10))}"></div>
        <div class="inline" style="margin:12px 0"><span>Tool:</span>${['type','pen','highlighter','eraser'].map(t=>`<button type="button" data-action="tool" data-tool="${t}" ${tool===t?'aria-current="page"':''}>${t}</button>`).join('')}<button type="button" data-action="toggle-shapes" id="shapes-trigger" aria-haspopup="true" aria-expanded="false" ${SHAPE_TYPES.includes(tool)?'aria-current="page"':''}>Shapes</button><div class="shape-palette" id="shape-palette" role="group" aria-label="Choose a shape">${SHAPE_TYPES.map(t=>`<button type="button" data-action="tool" data-tool="${t}" ${tool===t?'aria-current="page"':''}>${t.replaceAll('-',' ')}</button>`).join('')}</div><label for="pen-color">Ink</label><input id="pen-color" type="color" value="${color}"><label for="pen-size">Size</label><input id="pen-size" type="range" min="1" max="14" value="${size}"><button data-action="undo">Undo</button><button data-action="redo">Redo</button><button data-action="clear-ink">Clear ink</button></div>
        <div class="inline" style="margin-bottom:12px"><label>Paper <select id="paper-choice">${opts(PAPER_TYPES,page.paper)}</select></label><span class="pencil-only-label" title="Drawing accepts Apple Pencil contact only">Apple Pencil only</span><button data-action="add-page">+ Page</button><button data-action="duplicate-page">Duplicate page</button><button data-action="delete-page">Delete page</button><button data-action="attach">Attach PDF / image</button></div>
        <div class="editor-layout"><aside class="page-list" aria-label="Pages">${n.pages.map((p,i)=>`<button type="button" data-action="select-page" data-id="${p.id}" ${p.id===pageId?'aria-current="page"':''}>Page ${i+1}</button>`).join('')}</aside>
          <section><div id="writing-surface" class="writing-surface ${tool==='type'?'mode-type':'mode-ink'}" data-paper="${page.paper}"><textarea id="page-text" placeholder="">${escape(page.text)}</textarea><canvas id="ink-canvas" aria-label="Handwriting canvas"></canvas></div></section>
        </div><section class="panel"><h3>Attached files</h3><div class="stack">${page.attachments.map(a=>`<div class="inline"><span>${escape(a.name)} (${Math.ceil(a.size/1024)} KB)</span><button data-action="open-attachment" data-id="${a.id}">Open</button><button data-action="remove-attachment" data-id="${a.id}">Remove</button></div>`).join('')||'<p class="muted">No files attached.</p>'}</div></section><p id="status-message" role="status"></p>`;
      if(tool!=='type'){
        const editor=$('#page-text');
        editor.readOnly=true;
        editor.tabIndex=-1;
        editor.inputMode='none';
        editor.setAttribute('aria-hidden','true');
      }else{
        const editor=$('#page-text');
        editor.readOnly=false;
        editor.tabIndex=0;
        editor.inputMode='text';
        editor.removeAttribute('aria-hidden');
      }
      ink?.destroy();
      ink=mountInkCanvas($('#ink-canvas'),{
        initialStrokes:page.strokes,
        getTool:()=>tool,getColor:()=>color,getSize:()=>size,pencilOnly:()=>app.store.snapshot.settings.pencilOnly,
        onCommit:strokes=>app.notes.updatePage(noteId,pageId,{strokes}),
      });
      twoFingerUndo=mountTwoFingerDoubleTap($('#writing-surface'),{
        enabled:()=>screenName==='editor'&&tool!=='type',
        onUndo:()=>ink?.undo(),
      });
    }else if(screenName==='planner'){
      screen.innerHTML=`<div class="screen-header"><h1>Planner</h1></div><form id="add-task" class="fields"><div class="field"><label for="task-title">Assignment / task</label><input name="title" id="task-title" required></div><div class="field"><label for="task-date">Due date</label><input type="date" id="task-date" name="due"></div><button type="submit">Add task</button></form><section class="panel"><h2>Tasks</h2>${app.study.listTasks().map(t=>`<div class="row inline"><label class="inline"><input data-task="${t.id}" type="checkbox" ${t.done?'checked':''}> ${escape(t.title)}</label><small class="muted">${escape((t.dueAt||'').slice(0,10))}</small><button data-action="delete-task" data-id="${t.id}">Delete</button></div>`).join('')||'<p class="muted">No tasks yet.</p>'}</section>`;
    }else if(screenName==='study'){
      const cards=app.study.dueCards();
      screen.innerHTML=`<div class="screen-header"><h1>Study / Flashcards</h1></div><form id="add-card" class="stack panel"><div class="field"><label>Question</label><input name="front" required></div><div class="field"><label>Answer</label><input name="back" required></div><button>Add flashcard</button></form><h2>Due for review (${cards.length})</h2>${cards.slice(0,15).map(c=>`<div class="panel"><strong>${escape(c.front)}</strong><details><summary>Show answer</summary><p>${escape(c.back)}</p></details><div class="inline"><button data-action="rate" data-id="${c.id}" data-grade="1">Again</button><button data-action="rate" data-id="${c.id}" data-grade="3">Hard</button><button data-action="rate" data-id="${c.id}" data-grade="5">Easy</button></div></div>`).join('')||'<p class="muted">No cards due.</p>'}`;
    }else if(screenName==='files'){
      const files=app.store.snapshot.notes.flatMap(n=>n.pages.flatMap(p=>p.attachments.map(a=>({...a,note:n.title}))));
      screen.innerHTML=`<div class="screen-header"><h1>Files</h1></div><p class="muted">Attachments are stored independently of note JSON as IndexedDB Blobs.</p><section class="panel">${files.map(f=>`<div class="row inline"><span>${escape(f.name)} — ${escape(f.note)}</span><button data-action="open-attachment" data-id="${f.id}">Open</button></div>`).join('')||'No attachments yet. Open a note to attach files.'}</section>`;
    }else if(screenName==='trash'){
      screen.innerHTML=`<div class="screen-header"><h1>Trash</h1></div><section class="panel">${app.notes.list({trash:true}).map(n=>`<div class="row inline"><span>${escape(n.title)}</span><button data-action="restore-note" data-id="${n.id}">Restore</button><button data-action="purge-note" data-id="${n.id}">Delete permanently</button></div>`).join('')||'<p class="muted">Trash is empty.</p>'}</section>`;
    }
  }
  function openNote(id){persistEditorInputs();ink?.destroy();ink=null;const n=app.notes.get(id);if(!n)return;noteId=id;pageId=n.lastPageId||n.pages[0].id;app.notes.setLastPage(id,pageId);tool='pen';screenName='editor';render();screen.focus();}
  const subjectOptions=(text='')=>{
    const curated=app.catalog.search(text,'all',261).map(s=>s.name);
    const custom=app.store.snapshot.subjects.map(s=>s.name).filter(x=>!curated.some(y=>y.toLowerCase()===x.toLowerCase()));
    return [...new Set([...curated,...custom])].sort((a,b)=>a.localeCompare(b));
  };
  const subsectionOptions=(name)=>{
    const saved=app.store.snapshot.subjects.find(s=>s.name.toLowerCase()===name.toLowerCase())?.subsections.map(s=>s.name)||[];
    return [...new Set([...app.catalog.subsections(name),...saved])].sort((a,b)=>a.localeCompare(b));
  };
  function showNewNote(){
    persistEditorInputs();
    let dialog=$('#create-dialog');if(dialog)dialog.remove();
    dialog=document.createElement('dialog');dialog.id='create-dialog';
    dialog.innerHTML=`<form id="create-form" class="stack"><h2>New blank note</h2><p class="muted small">Choose a subject and subsection. Your page will open completely blank.</p>
      <div class="field"><label for="catalog-search">Search the worldwide subject directory</label><input id="catalog-search" placeholder="Search subject or specialization…"></div>
      <div class="fields"><div class="field"><label for="subject-choice">Subject</label><select id="subject-choice" required></select><input id="custom-subject" placeholder="New subject name" hidden></div>
        <div class="field"><label for="subsection-choice">Subsection</label><select id="subsection-choice" required></select><input id="custom-subsection" placeholder="New subsection name" hidden></div></div>
      <div class="fields"><div class="field"><label for="create-title">Note title</label><input id="create-title" value="Untitled note" required></div></div>
      <div class="inline"><button type="button" id="cancel-create">Cancel</button><button type="submit">Create note</button></div></form>`;
    document.body.append(dialog);
    const search=$('#catalog-search',dialog),subject=$('#subject-choice',dialog),sub=$('#subsection-choice',dialog),otherSubject=$('#custom-subject',dialog),otherSub=$('#custom-subsection',dialog);
    const fillSubjects=(q='')=>{const names=subjectOptions(q);subject.innerHTML='<option value="">Select a subject</option>'+opts(names)+'<option value="__other__">Other — create subject</option>';subject.value='';fillSubsections();};
    const fillSubsections=()=>{const name=subject.value;otherSubject.hidden=name!=='__other__';otherSubject.required=!otherSubject.hidden;sub.innerHTML='<option value="">Select a subsection</option>'+opts(name&&name!=='__other__'?subsectionOptions(name):[])+'<option value="__other__">Other — create subsection</option>';otherSub.hidden=true;otherSub.required=false;};
    search.addEventListener('input',()=>fillSubjects(search.value));
    subject.addEventListener('change',fillSubsections);
    sub.addEventListener('change',()=>{otherSub.hidden=sub.value!=='__other__';otherSub.required=!otherSub.hidden;});
    $('#cancel-create',dialog).addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>dialog.remove());
    $('#create-form',dialog).addEventListener('submit',e=>{e.preventDefault();
      const chosenSubject=subject.value==='__other__'?otherSubject.value.trim():subject.value;
      const chosenSub=sub.value==='__other__'?otherSub.value.trim():sub.value;
      if(!chosenSubject||!chosenSub){alert('Choose a subject and a subsection');return;}
      try{const created=app.notes.create({subjectName:chosenSubject,subsectionName:chosenSub,title:$('#create-title',dialog).value,template:'blank',paper:'blank'});dialog.close();openNote(created.id);}catch(error){alert(error.message);}
    });
    fillSubjects();dialog.showModal();
  }
  nav.addEventListener('click',e=>{const b=e.target.closest('button[data-to]');if(b)navigate(b.dataset.to);});
  screen.addEventListener('click',async e=>{
    const button=e.target.closest('button[data-action]');if(!button)return;
    const {action,id:targetId,tool:nextTool}=button.dataset;
    try{
      if(action==='navigate')navigate(button.dataset.to);
      else if(action==='new-note')showNewNote();
      else if(action==='open-note')openNote(targetId);
      else if(action==='back-to-notes')navigate('notes');
      else if(action==='tool'){persistEditorInputs();tool=nextTool;render();}
      else if(action==='toggle-shapes'){
        const palette=$('#shape-palette'),trigger=$('#shapes-trigger');
        const opened=palette?.classList.toggle('open');
        trigger?.setAttribute('aria-expanded',String(!!opened));
      }
      else if(action==='undo')ink?.undo();
      else if(action==='redo')ink?.redo();
      else if(action==='clear-ink'&&confirm('Clear all handwriting on this page?'))ink?.clear();
      else if(action==='add-page'){persistEditorInputs();pageId=app.notes.addPage(noteId,{paper:'blank'}).id;render();}
      else if(action==='duplicate-page'){persistEditorInputs();pageId=app.notes.duplicatePage(noteId,pageId).id;render();}
      else if(action==='delete-page'&&confirm('Delete this page?')){persistEditorInputs();app.notes.deletePage(noteId,pageId);pageId=app.notes.get(noteId).lastPageId;render();}
      else if(action==='select-page'){persistEditorInputs();app.notes.setLastPage(noteId,targetId);pageId=targetId;render();}
      else if(action==='trash-note'&&confirm('Move this note to Trash?')){persistEditorInputs();app.notes.trash(noteId);navigate('notes');}
      else if(action==='restore-note'){app.notes.restore(targetId);render();}
      else if(action==='purge-note'&&confirm('Permanently delete this note and its files?')){await app.notes.purge(targetId);render();}
      else if(action==='rate'){app.study.reviewCard(targetId,Number(button.dataset.grade));render();}
      else if(action==='delete-task'){app.study.deleteTask(targetId);render();}
      else if(action==='attach')fileInput.click();
      else if(action==='open-attachment'){
        const blob=await app.attachments.get(targetId);if(!blob){flashMessage('File not found');return;}
        const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60_000);
      }
      else if(action==='remove-attachment'){if(confirm('Remove this attachment?')){await app.attachments.remove(noteId,pageId,targetId);render();}}
    }catch(error){alert(error.message);}
  });
  screen.addEventListener('input',e=>{
    if(e.target.id==='search-notes'||e.target.id==='star-filter'||e.target.id==='review-filter'){
      $('#notes-results').innerHTML=noteRows(app.notes.list({query:$('#search-notes').value,starred:$('#star-filter').checked,due:$('#review-filter').checked}));
    }
    if(e.target.id==='page-text'||e.target.id==='note-title'){clearTimeout(inputTimeout);inputTimeout=setTimeout(persistEditorInputs,450);}
    if(e.target.id==='pen-color')color=e.target.value;
    if(e.target.id==='pen-size')size=Number(e.target.value);
  });
  screen.addEventListener('change',e=>{
    try{
      if(e.target.id==='paper-choice'){persistEditorInputs();app.notes.updatePage(noteId,pageId,{paper:e.target.value});render();}
      else if(e.target.id==='pencil-only'){}
      else if(e.target.id==='star-note')app.notes.update(noteId,{starred:e.target.checked});
      else if(e.target.id==='note-tags')app.notes.update(noteId,{tags:e.target.value.split(',')});
      else if(e.target.id==='review-date')app.notes.update(noteId,{reviewAt:e.target.value?new Date(`${e.target.value}T12:00:00`).toISOString():null});
      else if(e.target.dataset.task){app.study.updateTask(e.target.dataset.task,{done:e.target.checked});render();}
    }catch(error){alert(error.message);}
  });
  screen.addEventListener('submit',e=>{
    if(!['add-task','add-card'].includes(e.target.id))return;e.preventDefault();
    const data=new FormData(e.target);
    try{
      if(e.target.id==='add-task')app.study.createTask({title:data.get('title'),dueAt:data.get('due')?new Date(`${data.get('due')}T12:00:00`).toISOString():null});
      else app.study.addFlashcard({front:data.get('front'),back:data.get('back')});render();
    }catch(error){alert(error.message);}
  });
  fileInput.addEventListener('change',async()=>{
    try{if(!noteId||!pageId)throw Error('Open a note before attaching files');for(const file of fileInput.files)await app.attachments.attach(noteId,pageId,file);render();}
    catch(error){alert(error.message);}finally{fileInput.value='';}
  });
  $('#export-backup').addEventListener('click',async()=>{
    persistEditorInputs();try{const backup=await app.backup.export();saveAs(`notebook-backup-${new Date().toISOString().slice(0,10)}.json`,new Blob([JSON.stringify(backup)],{type:'application/json'}));}catch(error){alert(error.message);}
  });
  $('#restore-backup').addEventListener('click',()=>$('#restore-file').click());
  $('#restore-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!confirm('Restore this backup? Current notes and files will be replaced. Export a backup first.')){e.target.value='';return;}
    try{await app.backup.restore(JSON.parse(await file.text()));noteId=null;pageId=null;navigate('home');}
    catch(error){alert('Restore failed: '+error.message);}finally{e.target.value='';}
  });
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&screenName==='editor'&&document.activeElement?.id!=='page-text'&&document.activeElement?.id!=='note-title'){e.preventDefault();if(e.shiftKey)ink?.redo();else ink?.undo();}});
  window.addEventListener('pagehide',persistEditorInputs);
  render();
  return {showNewNote,navigate,render,destroy(){twoFingerUndo?.destroy();ink?.destroy();clearTimeout(inputTimeout);}};
}
