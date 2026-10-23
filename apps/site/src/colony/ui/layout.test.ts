// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { OrderCard } from '../sim/orders.ts';
import { Status } from './Layout.tsx';

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
  expect(node.querySelector('.chip-ok')?.textContent).toBe('C✓ done');
  expect(node.querySelector('.chip-willNot')?.textContent).toBe('H✗ will not');
});
