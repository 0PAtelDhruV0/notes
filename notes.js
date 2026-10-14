import {blankPage,clone,id,isoNow,normalize,PAPER_TYPES,templateText} from '../core/model.js';
const plain=s=>String(s??'').trim();
const touch=n=>{n.updatedAt=isoNow();};
const requireNote=(ws,noteId)=>{const note=ws.notes.find(n=>n.id===noteId);if(!note)throw Error('Note not found');return note;};
const requirePage=(note,pageId)=>{const page=note.pages.find(p=>p.id===pageId);if(!page)throw Error('Page not found');return page;};
export class NotesService {
  constructor(store,catalog){this.store=store;this.catalog=catalog;}
  /** The catalog is a set of suggestions; custom choices use the exact same data model. */
  ensureClassification(subjectName,subsectionName){
    if(!plain(subjectName)||!plain(subsectionName))throw Error('Choose a subject and subsection first');
    let result;
    this.store.transact(ws=>{
      const found=this.catalog.findSubject(subjectName);
      let subject=ws.subjects.find(s=>normalize(s.name)===normalize(subjectName));
      if(!subject){subject={id:id('subject'),name:plain(subjectName),field:found?.field??'Custom / Other',custom:!found,subsections:[]};ws.subjects.push(subject);}
      let subsection=subject.subsections.find(x=>normalize(x.name)===normalize(subsectionName));
      if(!subsection){subsection={id:id('section'),name:plain(subsectionName),custom:!found?.subsections.some(x=>normalize(x)===normalize(subsectionName))};subject.subsections.push(subsection);}
      result={subjectId:subject.id,subsectionId:subsection.id};
    });
    return result;
  }
  create({title='Untitled note',subjectName,subsectionName,template='blank',paper,lectureDate=null,tags=[]}){
    const {subjectId,subsectionId}=this.ensureClassification(subjectName,subsectionName);
    const page=blankPage(paper||this.store.snapshot.settings.defaultPaper);
    page.text=templateText(template);
    const note={id:id('note'),title:plain(title)||'Untitled note',subjectId,subsectionId,createdAt:isoNow(),updatedAt:isoNow(),
      deletedAt:null,starred:false,lectureDate,reviewAt:null,tags:cleanTags(tags),lastPageId:page.id,pages:[page]};
    this.store.transact(ws=>{ws.notes.unshift(note);ws.settings.lastNoteId=note.id;});
    return clone(note);
  }
  get(noteId){return this.store.snapshot.notes.find(n=>n.id===noteId)??null;}
  list({query='',subjectId=null,subsectionId=null,starred=false,trash=false,due=false}={}){
    const ws=this.store.snapshot,q=normalize(query),now=isoNow();
    return ws.notes.filter(n=>{
      if(Boolean(n.deletedAt)!==trash)return false;
      if(subjectId&&n.subjectId!==subjectId)return false;
      if(subsectionId&&n.subsectionId!==subsectionId)return false;
      if(starred&&!n.starred)return false;
      if(due&&(!n.reviewAt||n.reviewAt>now))return false;
      if(!q)return true;
      const subject=ws.subjects.find(s=>s.id===n.subjectId),sub=subject?.subsections.find(x=>x.id===n.subsectionId);
      const hay=[n.title,...n.tags,subject?.name,sub?.name,...n.pages.map(p=>p.text),...n.pages.flatMap(p=>p.attachments.map(f=>f.name))].join(' ');
      return normalize(hay).includes(q);
    }).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  }
  update(noteId,updates){
    const allowed=['title','starred','lectureDate','reviewAt'];
    this.store.transact(ws=>{const n=requireNote(ws,noteId);for(const key of allowed)if(key in updates)n[key]=updates[key];if('tags' in updates)n.tags=cleanTags(updates.tags);touch(n);});
  }
  reclassify(noteId,subjectName,subsectionName){
    const result=this.ensureClassification(subjectName,subsectionName);
    this.store.transact(ws=>{const n=requireNote(ws,noteId);Object.assign(n,result);touch(n);});
  }
  page(noteId,pageId){return this.get(noteId)?.pages.find(p=>p.id===pageId)??null;}
  updatePage(noteId,pageId,{text,paper,strokes}={}){
    this.store.transact(ws=>{const n=requireNote(ws,noteId),p=requirePage(n,pageId);
      if(text!==undefined)p.text=String(text);
      if(paper!==undefined){if(!PAPER_TYPES.includes(paper))throw Error('Unknown paper type');p.paper=paper;}
      if(strokes!==undefined){if(!Array.isArray(strokes))throw Error('Strokes must be an array');p.strokes=clone(strokes);}
      p.updatedAt=isoNow();touch(n);
    });
  }
  addPage(noteId,{paper,afterPageId}={}){
    const page=blankPage(paper||this.store.snapshot.settings.defaultPaper);
    this.store.transact(ws=>{const n=requireNote(ws,noteId);const after=n.pages.findIndex(p=>p.id===afterPageId);n.pages.splice(after<0?n.pages.length:after+1,0,page);n.lastPageId=page.id;touch(n);});
    return clone(page);
  }
  duplicatePage(noteId,pageId){
    let copy;
    this.store.transact(ws=>{const n=requireNote(ws,noteId);const index=n.pages.findIndex(p=>p.id===pageId);if(index<0)throw Error('Page not found');copy=clone(n.pages[index]);copy.id=id('page');copy.createdAt=isoNow();copy.updatedAt=isoNow();n.pages.splice(index+1,0,copy);n.lastPageId=copy.id;touch(n);});
    return clone(copy);
  }
  reorderPage(noteId,pageId,toIndex){this.store.transact(ws=>{const n=requireNote(ws,noteId),index=n.pages.findIndex(p=>p.id===pageId);if(index<0)throw Error('Page not found');const [page]=n.pages.splice(index,1);n.pages.splice(Math.max(0,Math.min(n.pages.length,Math.floor(toIndex))),0,page);touch(n);});}
  deletePage(noteId,pageId){this.store.transact(ws=>{const n=requireNote(ws,noteId);if(n.pages.length===1)throw Error('A note must have at least one page');const index=n.pages.findIndex(p=>p.id===pageId);if(index<0)throw Error('Page not found');n.pages.splice(index,1);if(n.lastPageId===pageId)n.lastPageId=n.pages[Math.min(index,n.pages.length-1)].id;touch(n);});}
  setLastPage(noteId,pageId){this.store.transact(ws=>{const n=requireNote(ws,noteId);requirePage(n,pageId);n.lastPageId=pageId;ws.settings.lastNoteId=noteId;});}
  trash(noteId){this.store.transact(ws=>{const n=requireNote(ws,noteId);n.deletedAt=isoNow();touch(n);});}
  restore(noteId){this.store.transact(ws=>{const n=requireNote(ws,noteId);n.deletedAt=null;touch(n);});}
  /** Purge removes references; attachments are deleted after the workspace write succeeds. */
  async purge(noteId){
    const note=this.get(noteId);if(!note)throw Error('Note not found');
    if(!note.deletedAt)throw Error('Move a note to Trash before permanently deleting it');
    const ids=note.pages.flatMap(p=>p.attachments.map(a=>a.id));
    this.store.transact(ws=>{ws.notes=ws.notes.filter(n=>n.id!==noteId);});
    await this.store.flush();
    const stillReferenced=new Set(this.store.snapshot.notes.flatMap(n=>n.pages.flatMap(p=>p.attachments.map(a=>a.id))));
    for(const assetId of ids)if(!stillReferenced.has(assetId))await this.store.db.deleteFile(assetId);
  }
}
function cleanTags(tags){return [...new Set((Array.isArray(tags)?tags:[]).map(t=>plain(t)).filter(Boolean))].slice(0,20);}
