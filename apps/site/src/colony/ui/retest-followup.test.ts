// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { GoalStrip, OrderReply } from './parts.tsx';

function render(component: Parameters<typeof renderToStaticMarkup>[0]) {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(component);
  return node;
}

const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
function card(id: string, human: OrderCard['human'], status: OrderCard['status'] = 'active'): OrderCard {
  return {
    order: {
      id,
      personId: 'yusuf',
      placeId: 'site',
      action: 'build',
      issuedAt: 0,
      rollKey: 0,
      rush: false,
      insist: false,
    },
    classic: { state: 'ok' },
    human,
    status,
  };
}

describe('Well source-unread retest follow-up', () => {
  it('keeps roof and survival deadlines outside the collapsed goal labels', () => {
    const node = render(createElement(GoalStrip, { goals: frame.goals }));
    expect(node.querySelector('.goal-deadlines')?.textContent).toBe(
      'Roof before D2 19:00Everyone lives by D3 05:00',
    );
    expect(node.querySelector('.goal-deadlines')?.closest('.goal-label')).toBeNull();
    expect(node.querySelector('.goal-strip-toggle')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('reads current deadlines from the goals, including the optional third day', () => {
    const goals = frame.goals.map((g) => ({ ...g, deadlineMinute: g.deadlineMinute + 1440 }));
    expect(render(createElement(GoalStrip, { goals })).querySelector('.goal-deadlines')?.textContent).toBe(
      'Roof before D3 19:00Everyone lives by D4 05:00',
    );
    expect(render(createElement(GoalStrip, { goals: [] })).querySelector('.goal-deadlines')).toBeNull();
  });

  it('names the Human speaker and order beside their latest actual answer', () => {
    const cards = [card('o1', { state: 'notNow', label: 'After I eat a meal.' })];
    const node = render(createElement(OrderReply, { cards }));
    expect(node.textContent).toBe('Human · Yusuf → House: not now · After I eat a meal.');
    expect(node.querySelector('[role="status"]')).not.toBeNull();
    cards[0] = card('o1', { state: 'assent', label: 'Fine.' });
    expect(render(createElement(OrderReply, { cards })).textContent).toContain('yes · Fine.');
    expect(render(createElement(OrderReply, { cards })).textContent).not.toContain('After I eat');
  });

  it('keeps a meaningful reply while a newer order is pending, without mutating cards', () => {
    const cards = [card('o1', { state: 'assent', label: 'Fine.' }), card('o2', { state: 'pending' })];
    const before = structuredClone(cards);
    expect(render(createElement(OrderReply, { cards })).textContent).toContain('yes · Fine.');
    expect(cards).toEqual(before);
    cards.push(card('o3', { state: 'willNot', label: 'No.' }, 'done'));
    expect(render(createElement(OrderReply, { cards })).textContent).toContain('will not · No.');
  });

  it('does not present an obsolete or unspoken answer as a current response', () => {
    for (const status of ['cancelled', 'replaced', 'lapsed'] as const) {
      expect(
        render(
          createElement(OrderReply, { cards: [card('o1', { state: 'assent', label: 'Fine.' }, status)] }),
        ).textContent,
      ).toBe('');
    }
    expect(
      render(createElement(OrderReply, { cards: [card('o1', { state: 'pending', label: 'Waiting' })] }))
        .textContent,
    ).toBe('');
    expect(render(createElement(OrderReply, { cards: [] })).textContent).toBe('');
  });
});
