import { describe, expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from './game.ts';
import type { HumanOrder } from './orders.ts';
import { fanOut, inferAction, OrderBook } from './orders.ts';
import { createPlaceholderHumanSide, PlaceholderHumanSide } from './placeholder-human.fixture.ts';
import { at, END_MINUTE, SHUTTER_AVAILABLE, SHUTTER_ROOF_FROM, STORM_START } from './world-types.ts';

const ctx = { minute: 60, house: { stage: 4, shuttered: false }, cedarFelled: false };

describe('order inference', () => {
  it('infers the job from the place (spec §3)', () => {
    expect(inferAction('forest', ctx)).toBe('gather-timber');
    expect(inferAction('cedar', ctx)).toBe('fell-cedar');
    expect(inferAction('cedar', { ...ctx, cedarFelled: true })).toBe('gather-timber');
    expect(inferAction('field', ctx)).toBe('gather-grain');
    expect(inferAction('well', ctx)).toBe('draw-water');
    expect(inferAction('kitchen', ctx)).toBe('cook');
    expect(inferAction('site', ctx)).toBe('build');
    expect(inferAction('site', { ...ctx, house: { stage: 6, shuttered: false } })).toBe('raise-beam');
    expect(inferAction('site', { ...ctx, minute: SHUTTER_AVAILABLE })).toBe('shutter-house');
    expect(inferAction('masjid', ctx)).toBe('pray');
    expect(inferAction('masjid', { ...ctx, minute: STORM_START + 5 })).toBe('shelter');
    expect(inferAction('home-yusuf', ctx)).toBe('eat');
    expect(inferAction('home-yusuf', { ...ctx, minute: at(1, 23, 0) })).toBe('sleep');
  });
});

describe('shutter window', () => {
  it('an unfinished roof still builds until 18:00, then shutters; below the beam it shutters from the warning', () => {
    const roof = { ...ctx, house: { stage: 9, shuttered: false } };
    expect(inferAction('site', { ...roof, minute: at(2, 17, 0) })).toBe('build');
    expect(inferAction('site', { ...roof, minute: SHUTTER_ROOF_FROM })).toBe('shutter-house');
    expect(inferAction('site', { ...ctx, minute: SHUTTER_AVAILABLE })).toBe('shutter-house');
    expect(
      inferAction('site', { ...roof, minute: SHUTTER_ROOF_FROM, house: { stage: 9, shuttered: true } }),
    ).toBe('build');
  });

  it('never shutters on Day 3: an order to an open house builds it', () => {
    expect(inferAction('site', { ...ctx, minute: END_MINUTE + 60 })).toBe('build');
    expect(
      inferAction('site', { ...ctx, minute: END_MINUTE + 60, house: { stage: 9, shuttered: false } }),
    ).toBe('build');
  });
});

describe('fan-out', () => {
  it('maps one order to identical Classic and Human payloads', () => {
    const book = new OrderBook();
    const o = book.issue(
      { personId: 'yusuf', placeId: 'site', rush: true, insist: true, appeal: 'duty' },
      30,
      'build',
    );
    const { classic, human } = fanOut(o);
    expect(classic).toMatchObject({
      orderId: 'o1',
      personId: 'yusuf',
      action: 'build',
      rollKey: 30,
      rush: true,
    });
    expect(human).toMatchObject({ orderId: 'o1', personId: 'yusuf', action: 'build', rollKey: 30 });
    expect(human.suggestion).toEqual({
      voiceId: 'player',
      action: 'build',
      strength: 0.9,
      insist: true,
      appeal: 'duty',
    });
    const plain = fanOut(book.issue({ personId: 'tariq', placeId: 'forest' }, 31, 'gather-timber'));
    expect(plain.human.suggestion).toEqual({ voiceId: 'player', action: 'gather-timber', strength: 0.6 });
  });

  it('applies an order to both sides at the same minute boundary', () => {
    const seen: { minute: number; orders: HumanOrder[] }[] = [];
    const game = new ColonyGame(DEFAULT_SEED, () => {
      const side = new PlaceholderHumanSide();
      const step = side.step.bind(side);
      side.step = (until, orders) => {
        if (orders.length) seen.push({ minute: until - 1, orders: [...orders] });
        return step(until, orders);
      };
      return side;
    });
    game.advance(10);
    const order = game.issue({ personId: 'yusuf', placeId: 'site' });
    expect(order?.issuedAt).toBe(10);
    game.advance(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.minute).toBe(10);
    expect(seen[0]?.orders[0]?.orderId).toBe(order?.id);
    // Classic received it at the same boundary: its task is the ordered job.
    expect(game.classic.unit('yusuf').task?.orderId).toBe(order?.id);
    const card = game.book.card(order?.id ?? '');
    expect(card?.classic.state).toBe('ok');
    expect(card?.human.state).toBe('assent');
  });

  it('cancel withdraws the order on both sides; old cards lapse after two hours', () => {
    const game = new ColonyGame(DEFAULT_SEED, createPlaceholderHumanSide);
    const o = game.issue({ personId: 'idris', placeId: 'field' });
    game.advance(2);
    game.cancel(o?.id ?? '');
    expect(game.book.card(o?.id ?? '')?.status).toBe('cancelled');
    expect(game.classic.unit('idris').task?.orderId).toBeUndefined();
    const o2 = game.issue({ personId: 'samira', placeId: 'masjid' });
    game.advance(121);
    const status = game.book.card(o2?.id ?? '')?.status;
    expect(status === 'lapsed' || status === 'done').toBe(true);
  });

  it('does not lapse a card the exempt predicate holds open (a job under way)', () => {
    const book = new OrderBook();
    const a = book.issue({ personId: 'yusuf', placeId: 'site' }, 0, 'build');
    const b = book.issue({ personId: 'idris', placeId: 'forest' }, 0, 'gather-timber');
    expect(book.lapse(120, (c) => c.order.id === a.id)).toEqual([b.id]);
    expect(book.card(a.id)?.status).toBe('active');
    expect(book.lapse(121)).toEqual([a.id]);
  });
});
