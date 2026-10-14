const DB_NAME='notebook-foundation-v1';
const DB_VERSION=1;
function asPromise(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('IndexedDB failed'));});}
function done(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Transaction failed'));tx.onabort=()=>reject(tx.error||Error('Transaction was aborted'));});}
/** IndexedDB adapter; record identifiers are stable across app upgrades. */
export class BrowserDatabase {
  constructor(db){this.db=db;this.persistent=true;}
  static async open(){
    if(!globalThis.indexedDB)throw Error('This browser does not support IndexedDB');
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const database=request.result;
        if(!database.objectStoreNames.contains('workspace'))database.createObjectStore('workspace');
        if(!database.objectStoreNames.contains('files'))database.createObjectStore('files');
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('Could not open IndexedDB'));
      request.onblocked=()=>reject(Error('Close other tabs running an older version of Notebook and reload'));
    });
    db.onversionchange=()=>db.close();
    return new BrowserDatabase(db);
  }
  async getWorkspace(){const tx=this.db.transaction('workspace','readonly');const value=await asPromise(tx.objectStore('workspace').get('current'));await done(tx);return value??null;}
  async putWorkspace(data){const tx=this.db.transaction('workspace','readwrite');tx.objectStore('workspace').put(data,'current');await done(tx);}
  async putFile(fileId,blob){const tx=this.db.transaction('files','readwrite');tx.objectStore('files').put(blob,fileId);await done(tx);}
  async getFile(fileId){const tx=this.db.transaction('files','readonly');const value=await asPromise(tx.objectStore('files').get(fileId));await done(tx);return value??null;}
  async deleteFile(fileId){const tx=this.db.transaction('files','readwrite');tx.objectStore('files').delete(fileId);await done(tx);}
  async listFileIds(){const tx=this.db.transaction('files','readonly');const keys=await asPromise(tx.objectStore('files').getAllKeys());await done(tx);return keys;}
  async replaceAll(workspace,files){const tx=this.db.transaction(['workspace','files'],'readwrite');const fileStore=tx.objectStore('files');fileStore.clear();tx.objectStore('workspace').put(workspace,'current');for(const f of files)fileStore.put(f.blob,f.id);await done(tx);}
}
/** Test-only / ephemeral fallback. Not persistent; the UI labels this loudly. */
export class MemoryDatabase {
  constructor(){this.persistent=false;this.workspace=null;this.files=new Map();}
  async getWorkspace(){return this.workspace?structuredClone(this.workspace):null;}
  async putWorkspace(data){this.workspace=structuredClone(data);}
  async putFile(id,blob){this.files.set(id,blob);}
  async getFile(id){return this.files.get(id)??null;}
  async deleteFile(id){this.files.delete(id);}
  async listFileIds(){return [...this.files.keys()];}
  async replaceAll(data,files){this.workspace=structuredClone(data);this.files=new Map(files.map(f=>[f.id,f.blob]));}
}
