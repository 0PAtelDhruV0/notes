import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const port=Number(process.env.PORT||5173);
http.createServer(async(req,res)=>{
  try{
    const name=decodeURI(new URL(req.url,'http://localhost').pathname);
    const target=resolve(root,'.'+(name==='/'?'/index.html':name));
    if(target!==root&&!target.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(target)).isFile())throw Error('Not a file');
    res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store'});
    res.end(await readFile(target));
  }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
}).listen(port,()=>console.log(`Notebook Foundation: http://localhost:${port}`));
