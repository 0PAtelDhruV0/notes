import {normalize} from '../core/model.js';
/** Handles quoted CSV values, Unicode and UTF-8 BOM; no global dependencies. */
export function parseCsv(content){
  const data=[], row=[];let text='',quote=false;
  const source=String(content).replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quote){if(c==='"'&&source[i+1]==='"'){text+='"';i++;}else if(c==='"')quote=false;else text+=c;}
    else if(c==='"')quote=true;
    else if(c===','){row.push(text);text='';}
    else if(c==='\r'||c==='\n'){
      if(c==='\r'&&source[i+1]==='\n')i++;
      row.push(text);if(row.some(x=>x!==''))data.push([...row]);row.length=0;text='';
    }else text+=c;
  }
  if(text||row.length){row.push(text);data.push([...row]);}
  const [header,...records]=data;
  if(!header||!['broad_field','subject','subsection'].every(k=>header.includes(k)))throw Error('Expected broad_field,subject,subsection CSV columns');
  return records.map(row=>Object.fromEntries(header.map((h,i)=>[h,(row[i]??'').trim()])));
}
export class Catalog {
  constructor(entries=[]){this.entries=entries;this.subjects=[];this.fields=[];this._compile();}
  static async load(path='./catalog/worldwide-subjects.csv'){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok)throw Error(`Could not load subject catalog (${response.status})`);
    return new Catalog(parseCsv(await response.text()));
  }
  _compile(){
    const map=new Map();const fields=new Set();
    for(const entry of this.entries){
      fields.add(entry.broad_field);
      const key=normalize(entry.subject);
      if(!map.has(key))map.set(key,{name:entry.subject,field:entry.broad_field,subsections:[]});
      const subject=map.get(key);
      if(entry.subsection&&!subject.subsections.some(name=>normalize(name)===normalize(entry.subsection)))subject.subsections.push(entry.subsection);
    }
    this.subjects=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
    this.fields=[...fields].sort();
  }
  search(query='',field='all',limit=100){
    const q=normalize(query);
    return this.subjects.filter(s=>(field==='all'||s.field===field) && (!q||normalize(s.name).includes(q)||normalize(s.field).includes(q)||s.subsections.some(x=>normalize(x).includes(q)))).slice(0,limit);
  }
  findSubject(name){return this.subjects.find(s=>normalize(s.name)===normalize(name))??null;}
  subsections(name){return this.findSubject(name)?.subsections??[];}
}
