import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
const [entry,snapshot]=process.argv.slice(2),importStart=performance.now();
const api=await import(pathToFileURL(entry));const importMs=performance.now()-importStart;
const raw=readFileSync(snapshot,'utf8'),start=performance.now();
const game=api.restoreGame(JSON.parse(raw));const parseAndRestoreMs=performance.now()-start;
console.log(JSON.stringify({node:process.version,importMs,parseAndRestoreMs,now:(game.world??game).clock.now}));
