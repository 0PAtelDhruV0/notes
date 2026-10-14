import {createNotebookApp} from './app.js';
import {mountDeveloperShell} from './ui/developer-shell.js';
import {enhanceNotesUI} from './ui/notes-enhance.js';
const status=document.querySelector('#save-status');
try{
 const app=await createNotebookApp();
 window.notebookServices=app;
 const shell=mountDeveloperShell(app);
 enhanceNotesUI(app,shell);
 if(app.storageError){
  const w=document.createElement('div');w.className='warning';w.textContent=app.store.db.persistent?'Subject directory unavailable; custom subjects still work.':'Storage unavailable: this session is temporary. Please do not rely on notes being saved.';
  document.querySelector('#screen').prepend(w);
 }
 if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(console.warn);
}catch(err){
 console.error(err);
 status.textContent='Cannot start';
 document.querySelector('#screen').innerHTML='<div class="warning" role="alert">Notes could not start. Reload this page and check browser storage permissions.</div>';
}