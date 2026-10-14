import {clone,initialWorkspace,isoNow,validateWorkspace} from './model.js';
/** Serialized writes: even rapid UI events never issue simultaneous conflicting workspace writes. */
export class WorkspaceStore {
  constructor(database){this.db=database;this.state=null;this.listeners=new Set();this.saveQueue=Promise.resolve();this.status='Loading';this.error=null;}
  async init(){const existing=await this.db.getWorkspace();if(existing){validateWorkspace(existing);this.state=existing;}else{this.state=initialWorkspace();await this.db.putWorkspace(this.state);}this.status=this.db.persistent?'Saved locally':'Temporary session only';this.emit();return this;}
  get snapshot(){return clone(this.state);}
  subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
  emit(){for(const fn of this.listeners)fn(this.snapshot,this.status,this.error);}
  /** update must be a synchronous callback (not async). */
  transact(update){
    const next=clone(this.state);
    const result=update(next);
    if(result instanceof Promise)throw Error('Do not use async operations inside transact');
    next.revision=(next.revision||0)+1;next.updatedAt=isoNow();validateWorkspace(next);
    this.state=next;this.status='Saving…';this.error=null;this.emit();
    const toSave=clone(next);
    this.saveQueue=this.saveQueue.catch(()=>undefined).then(async()=>{
      await this.db.putWorkspace(toSave);
      if(this.state.revision===toSave.revision){this.status=this.db.persistent?'Saved locally':'Temporary session only';this.error=null;this.emit();}
    }).catch(err=>{this.error=err;this.status='SAVE FAILED — export a backup';this.emit();throw err;});
    // Attach a rejection handler so a failed background write does not become unhandled.
    this.saveQueue.catch(()=>{});
    return result;
  }
  async flush(){await this.saveQueue;}
  async replace(restored,files=[]){validateWorkspace(restored);await this.flush();await this.db.replaceAll(restored,files);this.state=clone(restored);this.status=this.db.persistent?'Saved locally':'Temporary session only';this.error=null;this.emit();}
}
