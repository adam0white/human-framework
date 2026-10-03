import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packagePrivatePerson} from './private-package.js';

export const DEVELOPING_SOURCES=Object.freeze([
  'src/developing/index.js','src/developing/person.js','src/affect/appraisal.js','src/social/relationships.js','src/meaning/duties.js','src/lifecourse/adult.js',
  'src/cognition/index.js','src/cognition/beliefs.js','src/cognition/planner.js',
  'src/development/index.js','src/development/condition.js','src/development/learning.js',
  'src/person/index.js','src/person/commitments.js','src/human/v0.1.1.js','src/core/model.js'
]);

/** Private, explicitly selected candidate. Existing releases retain their source identities. */
export async function packageDevelopingPerson({outputDirectory}={}) {
  const metadata={name:'developing-person',version:'0.1.0',private:true,type:'module',license:'UNLICENSED',
    description:'Private relationships, understood duty and adult course candidate',engines:{node:'>=22'},
    exports:{'.':'./src/developing/index.js','./cognition':'./src/cognition/index.js','./sustained':'./src/development/index.js','./learning':'./src/development/learning.js',
      './situated':'./src/person/index.js','./commitments':'./src/person/commitments.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{developingPerson:'0.1.0',appraisal:'0.1.0',relationships:'0.1.0',duties:'0.1.0',adultCourse:'0.1.0',cognition:'0.1.0',sustained:'0.1.0',situated:'0.1.0',human:'0.1.1'},files:DEVELOPING_SOURCES};
  return packagePrivatePerson({sources:DEVELOPING_SOURCES,metadata,defaultDirectory:'developing',outputDirectory});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-developing-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packageDevelopingPerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
