import {mkdir,readdir,readFile,writeFile,rm,copyFile,realpath,lstat} from 'node:fs/promises';
import {resolve,dirname,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ENGINE_VERSION} from '../src/core/index.js';
import {PUBLIC_PAGES} from './public-pages.js';
import {verifyStaticModules} from './public-module-graph.js';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const headers=`/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: no-cache, no-transform
`;

/** Build an explicit public asset set; project research, replays and tooling stay private. */
export async function buildSite({root=projectRoot}={}) {
  const base=resolve(root),output=join(base,'dist');
  const realBase=await realpath(base);
  const entries=new Map(Object.entries(PUBLIC_PAGES));
  const directories=['web','src/core','src/scenarios','src/human','src/runtime','src/games','src/legacy/v0.1','src/legacy/v0.2'];
  for(const source of [...directories,...entries.values()]) {
    const path=join(base,source),info=await lstat(path);
    if(info.isSymbolicLink()||await realpath(path)!==join(realBase,source)||(directories.includes(source)?!info.isDirectory():!info.isFile()))throw new Error(`Invalid public source or symlink: ${source}`);
  }
  const appVersion=JSON.parse(await readFile(join(base,'package.json'),'utf8')).version;
  if(typeof appVersion!=='string'||!/^\d+\.\d+\.\d+$/.test(appVersion))throw new Error('Invalid application version');
  const files=[...entries.keys()];
  for(const directory of directories) {
    for(const entry of await readdir(join(base,directory),{withFileTypes:true})) {
      if(entry.isFile()&&!entry.name.startsWith('.')&&['.js','.css','.svg','.png','.ico'].includes(extname(entry.name)))files.push(`${directory}/${entry.name}`);
    }
  }
  const moduleGraph=verifyStaticModules(await Promise.all(files.filter(file=>file.endsWith('.js')).map(async file=>({path:file,source:await readFile(join(base,file),'utf8')}))));
  await rm(output,{recursive:true,force:true});
  await mkdir(output,{recursive:true});
  await writeFile(join(output,'_headers'),headers);
  files.push('_headers');
  const digest=createHash('sha256');
  for(const file of files.sort()) {
    if(file!=='_headers') {
      await mkdir(dirname(join(output,file)),{recursive:true});
      await copyFile(join(base,entries.get(file)??file),join(output,file));
    }
    digest.update(file).update('\0').update(await readFile(join(output,file))).update('\0');
  }
  let commit=null,dirty=null;
  try {
    const options={cwd:base,encoding:'utf8',stdio:['ignore','pipe','ignore']};
    commit=execFileSync('git',['rev-parse','HEAD'],options).trim();
    dirty=Boolean(execFileSync('git',['status','--porcelain'],options).trim());
  } catch { /* Local play and tests do not require Git. */ }
  const release={appVersion,engineVersion:ENGINE_VERSION,commit,dirty,assetsSha256:digest.digest('hex')};
  await writeFile(join(output,'release.json'),JSON.stringify(release,null,2)+'\n');
  return {directory:output,files:[...files,'release.json'],release,moduleGraph};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const result=await buildSite();
  process.stdout.write(`Built ${result.files.length} public files in dist. Engine ${result.release.engineVersion}. Checked ${result.moduleGraph.modules} static modules and ${result.moduleGraph.staticEdges.length} import edges.\n`);
}
