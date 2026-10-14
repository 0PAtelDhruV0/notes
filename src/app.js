import {BrowserDatabase,MemoryDatabase} from './storage/database.js';
import {WorkspaceStore} from './core/workspace-store.js';
import {Catalog} from './services/catalog.js';
import {NotesService} from './services/notes.js';
import {StudyService} from './services/study.js';
import {AttachmentService} from './services/attachments.js';
import {BackupService} from './services/backup.js';
/**
 * Entry point for your future UI/UX. No UI framework required.
 * All application services can be imported individually as well.
 */
export async function createNotebookApp({database=null,catalog=null}={}){
  let storageError=null;
  if(!database){try{database=await BrowserDatabase.open();}catch(error){database=new MemoryDatabase();storageError=error;}}
  if(!catalog){try{catalog=await Catalog.load();}catch(error){catalog=new Catalog();storageError=storageError||error;}}
  const store=await new WorkspaceStore(database).init();
  return {store,catalog,notes:new NotesService(store,catalog),study:new StudyService(store),attachments:new AttachmentService(store),backup:new BackupService(store),storageError};
}
