// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { VillageStrip } from './PhoneStage.tsx';
import { SuggestionCard } from './parts.tsx';

const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
describe('Well phone stage', () => {
  it('shows actual progress, actual stored meals and the storm deadline for each selected village', () => {
    for (const side of ['human', 'classic'] as const) {
      const html = renderToStaticMarkup(createElement(VillageStrip, { frame, side }));
      const node = document.createElement('div');
      node.innerHTML = html;
      const strip = node.querySelector('.lk-strip');
      expect(strip?.textContent).toContain(`Meals ${frame.scoreboard[side].meals}`);
      expect(strip?.textContent).toContain('Storm Day 2 19:00');
      expect(strip?.textContent).toContain(
        `Roof ${frame[side === 'human' ? 'humanWorld' : 'classicWorld'].project.stage} of 10`,
      );
      expect(node.querySelector('.lk-chips')?.getAttribute('aria-expanded')).toBe('false');
    }
  });
  it('replaces stale availability claims with a dated actual refusal without mutating cards', () => {
    const nudge = {
      id: 'old',
      minute: 620,
      until: 705,
      text: 'Maryam is free until noon.',
      reason: 'She can leave the kitchen.',
      order: { personId: 'maryam' as const, placeId: 'forest' as const },
    };
    const cards: OrderCard[] = [
      {
        order: {
          id: 'order',
          issuedAt: 640,
          personId: 'maryam',
          placeId: 'forest',
          action: 'gather-timber',
          rollKey: 0,
          rush: false,
          insist: false,
        },
        human: { state: 'willNot', label: 'And leave the pot cold at noon? No.' },
        classic: { state: 'ok' },
        status: 'active',
      },
    ];
    const before = structuredClone(cards);
    const html = renderToStaticMarkup(
      createElement(SuggestionCard, {
        nudge,
        cards,
        minute: 650,
        queued: 0,
        active: false,
        onUse: () => {},
        onSkip: () => {},
      }),
    );
    expect(html).toContain('Suggested at D1 15:20. Maryam answered an order issued at D1 15:40');
    expect(html).toContain('And leave the pot cold at noon? No.');
    expect(html).not.toContain('free until noon');
    expect(html).toContain('She can leave the kitchen');
    expect(cards).toEqual(before);
    // A deferral can arrive after a suggestion even when the order was issued earlier.
    // The card has no answer timestamp; do not invent their relative timing.
    const delayed = cards.map((card) => ({ ...card, order: { ...card.order, issuedAt: 610 } }));
    const delayedHtml = renderToStaticMarkup(
      createElement(SuggestionCard, {
        nudge,
        cards: delayed,
        minute: 650,
        queued: 0,
        active: false,
        onUse: () => {},
        onSkip: () => {},
      }),
    );
    expect(delayedHtml).toContain('This is an old suggestion;');
    expect(delayedHtml).toContain('And leave the pot cold at noon? No.');
    expect(delayedHtml).not.toContain('free until noon');
    expect(delayedHtml).not.toContain('before Maryam');
  });
  it('keeps the scheduled proposal when there is no later refusal', () => {
    const nudge = {
      id: 'fresh',
      minute: 620,
      until: 705,
      text: 'Send Yusuf to the house?',
      reason: 'He is a builder.',
      order: { personId: 'yusuf' as const, placeId: 'site' as const },
    };
    expect(
      renderToStaticMarkup(
        createElement(SuggestionCard, {
          nudge,
          cards: [],
          minute: 650,
          queued: 0,
          active: false,
          onUse: () => {},
          onSkip: () => {},
        }),
      ),
    ).toContain(nudge.text);
  });
});
