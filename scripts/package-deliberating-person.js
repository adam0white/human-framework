import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packagePrivatePerson} from './private-package.js';

export const DELIBERATING_SOURCES=Object.freeze([
  'src/cognition/index.js','src/cognition/beliefs.js','src/cognition/planner.js',
  'src/development/index.js','src/development/condition.js','src/development/learning.js',
  'src/person/index.js','src/person/commitments.js','src/human/v0.1.1.js','src/core/model.js'
]);

/** Private, explicitly selected candidate. Existing releases retain their source identities. */
export async function packageDeliberatingPerson({outputDirectory}={}) {
  const metadata={name:'deliberating-person',version:'0.1.0',private:true,type:'module',license:'UNLICENSED',
    description:'Private evidence revision and bounded planning candidate',engines:{node:'>=22'},
    exports:{'.':'./src/cognition/index.js','./sustained':'./src/development/index.js','./learning':'./src/development/learning.js',
      './situated':'./src/person/index.js','./commitments':'./src/person/commitments.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{cognition:'0.1.0',sustained:'0.1.0',situated:'0.1.0',human:'0.1.1'},files:DELIBERATING_SOURCES};
  return packagePrivatePerson({sources:DELIBERATING_SOURCES,metadata,defaultDirectory:'deliberating',outputDirectory});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-deliberating-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packageDeliberatingPerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
