import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PUBLIC_PAGES,HTML_ROUTES} from './public-pages.js';
import {PUBLIC_ASSETS} from './public-assets.js';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const publicSources=new Set([...Object.values(PUBLIC_PAGES),...PUBLIC_ASSETS]);
function allowed(path) {return publicSources.has(path);}

export function createAppServer({root=projectRoot}={}) {
  const base=resolve(root);
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{Allow:'GET, HEAD'});res.end('Method not allowed');return;}
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const relative=pathname==='/index.html'?PUBLIC_PAGES['index.html']:Object.hasOwn(HTML_ROUTES,pathname)?HTML_ROUTES[pathname]:pathname.slice(1);
      if(!allowed(relative)||relative.split('/').some(p=>p==='..'||p.startsWith('.'))) {res.writeHead(404);res.end();return;}
      const path=await realpath(resolve(base,relative)),realBase=await realpath(base);
      if(path!==resolve(realBase,relative)) {res.writeHead(403);res.end();return;}
      const info=await stat(path);
      if(!info.isFile()) {res.writeHead(404);res.end();return;}
      const content=await readFile(path);
      res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Content-Length':content.length});
      res.end(req.method==='HEAD'?undefined:content);
    } catch(error) {
      res.writeHead(error instanceof URIError?400:404);res.end();
    }
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const value=process.env.PORT??'4173';
  const port=Number(value);
  if(!Number.isInteger(port)||port<1||port>65535) {process.stderr.write('PORT must be an integer from 1 to 65535.\n');process.exitCode=1;}
  else {
    const server=createAppServer();
    server.on('error',error=>{process.stderr.write(`Cannot start examples: ${error.message}\n`);process.exitCode=1;});
    server.listen(port,'127.0.0.1',()=>process.stdout.write(`Human Framework examples: http://127.0.0.1:${port}\nLocal only. Press Ctrl+C to stop.\n`));
  }
}
