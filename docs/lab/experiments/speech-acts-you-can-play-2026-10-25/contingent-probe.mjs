import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createShiftProtocol } from './contingent-protocol.mjs';

const hf = await import(pathToFileURL(process.argv[2]).href);
const secret = 'shift:actor-2-unavailable-early';
const slots = ['early', 'late'];
const shiftStart = { early: 660, late: 720 };
const snapshot = (value) => JSON.parse(JSON.stringify(value));
function person(seed, role) {
  const preferred = role === 2 ? 'late' : (seed + role) % 2 === 0 ? 'early' : 'late';
  const p = hf.createPerson({
    id: `actor-${role}`,
    name: `Actor ${role}`,
    seed: seed * 10 + role,
    now: 600,
    bornAt: 600 - 30 * 365 * 1440,
    sex: 'female',
    goals: slots
      .filter((slot) => role !== 2 || slot === 'late')
      .map((slot) => ({
        id: `work-${slot}`,
        label: `Work the ${slot} shift`,
        serves: ['achievement'],
        importance: slot === preferred ? 0.8 : 0.6,
        advancedBy: [{ action: `work-${slot}`, amount: 1 }],
        temporal: { halfLifeMinutes: 10000 },
      })),
  });
  if (role === 2) hf.seedBelief(p, secret, { value: true, credence: 0.99 });
  return { p, preferred };
}
function run(seed, arm) {
  const cast = [0, 1, 2].map((role) => person(seed, role));
  const people = cast.map((x) => x.p);
  const protocol = createShiftProtocol({ enabled: true, actors: people.map((p) => p.id) });
  const views = people.map(() => null);
  let disclosureChosen = false,
    leaks = 0,
    unattendedAccepts = 0;
  const trace = [];
  const delivery = [];
  for (let turn = 0; turn < 18; turn++) {
    if (protocol.snapshot().agreements.length) break;
    const role = turn % 3,
      p = people[role],
      known = views[role];
    for (const q of people) hf.tick(q, 600 + turn);
    if (!disclosureChosen) for (const q of people.slice(0, 2)) if (hf.credence(q, secret) > 0.7) leaks++;
    const feasible = slots.filter((slot) => slot !== 'early' || hf.credence(p, secret) <= 0.7);
    const messages = [{ kind: 'wait' }];
    if (!known) {
      const proposed =
        arm === 'grammar' ? feasible : [cast[role].preferred].filter((slot) => feasible.includes(slot));
      for (const slot of proposed) messages.push({ kind: 'propose', slot });
    } else {
      if (feasible.includes(known.slot) && !known.consents.includes(p.id))
        messages.push({ kind: 'accept', slot: known.slot, parent: known.id });
      messages.push({ kind: 'refuse', parent: known.id });
      if (arm === 'grammar')
        for (const slot of feasible.filter((slot) => slot !== known.slot))
          messages.push({ kind: 'counter', slot, parent: known.id });
    }
    const offers = messages.map((m) => ({
      id: `${m.kind}-${m.slot ?? 'none'}`,
      action: `${m.kind}-${m.slot ?? 'none'}`,
      label:
        role === 2 && known?.slot === 'early' && ['counter', 'refuse'].includes(m.kind)
          ? `${m.kind} ${m.slot ?? ''}; I am unavailable early`
          : m.kind === 'counter'
            ? `Counter with ${m.slot}`
            : m.kind === 'accept'
              ? `Accept ${m.slot} if everyone agrees`
              : m.kind === 'propose'
                ? `Offer ${m.slot} if everyone agrees`
                : m.kind,
      duration: 1,
      effort: 0,
      advertises: {},
    }));
    const claims = messages
      .filter((m) => ['propose', 'counter', 'accept'].includes(m.kind))
      .map((m) => ({
        id: `consequence-${m.kind}-${m.slot}`,
        revision: turn,
        trigger: { action: `${m.kind}-${m.slot}` },
        successor: { action: `work-${m.slot}`, duration: 60, effort: 0 },
        availableFrom: shiftStart[m.slot],
        availableUntil: shiftStart[m.slot] + 60,
        expiresAt: 900,
        chance: m.kind === 'accept' ? 0.9 : 0.5,
        confidence: 1,
      }));
    if (claims.length && !hf.seedConsequences(p, 'shift-protocol', claims))
      throw new Error('Known protocol consequences rejected');
    const decision = hf.decide(p, offers);
    const chosen = offers.findIndex((aff) => aff.id === decision.chosenAffordanceId);
    const row = {
      turn,
      role,
      view: snapshot(known),
      knowsConstraint: hf.credence(p, secret) > 0.7,
      offers: snapshot(messages),
      chosen: chosen < 0 ? null : snapshot(messages[chosen]),
      decision,
    };
    trace.push(row);
    if (chosen < 0) continue;
    const aff = offers[chosen],
      message = { ...messages[chosen], id: `turn-${turn}` };
    hf.begin(p, aff, decision);
    const finished = hf.finish(p, {
      affordanceId: aff.id,
      action: aff.action,
      status: 'completed',
      at: 601 + turn,
    });
    if (!finished) throw new Error('Chosen speech did not finish');
    for (const q of people) hf.tick(q, 601 + turn);
    const before = protocol.snapshot();
    const result = protocol.send(p.id, message);
    row.protocolStatus = result.status;
    if (message.kind === 'accept' && result.status === 'applied' && (!known || known.id !== before.live?.id))
      unattendedAccepts++;
    // Public statements carry the resulting proposal/signatures, never private preferences or intent.
    if (result.event)
      for (let listener = 0; listener < people.length; listener++) {
        const q = people[listener];
        const pc = {
          at: q.now,
          channel: 'heard',
          kind: 'shift-protocol',
          actorId: p.id,
          targetId: q.id,
          salience: 1,
          summary: `${p.name}: ${aff.label}`,
        };
        const attended = hf.perceive(q, [pc]).includes(pc);
        delivery.push({ turn, listener, kind: 'protocol', attended });
        if (listener === role || attended) {
          views[listener] = snapshot(result.event.live);
          if (result.event.live) protocol.noteAttended(q.id, result.event.live.id);
        }
      }
    if (
      role === 2 &&
      known?.slot === 'early' &&
      ['counter', 'refuse'].includes(message.kind) &&
      result.status === 'applied'
    ) {
      const firstDisclosure = !disclosureChosen;
      disclosureChosen = true;
      row.disclosure = true;
      for (let listener = 0; listener < 2; listener++) {
        const q = people[listener];
        const conversation = hf.converse(p, q, { at: q.now, topics: [secret], maxClaims: 1 });
        if (firstDisclosure && !conversation.told.some((pc) => pc.claims?.some((c) => c.prop === secret)))
          throw new Error('Initial constraint disclosure produced no testimony');
        for (const pc of conversation.told) {
          if (!pc.claims?.some((c) => c.prop === secret)) continue;
          const told = { ...pc, at: q.now, targetId: q.id, salience: 1 };
          const attended = hf.perceive(q, [told]).includes(told);
          delivery.push({ turn, listener, kind: 'constraint-testimony', attended });
        }
      }
    }
  }
  const state = protocol.snapshot();
  const settled = state.agreements[0];
  return {
    seed,
    arm,
    agreement: !!settled,
    feasible: !settled || settled.slot === 'late',
    leaks,
    unattendedAccepts,
    turns: trace.length,
    disclosureChosen,
    state,
    trace,
    delivery,
    goalProgress: people.map((p) => p.agenda.goals.map((g) => ({ id: g.id, progress: g.progress }))),
  };
}
const runs = Array.from({ length: 20 }, (_, i) => ['grammar', 'fixed'].map((arm) => run(i + 1, arm))).flat();
const summary = {
  package: hf.FRAMEWORK_VERSION,
  arms: Object.fromEntries(
    ['grammar', 'fixed'].map((arm) => {
      const rows = runs.filter((r) => r.arm === arm);
      return [
        arm,
        {
          agreements: rows.filter((r) => r.agreement).length,
          infeasible: rows.filter((r) => !r.feasible).length,
          leaks: rows.reduce((n, r) => n + r.leaks, 0),
          unattendedAccepts: rows.reduce((n, r) => n + r.unattendedAccepts, 0),
          counterActs: rows
            .flatMap((r) => r.trace)
            .filter((r) => r.chosen?.kind === 'counter' && r.protocolStatus === 'applied').length,
          disclosures: rows.filter((r) => r.disclosureChosen).length,
          constraintPercepts: rows.flatMap((r) => r.delivery).filter((d) => d.kind === 'constraint-testimony')
            .length,
          attendedConstraintPercepts: rows
            .flatMap((r) => r.delivery)
            .filter((d) => d.kind === 'constraint-testimony' && d.attended).length,
          turns: rows.map((r) => r.turns),
        },
      ];
    }),
  ),
};
writeFileSync(process.argv[3], JSON.stringify({ summary, runs }, null, 2));
console.log(JSON.stringify(summary, null, 2));
