/**
 * SCOPE: compare legacy replies with opt-in person-specific language and loyal warnings.
 * Pure rendering never advances RNG; host delivery remains explicit.
 * Run with `node packages/human/examples/narration-control.ts`.
 */
import {
  confirm,
  converse,
  createPerson,
  decide,
  predict,
  relationshipWith,
  snapshot,
  villagerSpec,
} from '../src/index.ts';
import type { Affordance } from '../src/types.ts';

const task: Affordance = {
  id: 'task',
  action: 'task',
  label: 'help out',
  duration: 10,
  effort: 0,
  advertises: { leisure: 0.3 },
  material: 0.5,
};
const ask = { voiceId: 'friend', action: 'task', strength: 1 };
export function main() {
  const arms = [false, true].map((variety) => {
    const predictions: string[] = [];
    const decisions: string[] = [];
    for (let i = 0; i < 8; i++) {
      const p = createPerson(villagerSpec(`person${i}`, 'Person', 1, { now: 720 }));
      if (variety) p.lexicon = { variety, materialMeaning: 'household keep' };
      const before = JSON.stringify(snapshot(p));
      predictions.push(predict(p, [task], ask).says);
      if (JSON.stringify(snapshot(p)) !== before) throw new Error('Prediction mutated the person');
      decisions.push(decide(p, [task], { suggestion: ask }).suggestion?.says ?? '');
    }
    return { arm: variety ? 'varied' : 'legacy', predictions, decisions };
  });
  const speaker = createPerson(villagerSpec('speaker', 'Speaker', 1, { now: 720 }));
  const subject = createPerson(villagerSpec('subject', 'Subject', 2, { now: 720 }));
  confirm(speaker, 'subject:unreliable', true, 720);
  // relationshipWith returns a default for absent ties; explicitly install this authored bond.
  speaker.social.relationships.push({ ...relationshipWith(speaker, subject.id), affection: 0.8 });
  return {
    arms,
    warningOff: converse(speaker, subject, { at: 720 }).claims.length,
    warningOn: converse(speaker, subject, { at: 720, loyalWarning: true }).claims.length,
  };
}
if (import.meta.main) console.log(JSON.stringify(main(), null, 2));
