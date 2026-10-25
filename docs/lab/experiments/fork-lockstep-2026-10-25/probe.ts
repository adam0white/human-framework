import { createHash } from 'node:crypto';
import { appendFileSync, writeFileSync } from 'node:fs';
import * as hf from '../../../../packages/human/src/index.ts';

const root = '/Users/abdul/code/.lab-scratch/h3/fork-lockstep/';
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function make(n: number, seed: number, fork = false) {
  const ids = Array.from({ length: n }, (_, i) => `p${String(i).padStart(2, '0')}`);
  const p = ids.map((id, i) =>
    hf.createPerson(
      hf.villagerSpec(id, id, 100 + i + (fork ? 1000 * seed : 0), {
        devout: i % 2 === 0,
        others: ids,
        now: 420,
      }),
    ),
  );
  return { c: hf.createCommunity(p), w: hf.createVillage(p, { seed, foodStock: n * 10 }) };
}
function save(h: ReturnType<typeof make>) {
  return { p: h.c.people.map(hf.snapshot), c: hf.communityState(h.c), w: structuredClone(h.w.state) };
}
function load(s: ReturnType<typeof save>) {
  const p = s.p.map(hf.restore);
  return { c: hf.createCommunity(p, s.c), w: hf.createVillage(p, { seed: 0, state: structuredClone(s.w) }) };
}
function digest(h: ReturnType<typeof make>) {
  return hash(save(h));
}
function request(h: ReturnType<typeof make>, tick: number, person = 'p00', act = 'help:p01', strength = 0.6) {
  h.c.queued ??= {};
  h.c.queued[person] = [{ voiceId: 'player', affordanceId: act, strength, since: tick }];
}
function records(h: ReturnType<typeof make>, events: ReturnType<typeof hf.stepCommunity>) {
  return events
    .filter((e) => e.kind === 'decide')
    .map((e) => {
      const record = h.c.people.find((p) => p.id === e.personId)?.trace.find((d) => d.id === e.decisionId);
      if (!record) throw new Error('Decision record missing from trace');
      return { person: e.personId, record };
    });
}
if (process.argv[2] === 'fork') {
  const results = [];
  for (let seed = 1; seed <= 20; seed++) {
    const a = make(6, seed, true);
    hf.stepCommunity(a.c, a.w, 450);
    const s = save(a);
    const b = load(s),
      control = load(s);
    let exact = true,
      firstState: null | number = null,
      firstChoice: {
        tick: number;
        key: string;
        sameTerms: boolean;
        sameRng: boolean;
        reversed: boolean;
        attributed: boolean;
        actualRecords: ReturnType<typeof records>;
      } | null = null,
      firstTiming: { tick: number; key: string } | null = null;
    request(a, 450);
    request(b, 450, 'p00', 'chat:p01');
    request(control, 450);
    for (let t = 451; t <= 1860; t++) {
      const rngA = structuredClone(a.c.people.map((p) => p.rng)),
        rngB = structuredClone(b.c.people.map((p) => p.rng));
      const ra = records(a, hf.stepCommunity(a.c, a.w, t)),
        rb = records(b, hf.stepCommunity(b.c, b.w, t));
      hf.stepCommunity(control.c, control.w, t);
      if (digest(a) !== digest(control)) exact = false;
      if (firstState === null && digest(a) !== digest(b)) firstState = t;
      const keys = new Set([...ra, ...rb].map((x) => `${x.person}:${x.record.at}`));
      for (const key of keys) {
        const x = ra.find((x) => `${x.person}:${x.record.at}` === key),
          y = rb.find((x) => `${x.person}:${x.record.at}` === key);
        if (!x || !y) {
          firstTiming ??= { tick: t, key };
          continue;
        }
        if (!firstChoice && x.record.chosenAffordanceId !== y.record.chosenAffordanceId) {
          const ac = x.record.chosenAffordanceId,
            bc = y.record.chosenAffordanceId;
          const xa = x.record.considered.find((o) => o.affordanceId === ac),
            xb = x.record.considered.find((o) => o.affordanceId === bc),
            ya = y.record.considered.find((o) => o.affordanceId === ac),
            yb = y.record.considered.find((o) => o.affordanceId === bc);
          const nons = (r: hf.DecisionRecord) =>
            r.considered
              .map((o) => ({
                id: o.affordanceId,
                terms: o.terms.filter((z) => !z.source.startsWith('suggestion:')),
              }))
              .sort((a, b) => a.id.localeCompare(b.id));
          const sameTerms = JSON.stringify(nons(x.record)) === JSON.stringify(nons(y.record));
          const sameRng =
            JSON.stringify(rngA[a.c.people.findIndex((p) => p.id === x.person)]) ===
            JSON.stringify(rngB[b.c.people.findIndex((p) => p.id === x.person)]);
          const reversed = !!(xa && xb && ya && yb && xa.utility > xb.utility && yb.utility > ya.utility);
          firstChoice = {
            tick: t,
            key,
            sameTerms,
            sameRng,
            reversed,
            attributed: sameTerms && sameRng && reversed,
            actualRecords: [x, y],
          };
        }
      }
    }
    const r = { seed, exact, forcedInputDifferenceAt: 450, firstState, firstTiming, firstChoice };
    results.push(r);
    appendFileSync(`${root}fork-raw.jsonl`, `${JSON.stringify(r)}\n`);
    console.log(seed, exact, firstChoice?.tick, firstChoice?.attributed, firstTiming?.tick);
  }
  writeFileSync(`${root}fork-results.json`, JSON.stringify(results, null, 2));
} else {
  let a = make(20, 7),
    b = make(20, 7),
    u = make(20, 7),
    n = make(20, 7),
    n2 = make(20, 7);
  let reversed = 0,
    waited = 0,
    restoreExact = true;
  const mismatches = [];
  for (let tick = 1; tick <= 1440; tick++) {
    const t = 420 + tick;
    const inputs =
      tick % 120 === 0
        ? [
            {
              tick,
              sender: 'a',
              sequence: 0,
              person: 'p00',
              act: tick % 240 === 0 ? 'help:p01' : 'chat:p01',
            },
            {
              tick,
              sender: 'b',
              sequence: 0,
              person: 'p02',
              act: tick % 240 === 0 ? 'chat:p00' : 'help:p00',
            },
          ]
        : [];
    const pending = inputs.map((x, i) => ({ x, slot: 7 - i * 3 })).sort((a, b) => a.slot - b.slot);
    const delivered = [];
    for (let slot = 0; slot <= 7; slot++)
      for (const item of pending)
        if (item.slot === slot) {
          delivered.push(item.x);
          if (slot > 0) waited++;
        }
    if (inputs.length && delivered[0]?.sender !== inputs[0]?.sender) reversed++;
    const canonical = (xs: typeof inputs) =>
      [...xs].sort(
        (a, b) =>
          a.tick - b.tick ||
          (a.sender < b.sender ? -1 : a.sender > b.sender ? 1 : 0) ||
          a.sequence - b.sequence,
      );
    for (const [h, xs] of [
      [a, inputs],
      [b, delivered],
      [u, inputs],
    ] as const)
      for (const x of canonical(xs)) request(h, t, x.person, x.act, 0.4);
    for (const h of [a, b, u, n, n2]) hf.stepCommunity(h.c, h.w, t);
    const hashes = [a, b, u, n, n2].map(digest);
    if (hashes[0] !== hashes[1] || hashes[0] !== hashes[2] || hashes[3] !== hashes[4])
      mismatches.push({ tick, hashes });
    appendFileSync(`${root}lockstep-hashes.jsonl`, `${JSON.stringify({ tick, hashes })}\n`);
    if (tick === 720) {
      const sa = save(a),
        sb = save(b);
      a = load(JSON.parse(JSON.stringify(sa)));
      b = load(JSON.parse(JSON.stringify(sb)));
      restoreExact = hash(sa) === hash(save(a)) && hash(sb) === hash(save(b));
    }
  }
  const result = { ticks: 1440, reversed, waited, restoreExact, mismatches, final: digest(a) };
  writeFileSync(`${root}lockstep-results.json`, JSON.stringify(result, null, 2));
  console.log(result);
}
