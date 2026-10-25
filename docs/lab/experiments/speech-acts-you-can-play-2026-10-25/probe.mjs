import { pathToFileURL } from 'node:url';

const hf = await import(pathToFileURL(process.argv[2]).href);

import { writeFileSync } from 'node:fs';

const prop = 'shift:early:unavailable';
function run(seed, arm) {
  const people = [0, 1, 2].map((i) =>
    hf.createPerson({
      id: `actor-${i}`,
      name: `Actor ${i}`,
      seed: seed * 10 + i,
      now: 0,
      bornAt: -30 * 365 * 1440,
      sex: 'female',
    }),
  );
  hf.seedBelief(people[2], prop, { value: true, credence: 0.99 });
  const votes = new Map();
  const trace = [];
  let disclosure = 0;
  let leaks = 0;
  for (let round = 0; round < 6; round++)
    for (let i = 0; i < 3; i++) {
      const p = people[i];
      const knows = hf.credence(p, prop) > 0.7;
      if (round === 0 && i < 2 && knows) leaks++;
      const preferred = (seed + i) % 2 === 0 ? 'early' : 'late';
      const acts = ['early', 'late', 'refuse', ...(i === 2 ? ['disclose'] : [])].filter(
        (a) => !(a === 'early' && knows),
      );
      const offers = acts.map((a) => ({
        id: a,
        action: `speech-${a}`,
        label: arm === 'grammar' ? `${a === 'early' || a === 'late' ? 'offer' : 'act'} ${a}` : `Choice: ${a}`,
        duration: 1,
        effort: 0,
        advertises:
          a === 'disclose'
            ? { meaning: 0.2 }
            : a === 'refuse'
              ? {}
              : { competence: a === preferred ? 0.2 : 0.1, belonging: 0.1 },
      }));
      const d = hf.decide(p, offers);
      const aff = offers.find((a) => a.id === d.chosenAffordanceId);
      trace.push({ round, actor: i, knows, chosen: d.chosenAffordanceId, options: d.options });
      if (!aff) continue;
      hf.begin(p, aff, d);
      hf.finish(p, {
        affordanceId: aff.id,
        action: aff.action,
        status: 'completed',
        at: p.now + 1,
        needs: aff.advertises,
      });
      if (aff.id === 'early' || aff.id === 'late') votes.set(i, aff.id);
      if (aff.id === 'refuse') votes.delete(i);
      if (aff.id === 'disclose')
        for (const listener of people.filter((q) => q !== p)) {
          const speech = hf.converse(p, listener, { at: listener.now, topics: [prop], maxClaims: 1 });
          disclosure += speech.told.length;
          hf.perceive(listener, speech.told);
        }
    }
  const unanimous = votes.size === 3 && new Set(votes.values()).size === 1;
  return {
    seed,
    arm,
    agreement: unanimous && votes.get(0) === 'late',
    infeasible: unanimous && votes.get(0) === 'early',
    leaks,
    disclosure,
    votes: [...votes],
    trace,
  };
}
const runs = Array.from({ length: 20 }, (_, i) => ['grammar', 'fixed'].map((a) => run(i + 1, a))).flat();
// Exercise the released low-level promise API directly: it has no host idempotency key.
const spam = hf.createPerson({ id: 'spam', seed: 1, now: 0, bornAt: -30 * 365 * 1440, sex: 'female' });
const commitment = {
  kind: 'promise',
  label: 'work late',
  actions: ['work-late'],
  from: 60,
  until: 120,
  importance: 0.4,
  toId: 'other',
};
hf.promise(spam, commitment);
const before = spam.agenda.commitments.length;
for (let i = 0; i < 100; i++) hf.promise(spam, commitment);
const summary = {
  package: hf.FRAMEWORK_VERSION,
  seeds: [1, 20],
  arms: Object.fromEntries(
    ['grammar', 'fixed'].map((arm) => [
      arm,
      {
        agreements: runs.filter((r) => r.arm === arm && r.agreement).length,
        infeasible: runs.filter((r) => r.arm === arm && r.infeasible).length,
        leaks: runs.filter((r) => r.arm === arm).reduce((n, r) => n + r.leaks, 0),
        disclosures: runs.filter((r) => r.arm === arm).reduce((n, r) => n + r.disclosure, 0),
      },
    ]),
  ),
  spam: { before, after: spam.agenda.commitments.length },
  identicalChoices: runs
    .filter((r) => r.arm === 'grammar')
    .every(
      (r, i) =>
        JSON.stringify(r.trace.map((t) => t.chosen)) ===
        JSON.stringify(runs[i * 2 + 1].trace.map((t) => t.chosen)),
    ),
};
writeFileSync(process.argv[3], JSON.stringify({ summary, runs }, null, 2));
console.log(JSON.stringify(summary, null, 2));
