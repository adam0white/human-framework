import { replay } from '@adam0white/human-framework';
import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { Playback } from './playback.ts';
import { colonyHash, replayColony } from './playtest.ts';
import { STORM_START } from './world-types.ts';

it('runs the public HF4 host action loop and restores/replays the whole current game', () => {
  const g = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  g.issue({ personId: 'maryam', placeId: 'kitchen' });
  g.advance(65);
  expect(g.minute).toBe(65);
  expect(g.human.view()).toHaveLength(6);
  const side = g.human as FrameworkHumanSide;
  const saved = side.snapshot();
  expect(Object.keys((saved as { community: { offerHistory: object } }).community.offerHistory)).toHaveLength(
    6,
  );
  side.restore(saved);
  expect(side.snapshot()).toEqual(saved);
  const again = replayColony(g.seed, createFrameworkHumanSide, g.log, g.minute);
  expect(colonyHash(again)).toBe(colonyHash(g));
  expect(replay((saved as { community: { run: unknown } }).community.run).ok).toBe(true);
});

it('runs the whole two-day game, preserves actual storm reading expiry and replays every input', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  game.issue({ personId: 'maryam', placeId: 'kitchen' });
  game.advance(STORM_START - 4);
  // Observe this actual late-game opportunity without replaying its entire prefix
  // in a second test. The same six-person run still reaches the full two-day end.
  const playback = new Playback(createFrameworkHumanSide);
  playback.game = game;
  playback.handle({ type: 'resume' });
  const nudge = game.visibleNudges().find((n) => n.id === 'storm-shutter');
  expect(nudge).toBeDefined();
  if (!nudge) throw new Error('Missing actual storm-shutter opportunity');
  expect(playback.state().pause?.nudgeId).toBe(nudge.id);
  const beforeReading = JSON.stringify(game.log);
  for (let i = 0; i < 24; i++) {
    playback.handle({ type: 'tick', dtMs: 250 });
    expect(game.visibleNudges().some((n) => n.id === nudge.id)).toBe(game.minute < nudge.until);
  }
  expect(game.minute).toBeGreaterThanOrEqual(STORM_START);
  expect(playback.state().pace).toBe('reading');
  expect(JSON.stringify(game.log)).toBe(beforeReading);
  game.advance(2880 - game.minute);
  expect(game.minute).toBe(2880);
  const again = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute);
  expect(colonyHash(again)).toBe(colonyHash(game));
}, 600000);

it('keeps the original adhan and prayer windows aligned', async () => {
  const { villagerPersonSpec, MINUTE } = await import('./human-cast.ts');
  const { VILLAGERS, PRAYER_TIMES } = await import('./world-types.ts');
  const maryam = VILLAGERS.find((v) => v.id === 'maryam');
  if (!maryam) throw new Error('Missing Maryam');
  const commitments = villagerPersonSpec(DEFAULT_SEED, maryam).state.agenda.commitments;
  expect(PRAYER_TIMES.map((p) => p.minuteOfDay)).toEqual([300, 750, 960, 1125, 1215]);
  expect(
    commitments.filter((c) => c.normId === 'salah').map((c) => [c.from / MINUTE, c.until / MINUTE]),
  ).toEqual([
    [300, 390],
    [750, 960],
    [960, 1125],
    [1125, 1170],
    [1215, 1740],
  ]);
});

it('coordinates a beam through independently started lead and helper work', () => {
  const game = new ColonyGame(1, createFrameworkHumanSide);
  game.humanWorld.house.stage = 6;
  game.humanWorld.resources.timber = 20;
  game.issue({ personId: 'yusuf', placeId: 'site', insist: true });
  game.issue({ personId: 'tariq', placeId: 'site', insist: true });
  game.advance(40);
  const side = game.human as FrameworkHumanSide;
  const lead = side.person('yusuf').activity;
  const helper = side.person('tariq').activity;
  expect(lead?.action).toBe('raise-beam');
  if (!lead) throw new Error('Missing actual beam start.');
  expect(helper?.affordance.jointId).toBe(lead?.id);
  const before = game.frame({ buildingDetails: true, personId: 'yusuf' }).humanWorld.construction;
  expect(before).toMatchObject({ nextStage: 7, nextWork: 'beam', nextTimber: 2 });
  expect(before?.active.map((a) => a.personId)).toEqual(expect.arrayContaining(['yusuf', 'tariq']));
  game.advance(16);
  expect(side.person('tariq').activity?.id).not.toBe(helper?.id);
  expect(game.humanWorld.house.stage).toBe(6);
  const saved = side.snapshot() as { host: { beamSupport?: Record<string, string[]> } };
  expect(saved.host.beamSupport?.[lead.id]).toContain('tariq');
  side.restore(saved);
  expect(side.snapshot()).toEqual(saved);
  let timberBefore = game.humanWorld.resources.timber;
  for (let i = 0; i < 4 && game.humanWorld.house.stage < 7; i++) {
    timberBefore = game.humanWorld.resources.timber;
    game.advance(1);
  }
  expect(game.humanWorld.house.stage).toBe(7);
  expect(game.humanWorld.resources.timber).toBe(timberBefore - 2);
  expect(game.frame({ buildingDetails: true }).humanWorld.construction).toMatchObject({
    nextStage: 8,
    nextWork: 'ordinary',
    nextTimber: 5,
  });
  expect(game.moments.find((m) => m.id === 4)?.line).toContain('Yusuf and Tariq raised the beam together');
  const replay = new ColonyGame(1, createFrameworkHumanSide);
  replay.humanWorld.house.stage = 6;
  replay.humanWorld.resources.timber = 20;
  replay.issue({ personId: 'yusuf', placeId: 'site', insist: true });
  replay.issue({ personId: 'tariq', placeId: 'site', insist: true });
  replay.advance(game.minute);
  expect(colonyHash(replay)).toBe(colonyHash(game));
});

it('records a kept safety promise after a real successful beam', async () => {
  const { voiceOf } = await import('./hf4.ts');
  const game = new ColonyGame(2, createFrameworkHumanSide);
  game.humanWorld.house.stage = 6;
  game.humanWorld.resources.timber = 20;
  game.issue({ personId: 'yusuf', placeId: 'site', appeal: 'safety', insist: true });
  game.issue({ personId: 'tariq', placeId: 'site', insist: true });
  game.advance(58);
  const side = game.human as FrameworkHumanSide;
  expect(game.humanWorld.house.stage).toBe(7);
  expect(voiceOf(side.person('yusuf'), 'player')?.history.some((h) => h.reason === 'promise-kept')).toBe(
    false,
  );
  game.advance(1);
  expect(voiceOf(side.person('yusuf'), 'player')?.history.some((h) => h.reason === 'promise-kept')).toBe(
    true,
  );
});

it('drops completed help if its lead finds the beam no longer ready', () => {
  const game = new ColonyGame(1, createFrameworkHumanSide);
  game.humanWorld.house.stage = 6;
  game.humanWorld.resources.timber = 20;
  game.issue({ personId: 'yusuf', placeId: 'site', insist: true });
  game.issue({ personId: 'tariq', placeId: 'site', insist: true });
  game.advance(40);
  const side = game.human as FrameworkHumanSide;
  const lead = side.person('yusuf').activity;
  if (!lead) throw new Error('Missing lead activity');
  game.advance(16);
  let saved = side.snapshot() as { host: { beamSupport?: Record<string, string[]> } };
  expect(saved.host.beamSupport?.[lead.id]).toContain('tariq');
  game.humanWorld.house.stage = 7;
  game.advance(4);
  saved = side.snapshot() as { host: { beamSupport?: Record<string, string[]> } };
  expect(saved.host.beamSupport?.[lead.id]).toBeUndefined();
  expect(game.moments.some((m) => m.id === 4)).toBe(false);
});

it('withdraws cancelled standing advice on the next host step', () => {
  const game = new ColonyGame(1, createFrameworkHumanSide);
  game.issue({ personId: 'maryam', placeId: 'kitchen' });
  game.advance(1);
  const side = game.human as FrameworkHumanSide;
  const readAdvice = () =>
    (side.snapshot() as { community: { advice: Record<string, string> } }).community.advice;
  expect(readAdvice().maryam).toBeDefined();
  const card = game.book.cards[0];
  if (!card) throw new Error('Missing order card');
  game.cancel(card.order.id);
  expect(game.book.cards[0]?.status).toBe('cancelled');
  game.advance(1);
  expect(readAdvice().maryam).toBeUndefined();
});

it('names unsupported individual arrivals and leaves their saved heads untouched', async () => {
  const { canonicalCast, claimCastChapterBatch, createPersona, preparePersonaLife } = await import(
    '@adam0white/lab-client'
  );
  const ids = ['hf.cast.samira.well', 'hf.cast.idris.well'];
  const parents = await Promise.all(
    ids.map((castId) =>
      createPersona({
        format: 'hf-persona/1',
        castId,
        castRevision: canonicalCast(castId).revision,
        branchId: `test-${castId}`,
        parentRevision: null,
        source: { game: 'watch', engine: '3.2.0', build: 'fixture', rules: 'legacy' },
        transfer: { castPassport: 'site-cast/1' },
        limitations: [],
      }),
    ),
  );
  const originals = structuredClone(parents);
  const inputs = parents.map((parent) => preparePersonaLife(parent, 0));
  let written: unknown[] | undefined;
  const shelf = {
    async request<T>(request: { action: string; envelopes?: unknown[] }) {
      if (request.action === 'prepareBatch')
        return {
          expectedHeads: Object.fromEntries(parents.map((p) => [p.castId, p.revision])),
          inputs,
          blocked: [],
        } as T;
      if (request.action === 'putBatch') written = request.envelopes;
      return undefined as T;
    },
  };
  const result = await claimCastChapterBatch(
    shelf,
    ids,
    { game: 'well', engine: '4.10.0', build: 'fixture', rules: 'current' },
    async (eligible) => eligible,
    {
      admitPerson: async (input) => {
        new ColonyGame(1, createFrameworkHumanSide, undefined, 'default', { version: 'site-cast/1', input });
      },
    },
  );
  expect(result?.blocked.map((x) => x.reason)).toEqual([
    expect.stringContaining('Samira'),
    expect.stringContaining('Idris'),
  ]);
  expect(result?.inputs).toEqual([]);
  expect(written).toEqual([]);
  expect(parents).toEqual(originals);
});

it('refuses a real Well checkpoint while the peer reader is blocked without changing the run', async () => {
  const game = new ColonyGame(1, createFrameworkHumanSide);
  game.advance(1);
  const side = game.human as FrameworkHumanSide;
  const before = side.snapshot();
  await expect(side.castCheckpoint('hf.cast.samira.well')).rejects.toThrow(/read-only/);
  expect(side.snapshot()).toEqual(before);
});

it('grades an actually injured ordered beam as a broken safety promise', async () => {
  const { vi } = await import('vitest');
  const { HOST, ColonyHostWorld } = await import('./human-world.ts');
  const { voiceOf } = await import('./hf4.ts');
  const previous = HOST.beamInjuryChance;
  // Force the physical roll and injury in this host fixture; the decision and receipts are real.
  const prototype = ColonyHostWorld.prototype as unknown as { beamChance: () => number };
  const chance = vi.spyOn(prototype, 'beamChance').mockReturnValue(0);
  HOST.beamInjuryChance = 1;
  try {
    const game = new ColonyGame(2, createFrameworkHumanSide);
    game.humanWorld.house.stage = 6;
    game.humanWorld.resources.timber = 20;
    game.issue({ personId: 'yusuf', placeId: 'site', appeal: 'safety', insist: true });
    game.issue({ personId: 'tariq', placeId: 'site', insist: true });
    game.advance(60);
    const side = game.human as FrameworkHumanSide;
    expect(game.humanWorld.injuries).toBeGreaterThan(0);
    expect(game.frame().news.some((n) => n.side === 'human' && n.personId === 'yusuf')).toBe(true);
    const event = game
      .frame()
      .cards.find((c) => c.order.personId === 'yusuf')
      ?.human.workEvents?.find((e) => e.kind === 'injury');
    expect(event?.action).toBe('raise-beam');
    expect(event?.activityId).toBeTypeOf('string');
    expect(event?.minute).toBeLessThanOrEqual(game.minute);
    expect(game.book.cards[0]?.human).not.toHaveProperty('workEvents');
    const saved = side.snapshot();
    side.restore(saved);
    expect(side.snapshot()).toEqual(saved);
    expect(voiceOf(side.person('yusuf'), 'player')?.history.some((h) => h.reason === 'promise-broken')).toBe(
      true,
    );
  } finally {
    chance.mockRestore();
    HOST.beamInjuryChance = previous;
  }
});
