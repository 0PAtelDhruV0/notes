import {id,isoNow} from '../core/model.js';
const MAX_FILE_SIZE=25*1024*1024;
const ACCEPTED=new Set(['application/pdf','image/png','image/jpeg','text/plain']);
export class AttachmentService {
  constructor(store){this.store=store;}
  async attach(noteId,pageId,file){
    if(!file||typeof file.size!=='number'||typeof file.type!=='string')throw Error('Expected a browser File');
    if(!ACCEPTED.has(file.type))throw Error('Supported files: PDF, PNG, JPEG and TXT');
    if(file.size>MAX_FILE_SIZE)throw Error('This version allows files up to 25 MB');
    const ws=this.store.snapshot,n=ws.notes.find(n=>n.id===noteId),p=n?.pages.find(p=>p.id===pageId);
    if(!p)throw Error('Page not found');
    const metadata={id:id('asset'),name:file.name||'Attachment',type:file.type,size:file.size,createdAt:isoNow()};
    await this.store.db.putFile(metadata.id,file);
    try{
      this.store.transact(draft=>{const page=draft.notes.find(n=>n.id===noteId)?.pages.find(p=>p.id===pageId);if(!page)throw Error('Page no longer exists');page.attachments.push(metadata);});
      await this.store.flush();
    }catch(err){await this.store.db.deleteFile(metadata.id);throw err;}
    return metadata;
  }
  async get(assetId){return this.store.db.getFile(assetId);}
  async remove(noteId,pageId,assetId){
    this.store.transact(ws=>{const page=ws.notes.find(n=>n.id===noteId)?.pages.find(p=>p.id===pageId);if(!page)throw Error('Page not found');page.attachments=page.attachments.filter(a=>a.id!==assetId);});
    await this.store.flush();
    const stillUsed=this.store.snapshot.notes.some(n=>n.pages.some(p=>p.attachments.some(a=>a.id===assetId)));
    if(!stillUsed)await this.store.db.deleteFile(assetId);
  }
}
