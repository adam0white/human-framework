import { DEFAULT_NORMS, type Input, step } from '@adam0white/human-framework';
import { describe, expect, it } from 'vitest';
import { FOUNDER_KIN, WATCHERS } from './config.ts';
import { minuteMs, need, WATCH_OLD_SAVE, WatchActors, type WatchWorld } from './hf4.ts';
import {
  authoredKin,
  authoredWatcher,
  WATCH_START,
  watchOffer,
  watchPerson,
  watchPrayerInputs,
  watchSpec,
} from './hf4-authoring.ts';

/** A host control of a real authored Watch post offer and a matched rest offer.
 * This proves the boundary, not the mounted whole-game migration.
 */
function opening(action: 'hold-post' | 'rest') {
  const people = [watchPerson('keeper', 'Keeper', 'male', 40), ...WATCHERS.map(authoredWatcher)];
  const actors = WatchActors.create(watchSpec(7, null), people, { completed: 0, post: null });
  const offer = watchOffer('tamar', {
    id: action === 'hold-post' ? 'post:gate-1' : 'home:rest',
    action,
    label: action === 'hold-post' ? 'Stand at the Gate' : 'Rest at home',
    duration: 15,
    effort: action === 'hold-post' ? 0.3 : 0,
    placeId: action === 'hold-post' ? 'gate' : 'home',
    advertises: action === 'hold-post' ? { safety: 0.1 } : { rest: 0.25 },
  });
  const inputs: Input[] = [
    ...actors.offerInputs(WATCH_START, [{ person: 'tamar', offers: [offer] }]),
    {
      id: 'watch:opening-choice:tamar',
      at: WATCH_START,
      source: { type: 'host', id: 'watch' },
      kind: 'decision.requested',
      payload: { person: 'tamar', reason: 'The first watch', treatment: 'ordinary', offerRevision: 1 },
    },
  ];
  return { actors, inputs };
}
const world: WatchWorld = {
  action(host, request, offer, active) {
    const game = host.game as { completed: number; post: string | null };
    if (request.stage === 'start') {
      game.post = offer.place ?? null;
      return { disposition: 'accepted', observations: [] };
    }
    if (!active) throw new Error('Missing accepted start');
    const status = request.stage === 'interrupt' ? 'interrupted' : 'completed';
    if (status === 'completed') game.completed++;
    return {
      disposition: status,
      observations: [],
      outcome: {
        activityId: active.id,
        offerId: offer.id,
        actionId: offer.actionId,
        start: active.start,
        end: request.boundaryAt,
        status,
        evidenceId: `watch:actual:${request.id}`,
        actual: { exposures: [], observedProgress: [] },
        fulfills: [],
        advances: [],
      },
    };
  },
  communication() {
    return { emittedItemIds: [], received: [] };
  },
};

function finish(actors: WatchActors, inputs: Input[] = []) {
  actors.advance(WATCH_START + minuteMs(40), inputs, world);
  actors.verify();
  return actors.snapshot();
}

describe('Watch HF4 host bridge', () => {
  it('records real action boundaries, restores pending and active work, and replays exactly', () => {
    const { actors, inputs } = opening('hold-post');
    const pending = need(step(actors.run, { until: WATCH_START, inputs }));
    expect(pending.boundary.type).toBe('world-required');
    const archive = JSON.parse(JSON.stringify(actors.snapshot()));
    const restoredPending = WatchActors.restore(archive);
    expect(restoredPending.snapshot().archive.current.pending).toEqual(
      actors.snapshot().archive.current.pending,
    );
    restoredPending.advance(WATCH_START + minuteMs(1), [], world);
    actors.advance(WATCH_START + minuteMs(1), [], world, pending);
    expect(actors.hostState()).toEqual(restoredPending.hostState());
    actors.verify();
    expect(restoredPending.hostState().active).toHaveLength(1);
    const restoredActive = WatchActors.restore(JSON.parse(JSON.stringify(restoredPending.snapshot())));
    expect(finish(restoredActive)).toEqual(finish(restoredPending));
    const game = restoredActive.hostState().game as { completed: number; post: string };
    expect(game.completed).toBeGreaterThan(0);
    expect(game.post).toBe('gate');
  });

  it('keeps readings and previews detached and gives another observer no private affect', () => {
    const { actors, inputs } = opening('rest');
    actors.advance(WATCH_START + minuteMs(1), inputs, world);
    const before = actors.snapshot();
    const own = actors.read({
      perspective: { kind: 'host' },
      people: ['tamar'],
      select: ['affect', 'expectations'],
    });
    expect(own.people[0]?.parts.map((part) => part.select)).toEqual(['affect', 'expectations']);
    const other = actors.read({
      perspective: { kind: 'person', observer: 'keeper' },
      people: ['tamar'],
      select: ['affect', 'expectations'],
    });
    expect(other.people[0]?.parts.map((part) => part.value)).toEqual([
      { kind: 'unobserved' },
      { kind: 'unobserved' },
    ]);
    actors.preview({
      perspective: { kind: 'person', observer: 'tamar' },
      person: 'tamar',
      until: WATCH_START + minuteMs(2),
      inputs: [],
      select: ['affect', 'expectations'],
    });
    expect(actors.snapshot()).toEqual(before);
    expect((actors.hostState().game as { post: string }).post).toBe('home');
  });

  it('authors each founder’s held prayer understanding', () => {
    for (const def of WATCHERS) {
      const salah = authoredWatcher(def).state.heldNorms.find((norm) => norm.normId === 'salah');
      expect(salah).toMatchObject({ standing: 'obligatory', conviction: def.prays ? 0.855 : 0.285 });
      expect(authoredWatcher(def).state.heldNorms.map((norm) => norm.normId)).toEqual([
        ...DEFAULT_NORMS.map((norm) => norm.id),
        'keep-watch',
      ]);
    }
  });

  it('authors Ada as Kian’s ward and sibling', () => {
    const ada = FOUNDER_KIN.find((person) => person.id === 'ada');
    if (!ada) throw new Error('Missing Ada');
    const person = authoredKin(ada, 2);
    expect(person.state.relationships).toContainEqual(
      expect.objectContaining({
        otherId: 'kian',
        roles: ['guardian', 'sibling'],
        affection: 0.8,
        trust: 0.75,
        familiarity: 0.9,
      }),
    );
  });

  it('admits dated prayer commitments beyond the opening calendar', () => {
    const tamar = WATCHERS.find((person) => person.id === 'tamar');
    if (!tamar) throw new Error('Missing Tamar');
    const actors = WatchActors.create(
      watchSpec(7, null),
      [watchPerson('keeper', 'Keeper', 'male', 40), authoredWatcher(tamar)],
      null,
    );
    const day = 2;
    const at = minuteMs(day * 1440);
    actors.advance(at, watchPrayerInputs(tamar.id, day), world);
    const read = actors.read({ perspective: { kind: 'host' }, people: [tamar.id], select: ['agenda'] });
    expect(JSON.stringify(read)).toContain('salah:2:fajr');
  });

  it('refuses older saves explicitly', () => {
    expect(() => WatchActors.restore({ version: 4 })).toThrow(WATCH_OLD_SAVE);
  });
});
