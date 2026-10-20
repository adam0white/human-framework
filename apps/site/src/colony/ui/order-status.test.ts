import { describe, expect, it } from 'vitest';
import type { OrderCard } from '../sim/orders.ts';
import { latestPersonOrder, personOrderStatus, repeatPersonOrder } from './order-status.ts';

function card(overrides: Partial<OrderCard> = {}): OrderCard {
  return {
    order: {
      id: 'o1',
      issuedAt: 300,
      rollKey: 300,
      personId: 'idris',
      placeId: 'site',
      action: 'build',
      rush: true,
      insist: true,
      appeal: 'safety',
    },
    status: 'active',
    classic: { state: 'ok' },
    human: { state: 'pending' },
    ...overrides,
  };
}

describe('a person’s visible order', () => {
  it('keeps the latest outcome, including cancellation and lapse, instead of an older promise', () => {
    const old = card();
    const cancelled = card({ status: 'cancelled' });
    expect(latestPersonOrder([old, cancelled], 'idris')).toBe(cancelled);
    expect(latestPersonOrder([old], 'yusuf')).toBeUndefined();
    expect(personOrderStatus(cancelled)).toBe('House: cancelled');
    expect(personOrderStatus(card({ status: 'lapsed' }))).toBe("House: didn't get to it");
    expect(
      personOrderStatus(card({ status: 'lapsed', classic: { state: 'ok', settled: true } }), 'classic'),
    ).toBe('House: done');
  });
  it('distinguishes waiting, work, conditions, refusal and completion without time counts', () => {
    expect(personOrderStatus(card())).toBe('House: waiting');
    expect(personOrderStatus(card(), 'classic')).toBe('House: on it');
    expect(personOrderStatus(card({ human: { state: 'notNow', label: 'after I eat' } }))).toBe(
      'House: later, after I eat',
    );
    expect(personOrderStatus(card({ human: { state: 'willNot', label: 'that is my work' } }))).toBe(
      "House: won't — “that is my work”",
    );
    expect(personOrderStatus(card({ human: { state: 'notNow', settled: true } }))).toBe('House: done');
    expect(
      personOrderStatus(card({ status: 'done', human: { state: 'cannot', label: 'hurt', settled: true } })),
    ).toBe("House: can't — hurt");
  });
  it('keeps long replies out of tags while preserving a short reason when available', () => {
    expect(
      personOrderStatus(
        card({
          human: {
            state: 'willNot',
            settled: true,
            label: 'gather grain',
            says: 'Not that — I will gather grain; that is my work.',
          },
        }),
      ),
    ).toBe("House: won't — “that is my work”");
    expect(
      personOrderStatus(
        card({
          human: { state: 'willNot', label: 'And leave the pot cold at noon? No. They eat from my hands.' },
        }),
      ),
    ).toBe("House: won't");
    expect(personOrderStatus(card({ human: { state: 'notNow', label: 'gather grain' } }))).toBe(
      'House: waiting',
    );
  });
  it('asks the same person for the same place with every original option', () => {
    expect(repeatPersonOrder(card())).toEqual({
      personId: 'idris',
      placeId: 'site',
      rush: true,
      insist: true,
      appeal: 'safety',
    });
  });
});
