// Private build parser. Compilation and linkage only: never call evaluate().
import {SourceTextModule} from 'node:vm';
import {readFileSync} from 'node:fs';
const origin='https://public-build.invalid',entries=JSON.parse(readFileSync(0,'utf8'));
const modules=new Map(),staticEdges=[];
let current='module set';
try{
  for(const {path,source} of entries){current=path;modules.set(path,new SourceTextModule(source,{identifier:path}));}
  function target(specifier,from){
    if(/[?#%]/.test(specifier))throw new Error(`Query, fragment or encoded module identity is not supported in ${from}`);
    if(!specifier.startsWith('./')&&!specifier.startsWith('../')&&!specifier.startsWith('/'))throw new Error(`Non-local browser import in ${from}`);
    const url=new URL(specifier,`${origin}/${from}`);
    if(url.origin!==origin)throw new Error(`Non-local browser import in ${from}`);
    const path=decodeURIComponent(url.pathname).slice(1);
    if(!modules.has(path))throw new Error(`Unavailable/private static module ${path} requested by ${from}`);
    return path;
  }
  for(const [path,module] of modules)for(const specifier of module.dependencySpecifiers)staticEdges.push({from:path,to:target(specifier,path)});
  for(const [path,module] of modules){
    current=path;
    if(module.status==='unlinked')await module.link((specifier,from,extra)=>{
      if(Object.keys(extra.attributes??extra.assert??{}).length)throw new Error(`Unsupported browser module attributes in ${from.identifier}`);
      return modules.get(target(specifier,from.identifier));
    });
  }
  staticEdges.sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  process.stdout.write(JSON.stringify({ok:true,graph:{modules:modules.size,staticEdges,
    scope:'Static JavaScript imports/reexports only; no source evaluation, dynamic imports, HTML/CSS/fetch/worker assets or runtime behavior checked.'}}));
}catch(error){process.stdout.write(JSON.stringify({ok:false,error:`Public module ${current}: ${error.message}`}));}
