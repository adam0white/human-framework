// @vitest-environment happy-dom
/** Generated view fixtures over a current HF opening; no original tester cause or browser proof. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide, readableReason } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { colonyState } from '../sim/playtest.ts';
import { Inspector } from './Inspector.tsx';
import { PersonSheet, Status } from './Layout.tsx';
import { personOrderStatus } from './order-status.ts';
import { TaskContext } from './parts.tsx';

const game = new ColonyGame(20261003, createFrameworkHumanSide);
game.advance(1);
const opening = game.frame({ buildingDetails: true, personId: 'maryam' });
const noop = () => {};
const order: OrderCard = {
  order: {
    id: 'view-only',
    personId: 'maryam',
    placeId: 'site',
    action: 'build',
    issuedAt: 0,
    rollKey: 0,
    rush: false,
    insist: true,
  },
  status: 'active',
  classic: { state: 'ok' },
  human: { state: 'notNow', says: 'I adapted the advice.', label: 'cook a pot', answerObservedAt: 1 },
};
function sheet(frame = opening) {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(
    createElement(PersonSheet, {
      frame,
      id: 'maryam',
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
  return node;
}
it('keeps action choices and About before one disclosure containing both inventories', () => {
  const before = JSON.stringify(colonyState(game));
  const node = sheet();
  const disclosure = node.querySelector('details.well-construction-details');
  expect(disclosure).not.toBeNull();
  expect(disclosure?.hasAttribute('open')).toBe(false);
  const about = [...node.querySelectorAll('button')].find((b) => b.textContent === 'About');
  for (const control of [about, node.querySelector('[aria-label="Order Maryam to Kitchen"]')]) {
    expect(control?.closest('details')).toBeNull();
    expect(
      Boolean(
        control &&
          disclosure &&
          control.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  }
  expect(disclosure?.querySelectorAll('table')).toHaveLength(2);
  expect(node.querySelectorAll('.well-order-goals .well-building-progress')).toHaveLength(2);
  expect(node.querySelectorAll('.well-order-goals .well-building-meals')).toHaveLength(2);
  expect(JSON.stringify(colonyState(game))).toBe(before);
});
it('shows current cooking without an unrelated incomplete-stage sentence', () => {
  const node = sheet({
    ...opening,
    human: opening.human.map((p) => (p.id === 'maryam' ? { ...p, label: 'Cooking' } : p)),
  });
  expect(node.textContent).toContain('cooking');
  expect(node.textContent).not.toContain('An incomplete stage does not establish why');
});
it('describes one meal store and the actual selected preparation time as an offer threshold', () => {
  const render = (village: 'default' | 'early-warning') =>
    renderToStaticMarkup(createElement(TaskContext, { job: 'cook', village }));
  const normal = render('default'),
    early = render('early-warning');
  expect(normal).toContain('same meal store');
  expect(normal).toContain('Day 2 16:00');
  expect(early).toContain('Day 2 12:00');
  expect(normal).toContain('6 to 12');
  expect(normal).toContain('not a capacity or a guarantee');
  expect(normal).toContain('due meal duty');
  expect(normal).not.toContain('separate');
});
it('keeps exact speech and matched alternative as labelled context, with bounded trust evidence beside it', () => {
  const frame = {
    ...opening,
    cards: [order],
    minute: 10,
    human: opening.human.map((p) =>
      p.id !== 'maryam'
        ? p
        : {
            ...p,
            trust: {
              ...p.trust,
              history: [
                { minute: -1, delta: -0.1, label: 'outside interval' },
                { minute: 2, delta: -0.1, label: 'Retained event' },
                { minute: 3, delta: 0, label: 'rounded zero' },
                { minute: 4, delta: 0.1, label: 'Retained positive' },
              ],
            },
          },
    ),
  };
  const node = sheet(frame),
    latest = node.querySelector('.well-latest');
  expect(latest?.textContent).toContain('“I adapted the advice.”');
  expect(latest?.textContent).toContain('Recorded alternative or condition: cook a pot');
  expect(latest?.textContent).toContain('trusts you less');
  expect(latest?.textContent).toContain('trusts you more');
  expect(latest?.textContent).toContain('Other events can also affect trust');
  expect(latest?.textContent).not.toContain('outside interval');
  expect(latest?.textContent).not.toContain('rounded zero');
  expect(sheet({ ...opening, cards: [order] }).querySelector('.well-latest')?.textContent).toContain(
    'No matching retained trust change is shown',
  );
  expect(
    sheet({
      ...opening,
      cards: [{ ...order, human: { state: 'cannot', says: 'That option is not available.' } }],
    }).textContent,
  ).not.toContain('Recorded alternative or condition');
});
it('labels assent as agreement until actual completion, never as started work', () => {
  const agreed = { ...order, human: { state: 'assent' as const } };
  expect(personOrderStatus(agreed, 'human', true)).toBe('House: agreed');
  expect(personOrderStatus({ ...order, human: { state: 'complied' } }, 'human', true)).toBe(
    'House: agreed under protest',
  );
  expect(
    personOrderStatus(
      { ...agreed, human: { state: 'done', settled: true, outcome: 'Day 1 · 05:12 · Finished building' } },
      'human',
      true,
    ),
  ).toBe('House: Finished building');
});
it('uses plain recognized forecast reasons and marks unknown reasons unavailable', () => {
  const curiosity = ['curiosity:unknown', 'curiosity:progress', 'curiosity:vary'].map(readableReason);
  expect(curiosity).toEqual([
    'interest in something unfamiliar',
    'interest in making progress',
    'interest in a different activity',
  ]);
  expect(readableReason('future:unrecognized')).toBe('a usable forecast reason is unavailable');
  expect(readableReason('need:unrecognized')).toBe('a usable forecast reason is unavailable');
});

it('keeps conditional forecasts outside the complete current archive and avoids empty-history certainty', () => {
  const before = JSON.stringify(colonyState(game));
  const prediction = game.predict({ personId: 'maryam', placeId: 'site' });
  expect(game.predict({ personId: 'maryam', placeId: 'site' })).toEqual(prediction);
  expect(JSON.stringify(colonyState(game))).toBe(before);
  const inspector = renderToStaticMarkup(
    createElement(Inspector, { personId: 'maryam', why: null, frame: opening, onClose: noop }),
  );
  expect(inspector).toContain('No retained trust change is shown.');
  expect(inspector).not.toContain('Nothing has moved it today.');
});

it('does not turn a settled assent without a work receipt into completed work', () => {
  const ended = { ...order, human: { state: 'assent' as const, settled: true } };
  expect(personOrderStatus(ended, 'human', true)).toBe('House: order ended');
  const status = renderToStaticMarkup(createElement(Status, { card: ended }));
  expect(status).toContain('order ended');
  expect(status).not.toContain('done');
});
