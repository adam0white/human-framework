// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { OrderCard } from '../sim/orders.ts';
import type { Nudge } from './contract.ts';
import { CHIP_TEXT, OrderCardView, SuggestionCard } from './parts.tsx';

const css = readFileSync(resolve(import.meta.dirname, 'colony.css'), 'utf8');

describe('Well stable order controls', () => {
  it('distinguishes agreement, waiting and completion in visible words', () => {
    expect(CHIP_TEXT.pending).toBe('waiting');
    expect(CHIP_TEXT.ok).toBe('agreed');
    expect(CHIP_TEXT.assent).toBe('agreed');
    expect(CHIP_TEXT.done).toBe('done');
    expect(CHIP_TEXT.complied).toBe('agreed under protest');
  });

  it('shows Classic completion from its settled record rather than reporting agreement forever', () => {
    const card: OrderCard = {
      order: {
        id: 'o1',
        personId: 'yusuf',
        placeId: 'site',
        action: 'build',
        issuedAt: 0,
        rollKey: 0,
        rush: false,
        insist: false,
      },
      classic: { state: 'ok', label: 'done', settled: true },
      human: { state: 'assent', label: 'Fine.' },
      status: 'active',
    };
    const node = document.createElement('div');
    node.innerHTML = renderToStaticMarkup(createElement(OrderCardView, { card, onCancel: vi.fn() }));
    expect(node.querySelector('.card-chips')?.textContent).toBe('Classic · doneHuman · agreed');
  });

  it('shows completion under protest from the Human settled record', () => {
    const card: OrderCard = {
      order: {
        id: 'o1',
        personId: 'yusuf',
        placeId: 'site',
        action: 'build',
        issuedAt: 0,
        rollKey: 0,
        rush: false,
        insist: false,
      },
      classic: { state: 'ok', settled: true },
      human: { state: 'complied', label: 'If you insist.', settled: true },
      status: 'done',
    };
    const node = document.createElement('div');
    node.innerHTML = renderToStaticMarkup(createElement(OrderCardView, { card, onCancel: vi.fn() }));
    expect(node.querySelector('.card-chips')?.textContent).toBe('Classic · doneHuman · done under protest');
  });

  it('leaves short landscape layouts outside the fixed phone reservation', () => {
    const stable = css.slice(css.indexOf('/* Phone orders use normal flow.'));
    expect(stable).toContain('@media (max-width: 860px) and (min-height: 501px)');
    expect(css.slice(css.indexOf('/* Keep the landscape order column'))).toMatch(
      /\.center\s*\{[^}]*max-height: none/s,
    );
  });

  it('puts the proposal and trade-off in the same decision row as Use', () => {
    const nudge = {
      id: 'cedar',
      minute: 180,
      until: 240,
      order: { personId: 'idris', placeId: 'cedar' },
      text: 'Idris could take the big cedar: three timber at once.',
      reason: 'Fast timber, but the cedar can hurt whoever fells it.',
    } as Nudge;
    const node = document.createElement('div');
    node.innerHTML = renderToStaticMarkup(
      createElement(SuggestionCard, {
        nudge,
        minute: 180,
        queued: 0,
        active: false,
        onUse: vi.fn(),
        onSkip: vi.fn(),
      }),
    );
    expect(node.querySelector('.nudge-head .btn')?.textContent).toBe('Review order');
    expect(node.querySelector('.nudge-head .nudge-text')?.textContent).toBe(nudge.text);
    expect(node.querySelector('.nudge-head .nudge-order')?.textContent).toBe('Idris → Cedar');
    expect(node.querySelector('.nudge-head .nudge-reason')?.textContent).toBe(nudge.reason);
    expect(node.querySelector('.nudge-reason')?.textContent).toBe(nudge.reason);
    expect(node.querySelector('.nudge-timer')?.textContent).toContain('in 60 min');
  });

  it('warns that a suggested availability may have changed before preparation', () => {
    const node = document.createElement('div');
    node.innerHTML = renderToStaticMarkup(
      createElement(SuggestionCard, {
        nudge: {
          id: 'cook-forest',
          minute: 345,
          until: 420,
          order: { personId: 'maryam', placeId: 'forest' },
          text: 'Timber is short. Maryam is free until noon.',
        } as Nudge,
        minute: 391,
        queued: 0,
        active: false,
        onUse: vi.fn(),
        onSkip: vi.fn(),
      }),
    );
    expect(node.querySelector('.nudge-availability')?.textContent).toBe(
      'Availability may have changed. The person can still refuse or wait.',
    );
  });

  it('bounds the phone sheet and reserves the village above it', () => {
    const phone = css.slice(css.indexOf('/* Map-first phone'));
    expect(phone).toMatch(/\.stage\s*\{[^}]*grid-template-rows: 44px minmax\(0, 1fr\) auto/s);
    expect(phone).toMatch(/\.composer\s*\{[^}]*min-height: 154px/s);
    expect(phone).toMatch(/\.pane-canvas\s*\{[^}]*position: absolute/s);
    expect(phone).toMatch(/\.picker-chips\s*\{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/s);
    expect(phone).toMatch(/\.picker-chips\s*\{[^}]*overflow: visible/s);
    expect(phone).toMatch(/\.picker-chips button\s*\{[^}]*min-height: 44px/s);
  });
});
