// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { PersonSheet, placesFor, Status } from './Layout.tsx';

it('keeps a settled refusal distinct from completed work in the latest-order row', () => {
  const card: OrderCard = {
    order: {
      id: 'o1',
      personId: 'idris',
      placeId: 'well',
      action: 'draw-water',
      issuedAt: 0,
      rollKey: 0,
      rush: false,
      insist: false,
    },
    status: 'done',
    classic: { state: 'ok', settled: true },
    human: { state: 'willNot', settled: true, label: 'That is not my work.' },
  };
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(createElement(Status, { card }));
  expect(node.querySelector('.chip-ok')?.textContent).toBe('Classic ✓ done');
  expect(node.querySelector('.chip-willNot')?.textContent).toBe('Human ✗ will not');
});

it('names shuttering in the latest House order as well as the destination tile', () => {
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  frame.cards = [
    {
      order: {
        id: 'o1',
        personId: 'idris',
        placeId: 'site',
        action: 'shutter-house',
        issuedAt: 2100,
        rollKey: 2100,
        rush: false,
        insist: false,
      },
      status: 'active',
      classic: { state: 'ok' },
      human: { state: 'assent', says: 'Fine.' },
    },
  ];
  const noop = () => {};
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(
    createElement(PersonSheet, {
      frame,
      id: 'idris',
      rush: false,
      insist: false,
      appeal: null,
      appealOpen: false,
      pending: null,
      asked: null,
      forecasts: {},
      outline: null,
      onBack: noop,
      onRush: noop,
      onInsist: noop,
      onAppeal: noop,
      onAppealOpen: noop,
      onAbout: noop,
      onPlace: noop,
      onHover: noop,
      onConfirm: noop,
      onCancelRisk: noop,
      onCancel: noop,
      onRepeat: noop,
    }),
  );
  expect(node.querySelector('.well-latest strong')?.textContent).toContain('shutter the house');
});

it('offers Home shelter for the well-house resident without changing old Home meaning', async () => {
  const { homeOrderMeaning } = await import('./order-status.ts');
  const { inferredJob } = await import('./parts.tsx');
  const frame = new ColonyGame(20261003, createFrameworkHumanSide, 8).frame();
  expect(placesFor('danyal', 8).at(-1)).toBe('home-idris');
  expect(inferredJob(frame, 'home-idris')).toBe('shelter');
  expect(inferredJob({ ...frame, rules: 7 }, 'home-idris')).toBe('eat');
  const game = new ColonyGame(20261003, createFrameworkHumanSide, 8);
  game.issue({ personId: 'idris', placeId: 'home-idris' });
  const card = game.frame().cards[0];
  if (!card) throw Error('Missing Home order');
  expect(homeOrderMeaning(card)).toContain('until dawn (05:00)');
  expect(homeOrderMeaning({ ...card, order: { ...card.order, action: 'eat' } })).toContain('eat once');
});
