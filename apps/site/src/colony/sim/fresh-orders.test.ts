/** HF owns advice strength and decay. Older host freshness coefficients and @6/@7 comparisons are retired. */
import { expect, it } from 'vitest';
import { requireValue } from '../../shared/require-value.ts';
import { ColonyGame, DEFAULT_SEED, SCENARIO_VERSION } from './game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from './human.ts';
import { colonyHash, replayColony } from './playtest.ts';

function dawn() {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  game.issue({ personId: 'idris', placeId: 'home-idris' });
  game.advance(1);
  return game;
}

it('records the actual player answer and explains standing advice without claiming a host boost', () => {
  const game = dawn();
  expect(game.why('idris')?.narration).toContain('Standing advice can lose weight over time');
  expect((game.human as FrameworkHumanSide).person('idris').trace.at(-1)?.suggestion?.voiceId).toBe('player');
});

it('ordinary advice still allows HF to refuse work against a held duty', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  game.issue({ personId: 'maryam', placeId: 'forest' });
  game.advance(1);
  expect(game.book.cards[0]?.human.state).toBe('willNot');
  expect((game.human as FrameworkHumanSide).person('maryam').activity?.action).not.toBe('gather-timber');
});

it('preserves receipt age and strength through cold restore and exact input-log replay', () => {
  const game = dawn();
  const saved = game.human.snapshot();
  const restored = dawn();
  restored.human.restore(JSON.parse(JSON.stringify(saved)));
  const before = requireValue(
    (saved as { s: { orders: Record<string, { since: number; order: { suggestion: unknown } }> } }).s.orders
      .idris,
  );
  game.advance(35);
  restored.advance(35);
  const after = requireValue(
    (game.human.snapshot() as typeof saved & { s: { orders: Record<string, typeof before> } }).s.orders.idris,
  );
  expect(after.since).toBe(before.since);
  expect(after.order.suggestion).toEqual(before.order.suggestion);
  expect(colonyHash(restored)).toBe(colonyHash(game));
  const replayed = replayColony(game.seed, createFrameworkHumanSide, game.log, game.minute);
  expect(colonyHash(replayed)).toBe(colonyHash(game));
  expect(replayed.human.snapshot()).toEqual(game.human.snapshot());
});

it('names the current HF4 game edition', () => {
  expect(SCENARIO_VERSION).toBe('colony-scenario@9');
});

it('uses the matching framework resolution narration for the player answer', async () => {
  const { inspect } = await import('@adam0white/human-framework');
  const game = dawn();
  const side = game.human as FrameworkHumanSide;
  const community = (side as unknown as { community: import('./hf4.ts').Community }).community;
  const result = inspect(community.run, {
    perspective: { kind: 'host' },
    people: ['idris'],
    select: ['events'],
  });
  if (!result.ok) throw new Error(result.error.message);
  const view = result.value.people[0];
  if (!view || view.kind !== 'host') throw new Error('Missing host view');
  const events = view.parts.find((part) => part.select === 'events');
  if (!events || events.select !== 'events') throw new Error('Missing events');
  const record = side
    .person('idris')
    .trace.findLast((r) => r.suggestions?.some((s) => s.voiceId === 'player'));
  if (!record) throw new Error('Missing player decision');
  const event = events.value.find(
    (e) =>
      e.data.kind === 'suggestion-resolved' &&
      e.data.decisionId === record.id &&
      e.data.resolution.voiceId === 'player',
  );
  if (!event) throw new Error('Missing player resolution');
  expect(record.suggestions?.find((s) => s.voiceId === 'player')?.says).toBe(
    event.narration.map((n) => n.text).join(' '),
  );
  expect(game.book.cards[0]?.human.says).toBe(event.narration.map((n) => n.text).join(' '));
});
