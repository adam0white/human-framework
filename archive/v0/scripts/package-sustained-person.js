import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packagePrivatePerson} from './private-package.js';

export const SUSTAINED_SOURCES=Object.freeze([
  'src/development/index.js','src/development/condition.js','src/development/learning.js',
  'src/person/index.js','src/person/commitments.js','src/human/v0.1.1.js','src/core/model.js'
]);

/** Private, explicitly selected candidate. Existing releases retain their source identities. */
export async function packageSustainedPerson({outputDirectory}={}) {
  const metadata={name:'sustained-person',version:'0.1.0',private:true,type:'module',license:'UNLICENSED',
    description:'Private continuous-day and retained-learning candidate for situated people',engines:{node:'>=22'},
    exports:{'.':'./src/development/index.js','./learning':'./src/development/learning.js',
      './situated':'./src/person/index.js','./commitments':'./src/person/commitments.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{sustained:'0.1.0',situated:'0.1.0',human:'0.1.1'},files:SUSTAINED_SOURCES};
  return packagePrivatePerson({sources:SUSTAINED_SOURCES,metadata,defaultDirectory:'sustained',outputDirectory});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-sustained-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packageSustainedPerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
