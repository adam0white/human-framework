import {runApproach,APPROACHES} from '../src/games/commons-policy.js';
import {COMMONS_VERSION} from '../src/games/commons.js';
const report={gameVersion:COMMONS_VERSION,design:'Four deterministic runs: two authored visible-state approaches, each alone and with an explicitly requested neighbor. No random conditions or seed samples.',censorMinutes:4000,results:[false,true].flatMap(solo=>APPROACHES.map(policy=>runApproach({solo,policy})))};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
