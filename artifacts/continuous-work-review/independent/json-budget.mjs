import {spawnSync} from 'node:child_process';
const host='/Users/abdul/code/human-framework/.worktrees/rest-work/src/experiments/continuous-work/host.js';
for(const depth of [14,18,22,26]){
 const source=`import {restoreContinuation} from ${JSON.stringify(host)};let value={x:'a'};for(let i=0;i<${depth};i++)value={left:value,right:value};const at=performance.now();try{restoreContinuation(value)}catch(e){console.log(JSON.stringify({depth:${depth},elapsedMs:performance.now()-at,error:e.message}));}`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:2500});
 console.log(JSON.stringify({depth,status:result.status,signal:result.signal,error:result.error?.code,stdout:result.stdout}));
}
