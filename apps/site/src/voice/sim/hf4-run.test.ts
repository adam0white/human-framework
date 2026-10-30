import type {
  ActionRequest,
  ActionResolution,
  DeepReadonly,
  Offer,
  PersonAuthoring,
  RunSpec,
} from '@adam0white/human-framework';
import { expect, test } from 'vitest';
import {
  OLD_VOICE_SAVE,
  VOICE_HF4_EDITION,
  type VoiceActiveWork,
  type VoiceHost,
  VoiceRun,
} from './hf4-run.ts';
import { MINUTE, START, voiceContractPerson, voiceContractSpec } from './hf49-contract-fixture.mjs';

function opening() {
  const spec = voiceContractSpec() as RunSpec;
  spec.host.edition = VOICE_HF4_EDITION;
  return new VoiceRun(spec, [voiceContractPerson('halil', 'Halil', 'male') as PersonAuthoring]);
}
function offers(): Offer[] {
  return [
    {
      id: 'work',
      actionId: 'work',
      label: 'repair a radio',
      person: 'halil',
      durationMs: 15 * MINUTE,
      participants: [],
      alongside: [],
      demands: { effort: 0.4, focus: 0, mode: 'awake', requires: {} },
      tags: [],
      norms: [],
      expected: { needs: {}, followedBy: [], provenance: ['authored:voice'] },
      fulfills: [],
      advances: [],
      diminishes: [],
    },
  ];
}
function action(request: DeepReadonly<ActionRequest>, work: VoiceActiveWork | undefined): ActionResolution {
  return {
    requestId: request.id,
    requestHash: request.requestHash,
    person: request.person,
    activityId: request.activityId,
    stage: request.stage,
    worldRevision: request.worldRevision,
    disposition:
      request.stage === 'start' ? 'accepted' : request.stage === 'finish' ? 'completed' : 'interrupted',
    observations: [],
    ...(request.stage === 'start'
      ? {}
      : {
          outcome: {
            activityId: request.activityId,
            offerId: request.offerId,
            actionId: 'work',
            start: work?.start ?? START,
            end: request.boundaryAt,
            status: request.stage === 'finish' ? ('completed' as const) : ('interrupted' as const),
            evidenceId: `town-outcome:${request.id}`,
            actual: { psychological: {}, exposures: [], observedProgress: [], material: 0 },
            summary: 'Repaired the radio.',
            fulfills: [],
            advances: [],
          },
        }),
  };
}
const host: VoiceHost = {
  stage() {
    return {
      action,
      communication() {
        throw new Error('Unexpected communication.');
      },
      commit() {},
    };
  },
};

test('Voice public host keeps unresolved and active saves, conditional preview, and exact continuation', () => {
  const live = opening();
  const first = live.receive(START, live.offerInputs('halil', offers(), START));
  expect(first.boundary.type).toBe('world-required');
  const pending = VoiceRun.restore(JSON.parse(JSON.stringify(live.save())));
  expect(pending.save()).toEqual(live.save());
  live.history('halil');
  const sourceBeforeFork = live.save();
  const fork = live.fork();
  expect(fork.save()).toEqual(sourceBeforeFork);
  fork.advance(START, host);
  expect(live.save()).toEqual(sourceBeforeFork);
  for (const run of [live, pending]) run.advance(START, host);
  expect(live.active.get('halil')?.offer.label).toBe('repair a radio');
  expect(pending.save()).toEqual(live.save());
  const before = live.save();
  const forecast = live.preview({
    perspective: { kind: 'host' },
    person: 'halil',
    until: START + 15 * MINUTE,
    inputs: [],
  });
  expect(forecast.boundary.type).toBe('world-required');
  expect(live.save()).toEqual(before);
  const active = VoiceRun.restore(JSON.parse(JSON.stringify(live.save())));
  for (const run of [live, pending, active, fork]) run.advance(START + 15 * MINUTE, host);
  expect(fork.save()).toEqual(live.save());
  expect(pending.save()).toEqual(live.save());
  expect(active.save()).toEqual(live.save());
  expect(
    live.events.some(
      (event) => event.data.kind === 'action-settled' && event.data.disposition === 'completed',
    ),
  ).toBe(true);
  live.verify();
  expect(() => VoiceRun.restore({ ...live.save(), edition: 'voice-4' } as never)).toThrow(OLD_VOICE_SAVE);
});

test('a rejected receipt does not publish staged town changes or alter the pending run', () => {
  const run = opening();
  run.receive(START, run.offerInputs('halil', offers(), START));
  const before = run.save();
  let committed = false;
  const invalid: VoiceHost = {
    stage: () => ({
      action: (request, work) => ({ ...action(request, work), requestHash: 'invalid' }),
      communication: () => {
        throw new Error('Unexpected communication.');
      },
      commit: () => {
        committed = true;
      },
    }),
  };
  expect(() => run.advance(START, invalid)).toThrow();
  expect(committed).toBe(false);
  expect(run.save()).toEqual(before);
});

test('settles a real finish before simultaneous received advice can reconsider the completed work', () => {
  const spec = voiceContractSpec() as RunSpec;
  spec.host.edition = VOICE_HF4_EDITION;
  const halil = voiceContractPerson('halil', 'Halil', 'male') as PersonAuthoring;
  const riza = voiceContractPerson('riza', 'Rıza', 'male') as PersonAuthoring;
  riza.state.beliefs = [{ prop: 'halil:should:wait', logOdds: 6, updatedAt: START, sources: [] }];
  const run = new VoiceRun(spec, [halil, riza]);
  const work = offers()[0];
  if (!work) throw new Error('Missing authored work offer');
  run.advance(START, host, run.offerInputs('halil', [work], START));
  const accepted = run.active.get('halil');
  expect(accepted?.offer.id).toBe('work');
  if (!accepted) throw new Error('The real work did not start');
  const end = accepted.end;
  const wait: Offer = {
    ...work,
    id: 'wait',
    actionId: 'wait',
    label: 'wait',
    expected: { ...work.expected, material: 1 },
  };
  const pending = run.receive(end, [
    run.input('offers.received', end, { person: 'halil', revision: 2, offers: [work, wait] }),
    run.input('conversation.requested', end, {
      speaker: 'riza',
      listener: 'halil',
      topicIds: ['halil'],
      maxClaims: 0,
      temptations: [],
      loyalWarning: false,
    }),
  ]);
  expect(pending.boundary.type).toBe('world-required');
  expect(run.pending.some((r) => r.kind === 'action' && r.stage === 'finish')).toBe(true);
  expect(
    run.pending.some((r) => r.kind === 'communication' && r.items.some((i) => i.data.kind === 'advice')),
  ).toBe(true);
  const cold = VoiceRun.restore(JSON.parse(JSON.stringify(run.save())));
  const boundaryHost: VoiceHost = {
    stage() {
      return {
        action(request, active) {
          if (request.stage !== 'start') expect(active?.request.activityId).toBe(request.activityId);
          return action(request, active);
        },
        communication(request) {
          return {
            requestId: request.id,
            requestHash: request.requestHash,
            worldRevision: request.worldRevision,
            speaker: request.speaker,
            emittedItemIds: request.items.map((i) => i.id),
            received: request.recipients.map((recipient) => ({
              recipient,
              evidenceId: `heard:${request.id}:${recipient}`,
              attention: 1,
              itemIds: request.items.map((i) => i.id),
            })),
          };
        },
        commit() {},
      };
    },
  };
  for (const current of [run, cold]) {
    current.advance(end, boundaryHost);
    expect(
      current.events.filter(
        (e) =>
          e.data.kind === 'action-settled' &&
          e.data.activityId === accepted.request.activityId &&
          e.data.disposition === 'completed',
      ),
    ).toHaveLength(1);
    expect(current.pending).toHaveLength(0);
    expect(current.events.some((e) => e.at === end && e.data.kind === 'suggestion-resolved')).toBe(true);
    current.advance(end + 1000, boundaryHost);
    current.verify();
  }
  expect(cold.save()).toEqual(run.save());
});
