import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const cwd=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000}).trim();
try {
  if(git('status','--porcelain'))throw new Error('Commit the intended changes before deploying; the working tree is not clean.');
  if(git('branch','--show-current')!=='main')throw new Error('Production deployment uses the reviewed main branch.');
  const commit=git('rev-parse','HEAD');
  const remote=git('ls-remote','--exit-code','origin','refs/heads/main').split(/\s/)[0];
  if(remote!==commit)throw new Error('Push this commit to origin/main before deploying.');
  process.stdout.write(`Release source verified: ${commit}\n`);
} catch(error) {
  process.stderr.write(`Release stopped: ${error.message}\n`);
  process.exitCode=1;
}
