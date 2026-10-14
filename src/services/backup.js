import {validateWorkspace} from '../core/model.js';
const bytesToBase64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);};
const base64ToBytes=base64=>{const s=atob(base64),array=new Uint8Array(s.length);for(let i=0;i<s.length;i++)array[i]=s.charCodeAt(i);return array;};
/** Full JSON export including binary attachments. Larger backups use memory; streaming export is a later upgrade. */
export class BackupService {
  constructor(store){this.store=store;}
  async export(){
    await this.store.flush();
    const workspace=this.store.snapshot;
    const usedIds=new Set(workspace.notes.flatMap(n=>n.pages.flatMap(p=>p.attachments.map(a=>a.id))));
    const files=[];
    for(const fileId of usedIds){const blob=await this.store.db.getFile(fileId);if(!blob)throw Error(`Attachment ${fileId} is missing; backup cancelled`);
      files.push({id:fileId,type:blob.type||'application/octet-stream',data:bytesToBase64(new Uint8Array(await blob.arrayBuffer()))});
    }
    return {format:'notebook-foundation-backup',version:1,exportedAt:new Date().toISOString(),workspace,files};
  }
  async restore(raw){
    if(!raw||raw.format!=='notebook-foundation-backup'||raw.version!==1)throw Error('Unsupported backup format');
    validateWorkspace(raw.workspace);
    if(!Array.isArray(raw.files))throw Error('Backup attachments are missing');
    const usedIds=new Set(raw.workspace.notes.flatMap(n=>n.pages.flatMap(p=>p.attachments.map(a=>a.id))));
    const providedIds=new Set(raw.files.map(f=>f.id));
    for(const id of usedIds)if(!providedIds.has(id))throw Error(`Backup is missing attachment ${id}`);
    const restored=raw.files.map(f=>{
      if(typeof f.id!=='string'||typeof f.data!=='string')throw Error('Invalid attachment record');
      return {id:f.id,blob:new Blob([base64ToBytes(f.data)],{type:f.type||'application/octet-stream'})};
    });
    await this.store.replace(raw.workspace,restored);
  }
}
