import {id,isoNow} from '../core/model.js';
export class StudyService {
  constructor(store){this.store=store;}
  createTask({title,subjectId=null,subsectionId=null,dueAt=null,priority='normal'}={}){
    if(!String(title??'').trim())throw Error('Task title is required');
    const task={id:id('task'),title:String(title).trim(),subjectId,subsectionId,dueAt,priority,done:false,createdAt:isoNow(),updatedAt:isoNow()};
    this.store.transact(ws=>ws.tasks.push(task));return task;
  }
  updateTask(taskId,updates){this.store.transact(ws=>{const task=ws.tasks.find(x=>x.id===taskId);if(!task)throw Error('Task not found');for(const k of ['title','dueAt','done','priority','subjectId','subsectionId'])if(k in updates)task[k]=updates[k];task.updatedAt=isoNow();});}
  deleteTask(taskId){this.store.transact(ws=>ws.tasks=ws.tasks.filter(t=>t.id!==taskId));}
  listTasks({showDone=true}={}){return this.store.snapshot.tasks.filter(t=>showDone||!t.done).sort((a,b)=>(a.dueAt||'9999').localeCompare(b.dueAt||'9999'));}
  addFlashcard({front,back,subjectId=null,subsectionId=null,noteId=null}){
    if(!String(front??'').trim()||!String(back??'').trim())throw Error('Question and answer are required');
    const card={id:id('card'),front:String(front).trim(),back:String(back).trim(),subjectId,subsectionId,noteId,intervalDays:0,ease:2.5,repetitions:0,dueAt:isoNow(),createdAt:isoNow()};
    this.store.transact(ws=>ws.flashcards.push(card));return card;
  }
  dueCards(){const current=isoNow();return this.store.snapshot.flashcards.filter(c=>c.dueAt<=current);}
  /** Small SM-2-inspired review schedule; portable core, adjustable later. */
  reviewCard(cardId,grade){
    if(!Number.isInteger(grade)||grade<0||grade>5)throw Error('Review grade must be 0 through 5');
    this.store.transact(ws=>{const card=ws.flashcards.find(c=>c.id===cardId);if(!card)throw Error('Flashcard not found');
      if(grade<3){card.repetitions=0;card.intervalDays=1;}
      else {card.intervalDays=card.repetitions===0?1:card.repetitions===1?6:Math.max(1,Math.round(card.intervalDays*card.ease));card.repetitions++;}
      card.ease=Math.max(1.3,card.ease+(.1-(5-grade)*(.08+(5-grade)*.02)));
      card.dueAt=new Date(Date.now()+card.intervalDays*86400000).toISOString();
    });
  }
}
