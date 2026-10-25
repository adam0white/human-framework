/**
 * SCOPE: compare opt-in plain replies with legacy replies on the same deterministic
 * decision and show that rendering leaves the actor unchanged. This is a language
 * control, not a claim about reading grade or human psychology.
 */
import {
  createPerson,
  decide,
  intentionFor,
  narrateDecision,
  snapshot,
  villagerSpec,
  voiceLine,
} from '../src/index.ts';

export function main() {
  const p = createPerson(villagerSpec('ali', 'Ali', 7, { now: 720 }));
  const record = decide(p, [
    { id: 'work', action: 'work', label: 'work', duration: 10, effort: 0, material: 1, advertises: {} },
  ]);
  const before = JSON.stringify(snapshot(p));
  const reply = { voiceId: 'chef', verdict: 'complied' as const, reason: 'insist', says: '' };
  const arms = [false, true].map((plainEnglish) => ({
    plainEnglish,
    reply: voiceLine(p, reply, 'b', { plainEnglish }),
    intention: intentionFor(p, record, { plainEnglish }),
    narration: narrateDecision(p, record, { plainEnglish }),
  }));
  if (JSON.stringify(snapshot(p)) !== before) throw new Error('Rendering changed the actor');
  return { arms, unchanged: true };
}
if (import.meta.main) console.log(JSON.stringify(main(), null, 2));
