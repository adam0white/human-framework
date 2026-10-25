/**
 * Controlled conditional-method transmission assay, not village emergence.
 * The host supplies true observed examples and dry/damp outcomes. Published HF
 * chooses every action and retains evidence. No actor-loop or source changes.
 * Usage: node balanced-probe.mjs <published dist/index.js> <output.json>
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { statfsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [entry, output] = process.argv.slice(2);
assert(entry && output, 'Supply published entry and scratch output path');
const hf = await import(pathToFileURL(resolve(entry)).href);
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cues = [{ cue: 'joint', value: 'split' }];
const arms = ['imitation', 'discovery', 'frozen', 'peer-frozen'];
const withoutMethods = (p) => {
  const copy = hf.snapshot(p);
  delete copy.methods;
  return copy;
};

function runCell(seed, patchId, reversed, resume = false) {
  const replacementId = patchId === 'a' ? 'z' : 'a';
  const meaning = (action) => (action === patchId ? 'patch' : 'replace');
  const ordered = reversed ? ['z', 'a'] : ['a', 'z'];
  const offers = ordered.map((id) => ({
    id,
    action: id,
    label: meaning(id),
    duration: 5,
    effort: 0.1,
    skill: { id: 'repair', difficulty: 0.6 },
    methodContext: 'repair',
    advertises: {},
  }));
  const person = (id, index) => {
    const p = hf.createPerson({
      id,
      name: id,
      seed: seed * 100 + index,
      now: 720,
      bornAt: 720 - 30 * hf.MINUTES_PER_YEAR,
      sex: 'female',
      skills: { repair: 0.9 },
    });
    assert(hf.receiveMethodCues(p, { contextId: 'repair', cues }));
    return p;
  };
  const ledger = [];
  const teach = (p, sourceId, action, success, eventId) => {
    const example = {
      id: `repair-${action}`,
      demonstrationId: eventId,
      contextId: 'repair',
      conditions: cues,
      action,
      sourceId,
      outcome: success ? 'success' : 'failure',
      attention: 1,
    };
    assert(hf.demonstrateMethod(p, example));
    ledger.push({ learner: p.id, ...example });
  };
  const demo = person('demonstrator', 0);
  for (let n = 0; n < 2; n++) teach(demo, demo.id, patchId, true, `authored-${n}`);
  const sourceEvents = [];
  for (let n = 0; n < 2; n++) {
    const decision = hf.decide(demo, offers);
    sourceEvents.push({ source: demo.id, action: decision.chosenAction, success: true, decision });
    teach(demo, demo.id, decision.chosenAction, true, `demo-own-${n}`);
  }
  const relay = person('relay', 1);
  for (const [n, event] of sourceEvents.entries())
    teach(relay, event.source, event.action, event.success, `demo-observed-${n}`);
  const relayEvents = [];
  for (let n = 0; n < 2; n++) {
    const decision = hf.decide(relay, offers);
    relayEvents.push({ source: relay.id, action: decision.chosenAction, success: true, decision });
    teach(relay, relay.id, decision.chosenAction, true, `relay-own-${n}`);
  }
  const initial = Array.from({ length: 10 }, (_, i) => person(`learner-${i}`, i + 2));
  assert(initial.every((p) => p.methods.rules.length === 0));
  const results = {};
  for (const arm of arms) {
    const people = initial.map((p) => hf.restore(hf.snapshot(p)));
    const armLedgerStart = ledger.length;
    if (arm === 'imitation' || arm === 'peer-frozen')
      for (const p of people)
        for (const [n, event] of relayEvents.entries())
          teach(p, event.source, event.action, event.success, `${arm}-relay-${n}`);
    const records = [];
    let noPeerContinuation = true;
    let readersPure = true;
    for (let trial = 0; trial < 10; trial++) {
      if (resume && trial === 5)
        for (let i = 0; i < people.length; i++) people[i] = hf.restore(hf.snapshot(people[i]));
      const decisions = people.map((p) => {
        const before = hf.snapshot(p);
        for (const action of ['a', 'z']) hf.methodEvidence(p, action, 'repair');
        readersPure &&= hash(before) === hash(hf.snapshot(p));
        const decision = hf.decide(p, offers);
        if (trial === 0 && (arm === 'discovery' || arm === 'frozen')) {
          const untouched = hf.restore(before);
          const otherDecision = hf.decide(untouched, offers);
          noPeerContinuation &&=
            hash(otherDecision) === hash(decision) && hash(hf.snapshot(untouched)) === hash(hf.snapshot(p));
        }
        const action = decision.chosenAction;
        assert(action === 'a' || action === 'z');
        const record = {
          learner: p.id,
          trial,
          action,
          method: meaning(action),
          success: action === replacementId,
          decision,
          ...(trial === 0 ? { before, outsideMethods: withoutMethods(before) } : {}),
        };
        records.push(record);
        return record;
      });
      // Every learner chooses before anyone receives this trial's own outcome.
      if (arm === 'imitation' || arm === 'discovery')
        for (const [i, record] of decisions.entries())
          teach(people[i], people[i].id, record.action, record.success, `${arm}-own-${trial}`);
    }
    results[arm] = {
      records,
      evidence: ledger.slice(armLedgerStart),
      finalStateHash: hash(people.map(hf.snapshot)),
      finalRngHash: hash(people.map((p) => p.rng)),
      finalMethods: people.map((p) => ({ id: p.id, methods: p.methods })),
      noPeerContinuation,
      readersPure,
    };
  }
  const first = (arm) => results[arm].records.filter((r) => r.trial === 0);
  const pairs = first('imitation').map((exposed, i) => {
    const untreated = first('discovery')[i];
    const chosen = exposed.decision.considered.find(
      (c) => c.affordanceId === exposed.decision.chosenAffordanceId,
    );
    const onlyRelay = exposed.before.methods.rules.every((r) =>
      r.evidence.every((e) => e.sourceId === 'relay'),
    );
    return {
      learner: exposed.learner,
      switched: untreated.method === 'replace' && exposed.method === 'patch',
      relayTerm: chosen.terms.some((t) => t.source.endsWith(':relay') && t.value > 0),
      noOwnEvidence: onlyRelay && untreated.before.methods.rules.length === 0,
      rngEqual: hash(exposed.before.rng) === hash(untreated.before.rng),
      outsideMethodsEqual: hash(exposed.outsideMethods) === hash(untreated.outsideMethods),
    };
  });
  const share = (arm, from) => {
    const rows = results[arm].records.filter((r) => r.trial >= from);
    return rows.filter((r) => r.method === 'patch').length / rows.length;
  };
  const sourcePath = [...sourceEvents, ...relayEvents].every((e) => e.action === patchId);
  const noDirectTeaching = Object.values(results).every((r) =>
    r.finalMethods.every((p) =>
      p.methods.rules.every((rule) => rule.evidence.every((e) => e.sourceId !== 'demonstrator')),
    ),
  );
  return {
    seed,
    patchId,
    reversed,
    offers,
    sourceEvents,
    relayEvents,
    sourceEvidence: ledger.slice(0, 8),
    initialLearnerStateHash: hash(initial),
    pairs,
    sourcePath,
    noDirectTeaching,
    metrics: Object.fromEntries(
      arms.map((arm) => [
        arm,
        {
          firstPatch: first(arm).filter((r) => r.method === 'patch').length / 10,
          latePatch: share(arm, 7),
        },
      ]),
    ),
    results,
  };
}

const start = performance.now();
const assay = (resume) => {
  const cells = [];
  for (const seed of [7, 19, 43])
    for (const patchId of ['a', 'z'])
      for (const reversed of [false, true]) {
        const disk = statfsSync(resolve(output, '..'));
        assert(disk.bavail * disk.bsize >= 5e9, 'Disk below 5 GB');
        assert(performance.now() - start < 10000, 'Registered runtime budget exhausted');
        cells.push(runCell(seed, patchId, reversed, resume));
      }
  return cells;
};
const cells = assay(false);
const replay = assay(false);
const resumed = assay(true);
const criteria = [7, 19, 43].map((seed) => {
  const group = cells.filter((c) => c.seed === seed);
  const mean = (arm, field) => group.reduce((sum, c) => sum + c.metrics[arm][field], 0) / 4;
  const pairs = group.flatMap((c) => c.pairs);
  const switches = pairs.filter((p) => p.switched);
  return {
    seed,
    untreatedFirst: mean('discovery', 'firstPatch'),
    imitationFirst: mean('imitation', 'firstPatch'),
    switchShare: switches.length / pairs.length,
    firstContrast:
      mean('discovery', 'firstPatch') === 0.5 &&
      mean('imitation', 'firstPatch') - mean('discovery', 'firstPatch') >= 0.4 &&
      switches.length / pairs.length >= 0.4 &&
      switches.every((p) => p.relayTerm && p.noOwnEvidence && p.rngEqual && p.outsideMethodsEqual),
    sourcePath: group.every((c) => c.sourcePath && c.noDirectTeaching),
    late: Object.fromEntries(arms.map((arm) => [arm, mean(arm, 'latePatch')])),
    adaptation:
      mean('imitation', 'latePatch') <= 0.1 &&
      mean('discovery', 'latePatch') <= 0.1 &&
      mean('peer-frozen', 'latePatch') >= 0.9 &&
      mean('peer-frozen', 'latePatch') - mean('imitation', 'latePatch') >= 0.8 &&
      mean('frozen', 'latePatch') === 0.5,
  };
});
const controls = {
  replayEqual: hash(cells) === hash(replay),
  restoreEqual: hash(cells) === hash(resumed),
  readersPure: cells.every((c) => arms.every((arm) => c.results[arm].readersPure)),
  noPeerContinuation: cells.every((c) => arms.every((arm) => c.results[arm].noPeerContinuation)),
};
const elapsedMs = performance.now() - start;
const go =
  elapsedMs < 10000 &&
  criteria.every((c) => c.firstContrast && c.sourcePath && c.adaptation) &&
  Object.values(controls).every(Boolean);
const result = { go, elapsedMs, criteria, controls, digest: hash(cells), cells };
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ ...result, cells: undefined }, null, 2));
