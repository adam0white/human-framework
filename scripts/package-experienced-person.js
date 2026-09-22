import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packagePrivatePerson} from './private-package.js';

/** Exact private source allowlist; historical candidate and runtime bytes are copied unchanged. */
export const EXPERIENCED_SOURCES=Object.freeze([
  'src/experience/index.js','src/experience/workspace.js','src/experience/episodes.js',
  'src/experience/attention.js','src/experience/inference.js',
  'src/adaptive/index.js','src/adaptive/person.js','src/adaptation/habits.js',
  'src/constraints/functional.js','src/institution/access.js',
  'src/developing/index.js','src/developing/person.js','src/affect/appraisal.js','src/social/relationships.js','src/meaning/duties.js','src/lifecourse/adult.js',
  'src/cognition/index.js','src/cognition/beliefs.js','src/cognition/planner.js',
  'src/development/index.js','src/development/condition.js','src/development/learning.js',
  'src/person/index.js','src/person/commitments.js','src/human/v0.1.1.js','src/core/model.js'
]);

export async function packageExperiencedPerson({outputDirectory}={}) {
  const metadata={name:'experienced-person',version:'0.1.0',private:true,type:'module',license:'UNLICENSED',
    description:'Private actor episode, attention and authored inference candidate',engines:{node:'>=22'},
    exports:{'.':'./src/experience/index.js','./experience':'./src/experience/index.js',
      './episodes':'./src/experience/episodes.js','./attention':'./src/experience/attention.js','./inference':'./src/experience/inference.js',
      './adaptive':'./src/adaptive/index.js','./developing':'./src/developing/index.js','./habits':'./src/adaptation/habits.js',
      './constraints':'./src/constraints/functional.js','./institution':'./src/institution/access.js',
      './cognition':'./src/cognition/index.js','./sustained':'./src/development/index.js','./learning':'./src/development/learning.js',
      './situated':'./src/person/index.js','./commitments':'./src/person/commitments.js','./human':'./src/human/v0.1.1.js'},
    componentVersions:{experiencedPerson:'0.1.0',episodes:'0.1.0',attention:'0.1.0',inference:'0.1.0',adaptivePerson:'0.1.0',
      habits:'0.1.0',functionalContext:'0.1.0',institution:'0.1.0',developingPerson:'0.1.0',appraisal:'0.1.0',relationships:'0.1.0',
      duties:'0.1.0',adultCourse:'0.1.0',cognition:'0.1.0',sustained:'0.1.0',situated:'0.1.0',human:'0.1.1'},
    files:EXPERIENCED_SOURCES};
  return packagePrivatePerson({sources:EXPERIENCED_SOURCES,metadata,defaultDirectory:'experienced',outputDirectory});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  if(process.argv.length>3)throw new Error('Usage: node scripts/package-experienced-person.js [output-directory]');
  process.stdout.write(JSON.stringify(await packageExperiencedPerson(process.argv[2]?{outputDirectory:process.argv[2]}:{}),null,2)+'\n');
}
