/** Dated blocker control, not a Voice port. Run against exact published HF 4.9/client 0.5.8 artifacts. */
import {
  createPerson,
  createRun,
  exportRun,
  inspect,
  preview,
  replay,
  restoreRun,
  step,
} from '@adam0white/human-framework';
import {
  canonicalCast,
  createPersona,
  portablePersonRole,
  portableWriteBlockers,
  projectPortablePerson,
} from '@adam0white/lab-client';
import { describe, expect, test } from 'vitest';
import { DAY, MINUTE, START, voiceContractPerson, voiceContractSpec } from './hf49-contract-fixture.mjs';

function need(result) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}
const host = { kind: 'host' };
const source = { type: 'host', id: 'voice' };
const query = (select) => ({ perspective: host, people: ['halil'], select });
function opening() {
  const run = need(createRun(voiceContractSpec()));
  const person = voiceContractPerson('halil', 'Halil', 'male');
  person.state.affect.emotions = [
    { id: 'grief', intensity: 0.7, cause: 'recall:nuran', since: START, halfLifeMs: 4 * DAY },
    { id: 'gratitude', intensity: 0.5, cause: 'received:care', since: START, halfLifeMs: DAY },
  ];
  need(createPerson(run, person));
  return run;
}
function offers(actionId) {
  return [
    {
      id: actionId,
      actionId,
      label: actionId,
      person: 'halil',
      durationMs: 15 * MINUTE,
      participants: [],
      alongside: [],
      demands: { effort: actionId === 'work' ? 0.4 : 0, focus: 0, mode: 'awake', requires: {} },
      tags: actionId === 'rest' ? ['rest'] : [],
      norms: [],
      expected: { needs: {}, followedBy: [], provenance: ['authored:voice-contract'] },
      fulfills: [],
      advances: [],
      diminishes: [],
    },
  ];
}
function start(run, actionId) {
  const result = need(
    step(run, {
      until: START,
      inputs: [
        {
          id: 'offers',
          at: START,
          source,
          kind: 'offers.received',
          payload: { person: 'halil', revision: 1, offers: offers(actionId) },
        },
        {
          id: 'decision',
          at: START,
          source,
          kind: 'decision.requested',
          payload: { person: 'halil', reason: 'protocol control', treatment: 'ordinary', offerRevision: 1 },
        },
      ],
    }),
  );
  if (result.boundary.type !== 'world-required') throw new Error('Expected action boundary');
  const request = result.boundary.requests[0];
  if (request?.kind !== 'action' || request.stage !== 'start') throw new Error('Expected pending start');
  const input = {
    id: 'accepted-start',
    at: request.boundaryAt,
    source,
    kind: 'action.resolved',
    payload: {
      requestId: request.id,
      requestHash: request.requestHash,
      person: request.person,
      activityId: request.activityId,
      stage: request.stage,
      worldRevision: request.worldRevision,
      disposition: 'accepted',
      observations: [],
    },
  };
  return { result, input };
}
const portableQuery = {
  ...query(['persona']),
  portable: { person: 'halil', castId: 'hf.cast.halil.voice', castRevision: '1' },
};

describe('HF 4.9 Voice/Watch/Well public contract blockers, 2026-10-29', () => {
  test('normal work and rest control preserve pending/active boundaries, preview and exact replay', () => {
    const hashes = [];
    for (const actionId of ['work', 'rest']) {
      const run = opening();
      const { input } = start(run, actionId);
      const pending = exportRun(run);
      expect(pending.engine.package).toBe('@adam0white/human-framework@4.9.0');
      const restoredPending = need(restoreRun(JSON.parse(JSON.stringify(pending))));
      expect(exportRun(restoredPending)).toEqual(pending);
      for (const target of [run, restoredPending])
        need(step(target, { until: START + MINUTE, inputs: [input] }));
      const active = exportRun(run);
      expect(exportRun(restoredPending)).toEqual(active);
      const restoredActive = need(restoreRun(JSON.parse(JSON.stringify(active))));
      expect(exportRun(restoredActive)).toEqual(active);
      const summary = need(inspect(run, query(['summary']))).people[0];
      expect(summary?.kind).toBe('host');
      expect(summary?.parts[0]?.value).toMatchObject({ activity: { actionId } });
      need(preview(run, { perspective: host, person: 'halil', until: START + 2 * MINUTE, inputs: [] }));
      expect(exportRun(run)).toEqual(active);
      const verified = need(replay(active));
      expect(verified.verified).toBe(true);
      expect(verified.fullHash).toBe(active.hashes.full);
      hashes.push(active.hashes.full);
    }
    expect(hashes[0]).not.toBe(hashes[1]);
  });

  test('G4: live named feelings and learned expectations lack public readings', () => {
    const run = opening();
    const before = exportRun(run);
    const idle = need(inspect(run, portableQuery)).people[0];
    expect(idle?.kind).toBe('host');
    const persona = idle?.parts.find((part) => part.select === 'persona');
    expect(persona?.value).toMatchObject({
      version: 2,
      retained: { memory: { expectations: [{ key: 'work', valence: -0.9 }] } },
    });
    expect(exportRun(run)).toEqual(before);
    const { input } = start(run, 'work');
    for (const phase of ['pending', 'active']) {
      if (phase === 'active') need(step(run, { until: START + MINUTE, inputs: [input] }));
      const checkpoint = exportRun(run);
      for (const name of ['affect', 'memory', 'expectations']) {
        // Deliberate invalid public request proves rejection; no private read or mutation.
        expect(inspect(run, query([name]))).toMatchObject({ ok: false, error: { code: 'invalid-schema' } });
      }
      const readings = need(inspect(run, query(['condition', 'summary'])));
      expect(JSON.stringify(readings)).not.toContain('recall:nuran');
      expect(JSON.stringify(readings)).not.toContain('received:care');
      expect(JSON.stringify(readings)).not.toContain('expectations');
      const condition = readings.people[0]?.parts.find((part) => part.select === 'condition');
      // Targeted current fear is supported; it does not report learned adverse expectations.
      expect(condition?.value).toMatchObject({ selfReport: { fear: 0, fearOf: {} } });
      if (phase === 'active')
        expect(inspect(run, portableQuery)).toMatchObject({
          ok: false,
          error: { code: 'invalid-admission' },
        });
      expect(exportRun(run)).toEqual(checkpoint);
    }
  });

  test('G2: released SDK has no Voice source/receiving role and blocks uncertified peer writes', async () => {
    for (const role of ['halil', 'selin', 'riza', 'hacer', 'osman']) {
      const castId = `hf.cast.${role}.voice`;
      expect(() =>
        projectPortablePerson({ castId, game: 'voice', engine: '4.9.0', person: { id: role }, history: [] }),
      ).toThrow('This person has no authored chapter in this game.');
    }
    const castId = 'hf.cast.selin.voice';
    const spec = voiceContractSpec();
    spec.host = { ...spec.host, id: 'days' };
    spec.definitions.sources = [
      { type: 'host', id: 'days' },
      { type: 'voice', id: 'player' },
    ];
    const run = need(createRun(spec));
    const person = voiceContractPerson(castId, 'Selin');
    need(createPerson(run, person));
    const projected = need(
      inspect(run, {
        perspective: host,
        people: [castId],
        select: ['persona'],
        portable: { person: castId, castId, castRevision: canonicalCast(castId).revision },
      }),
    ).people[0];
    if (projected?.kind !== 'host') throw new Error('Expected host portable projection');
    const portable = projected.parts.find((part) => part.select === 'persona');
    if (portable?.select !== 'persona') throw new Error('Missing public passport');
    const envelope = await createPersona({
      format: 'hf-persona/1',
      castId,
      castRevision: canonicalCast(castId).revision,
      branchId: 'voice-gap-control',
      parentRevision: null,
      source: { game: 'days', build: 'control', engine: '4.9.0', rules: 'control' },
      transfer: { castPassport: 'hf-portable-person/2', portable: portable.value },
      limitations: [],
    });
    expect(() => portablePersonRole(envelope, 'voice')).toThrow(
      'This person has no matching authored role here.',
    );
    expect(portableWriteBlockers(castId, 'voice')).toContain('days');
    expect(portableWriteBlockers('hf.cast.yusuf.well', 'lefthand')).toContain('well');
  });
});
