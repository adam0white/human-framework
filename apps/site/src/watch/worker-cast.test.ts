import { expect, it } from 'vitest';
import { actorEvidence, actorInput, actorRuntime } from './sim/actor.ts';
import { flushActors } from './sim/actor-world.ts';
import { newGame } from './sim/night.ts';
import { watchTerminalReceipts } from './sim/people.ts';

it('reports terminal ownership only after an actual admitted death in the shared run', () => {
  const s = newGame(7),
    heads = { 'hf.cast.tamar.watch': {} };
  expect(watchTerminalReceipts(s, heads)).toEqual([]);
  const e = actorEvidence(s, 'tamar', 'actual-death');
  actorInput(s, 'lifecycle.received', {
    type: 'death',
    person: { kind: 'actor', id: 'tamar' },
    basis: {
      evidence: { kind: 'evidence', id: e.evidenceId },
      worldRevision: actorRuntime(s).worldRevision(),
    },
  });
  expect(watchTerminalReceipts(s, heads)).toEqual([]);
  flushActors(s, s.minute);
  expect(watchTerminalReceipts(s, heads)).toEqual([{ castId: 'hf.cast.tamar.watch', at: s.minute }]);
  actorRuntime(s).verify();
});
