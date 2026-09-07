import {mkdir,readdir,readFile,writeFile,rm,copyFile,realpath,lstat} from 'node:fs/promises';
import {resolve,dirname,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ENGINE_VERSION} from '../src/core/index.js';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const headers=`/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: no-cache
`;

/** Build an explicit public asset set; project research, replays and tooling stay private. */
export async function buildSite({root=projectRoot}={}) {
  const base=resolve(root),output=join(base,'dist');
  const realBase=await realpath(base);
  for(const source of ['index.html','web','src/core','src/scenarios']) {
    const path=join(base,source),info=await lstat(path);
    if(info.isSymbolicLink()||await realpath(path)!==join(realBase,source)||(source==='index.html'?!info.isFile():!info.isDirectory()))throw new Error(`Invalid public source or symlink: ${source}`);
  }
  const files=['index.html'];
  for(const directory of ['web','src/core','src/scenarios']) {
    for(const entry of await readdir(join(base,directory),{withFileTypes:true})) {
      if(entry.isFile()&&!entry.name.startsWith('.')&&['.js','.css','.svg','.png','.ico'].includes(extname(entry.name)))files.push(`${directory}/${entry.name}`);
    }
  }
  await rm(output,{recursive:true,force:true});
  await mkdir(output,{recursive:true});
  await writeFile(join(output,'_headers'),headers);
  files.push('_headers');
  const digest=createHash('sha256');
  for(const file of files.sort()) {
    if(file!=='_headers') {
      await mkdir(dirname(join(output,file)),{recursive:true});
      await copyFile(join(base,file),join(output,file));
    }
    digest.update(file).update('\0').update(await readFile(join(output,file))).update('\0');
  }
  let commit=null,dirty=null;
  try {
    const options={cwd:base,encoding:'utf8',stdio:['ignore','pipe','ignore']};
    commit=execFileSync('git',['rev-parse','HEAD'],options).trim();
    dirty=Boolean(execFileSync('git',['status','--porcelain'],options).trim());
  } catch { /* Local play and tests do not require Git. */ }
  const release={engineVersion:ENGINE_VERSION,commit,dirty,assetsSha256:digest.digest('hex')};
  await writeFile(join(output,'release.json'),JSON.stringify(release,null,2)+'\n');
  return {directory:output,files:[...files,'release.json'],release};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const result=await buildSite();
  process.stdout.write(`Built ${result.files.length} public files in dist. Engine ${result.release.engineVersion}.\n`);
}
