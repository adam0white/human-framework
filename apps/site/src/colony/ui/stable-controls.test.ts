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
    expect(node.querySelector('.card-chips')?.textContent).toBe('CdoneHagreed');
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
    expect(node.querySelector('.card-chips')?.textContent).toBe('CdoneHdone under protest');
  });

  it('leaves short landscape layouts outside the fixed phone reservation', () => {
    const stable = css.slice(css.indexOf('/* Stable phone order controls'));
    expect(stable).toContain('@media (max-width: 860px) and (min-height: 501px)');
    expect(css.slice(css.indexOf('/* Keep the landscape order column'))).toMatch(
      /\.center\s*\{[^}]*max-height: none/s,
    );
  });

  it('places Use with the suggestion heading, before optional explanatory text', () => {
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
    expect(node.querySelector('.nudge-head .btn')?.textContent).toBe('Use');
    expect(node.querySelector('.nudge-reason')?.textContent).toBe(nudge.reason);
    expect(node.querySelector('.nudge-timer')?.textContent).toContain('in 60 min');
  });

  it('reserves phone alert and suggestion rows and confines expanded suggestions to the order area', () => {
    const stable = css.slice(css.indexOf('/* Stable phone order controls'));
    expect(stable).toMatch(/\.order-alerts\s*\{[^}]*height: 64px/s);
    expect(stable).toMatch(/\.composer-tray\s*\{[^}]*padding-bottom: 44px/s);
    expect(stable).toMatch(/\.nudge-slot\s*\{[^}]*position: absolute/s);
    expect(stable).toMatch(/\.nudge-slot\[open\]\s*\{[^}]*inset: 0/s);
    expect(stable).toMatch(/\.composer-actions\s*\{[^}]*grid-row: 2/s);
  });
});
