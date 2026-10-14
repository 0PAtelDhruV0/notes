/**
 * Domain schema v1. This file and the services are intentionally independent of the UI.
 * All timestamps are ISO-8601 UTC strings. IDs are opaque strings, never array indexes.
 * Browser-clonable plain JSON is stored; large file blobs live in a separate IndexedDB store.
 */
export const SCHEMA_VERSION = 1;
export const PAPER_TYPES = Object.freeze(['blank','ruled','grid','dots','cornell']);
export const TOOL_TYPES = Object.freeze(['pen','highlighter','eraser','line','rectangle']);
export const NOTE_TEMPLATES = Object.freeze(['blank','lecture','cornell','problem','lab','reading','revision']);
export const isoNow = () => new Date().toISOString();
export const id = (prefix='id') => `${prefix}_${typeof crypto!=='undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36)}`;
export const clone = v => structuredClone(v);
export const normalize = text => String(text??'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function blankPage(paper='ruled') {
  return {id:id('page'),paper:PAPER_TYPES.includes(paper)?paper:'ruled',text:'',strokes:[],attachments:[],createdAt:isoNow(),updatedAt:isoNow()};
}
export function initialWorkspace() {
  const stamp=isoNow();
  return {schemaVersion:SCHEMA_VERSION,id:id('workspace'),createdAt:stamp,updatedAt:stamp,revision:0,
    subjects:[],notes:[],tasks:[],flashcards:[],
    settings:{defaultPaper:'ruled',pencilOnly:false,autosave:true,lastNoteId:null},
  };
}
/** Reject corrupt/incompatible restores rather than quietly overwriting good data. */
export function validateWorkspace(data) {
  if(!data || typeof data!=='object'||Array.isArray(data))throw Error('Backup is not an object');
  if(data.schemaVersion!==SCHEMA_VERSION)throw Error(`Incompatible backup version ${data.schemaVersion}; expected ${SCHEMA_VERSION}. Migration is required.`);
  if(!Array.isArray(data.notes)||!Array.isArray(data.subjects)||!Array.isArray(data.tasks)||!Array.isArray(data.flashcards))throw Error('Workspace collections are missing');
  if(typeof data.id!=='string'||!data.settings||typeof data.settings!=='object')throw Error('Workspace information is missing');
  const ids=new Set();
  for(const n of data.notes){
    if(!n || typeof n.id!=='string'||typeof n.title!=='string'||!Array.isArray(n.pages)||!n.pages.length)throw Error('Backup contains an invalid note');
    if(ids.has(n.id))throw Error('Backup contains duplicate note IDs');
    ids.add(n.id);
    for(const p of n.pages){if(typeof p.id!=='string'||!Array.isArray(p.strokes)||!Array.isArray(p.attachments)||typeof p.text!=='string')throw Error('Backup contains an invalid page');}
  }
  for(const s of data.subjects){if(typeof s.id!=='string'||typeof s.name!=='string'||!Array.isArray(s.subsections))throw Error('Backup contains an invalid subject');}
  return true;
}
export function summarizeWorkspace(data){
  return {notes:data.notes.filter(n=>!n.deletedAt).length,trash:data.notes.filter(n=>n.deletedAt).length,subjects:data.subjects.length,tasks:data.tasks.length,flashcards:data.flashcards.length};
}
export function templateText(template){
  return ({
    blank:'',
    lecture:'Topic:\nDate:\n\nKey concepts\n\nExamples\n\nQuestions to ask\n\nSummary',
    cornell:'CUES / QUESTIONS\n\n\nNOTES\n\n\nSUMMARY',
    problem:'Problem\n\nKnown values\n\nSolution steps\n\nCheck / final answer',
    lab:'Aim\n\nMaterials\n\nProcedure\n\nObservations\n\nResults\n\nConclusion',
    reading:'Source / author\n\nMain argument\n\nKey evidence\n\nKey quotes\n\nMy reflections',
    revision:'Learning goals\n\nThings I know\n\nThings to revise\n\nPractice questions\n\nNext review date'
  })[template]??'';
}
