import {createNotebookApp} from './app.js';
import {mountDeveloperShell} from './ui/developer-shell.js';
const status=document.querySelector('#save-status');
try{
  const notebook=await createNotebookApp();
  // Deliberate developer integration surface for your future UI.
  window.notebookServices=notebook;
  mountDeveloperShell(notebook);
  if(notebook.storageError){
    const banner=document.createElement('div');banner.className='warning';
    banner.textContent=notebook.store.db.persistent?'Subject catalog unavailable; custom subjects still work.':'Local storage unavailable! This session is temporary. Do not rely on it to save notes.';
    document.querySelector('#screen').prepend(banner);
    console.warn('Notebook Foundation startup warning:',notebook.storageError);
  }
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(console.warn);
}catch(error){console.error(error);status.textContent='Cannot start';document.querySelector('#screen').innerHTML='<div role="alert">Notebook failed to load. Check the developer console and your browser storage permissions.</div>';}
