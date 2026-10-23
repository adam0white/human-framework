// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { Prediction } from '../sim/human-side.ts';
import type { OrderCard } from '../sim/orders.ts';
import { SuggestionCard } from './parts.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const nudge = NUDGES.find((n) => n.id === 'roof-hands-1');
if (!nudge) throw new Error('Roof suggestion required');
const suggestion = nudge;
const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
const refusal: Prediction = {
  personId: 'samira',
  action: 'build',
  kind: 'willNot',
  text: 'Will refuse: I gather grain; that is my work.',
};
function props(prediction?: Prediction | null, cards: OrderCard[] = []) {
  return {
    nudge: suggestion,
    frame,
    cards,
    minute: suggestion.minute,
    queued: 0,
    active: false,
    prediction,
    onUse: vi.fn(),
    onSkip: vi.fn(),
  };
}
function render(prediction?: Prediction | null, cards: OrderCard[] = []) {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(createElement(SuggestionCard, props(prediction, cards)));
  return node;
}
function previousRefusal(): OrderCard {
  return {
    order: {
      id: 'prior',
      personId: 'samira',
      placeId: 'site',
      action: 'build',
      issuedAt: 400,
      rollKey: 0,
      rush: true,
      insist: false,
    },
    status: 'active',
    classic: { state: 'ok' },
    human: { state: 'willNot', label: 'I gather grain; that is my work.' },
  };
}
it('puts a current refusal before the proposal and offers insist with its warning', () => {
  const node = render(refusal);
  expect(node.querySelector('.nudge-proposal p')?.textContent).toContain(refusal.text);
  expect(node.querySelector('.nudge-use')?.textContent).toBe('Insist · may cost trust');
  expect(node.textContent).toContain('Insisting may cost trust. Samira can still refuse.');
  expect(node.textContent).not.toContain('Review order');
});
it('prepares insist rather than sending the unchanged refusing suggestion', async () => {
  const p = props(refusal);
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(() => root.render(createElement(SuggestionCard, p)));
  await act(() => container.querySelector<HTMLButtonElement>('.nudge-use')?.click());
  expect(p.onUse).toHaveBeenCalledExactlyOnceWith({ ...suggestion, prefill: { rush: true, insist: true } });
  await act(() => root.unmount());
});
it('uses the latest same-job refusal while checking, then accepts a fresh nonrefusing forecast', () => {
  const card = previousRefusal();
  const node = render(null, [card]);
  expect(node.querySelector('.nudge-proposal p')?.textContent).toContain('Last answer');
  expect(node.querySelector('.nudge-use')?.textContent).toBe('Insist · may cost trust');
  expect(
    render({ ...refusal, kind: 'assent', text: 'Likely yes' }, [card]).querySelector('.nudge-use')
      ?.textContent,
  ).toBe('Review order');
});
it('ignores forecasts for a different person or task and cancelled prior refusals', () => {
  const card = { ...previousRefusal(), status: 'cancelled' as const };
  expect(render({ ...refusal, personId: 'yusuf' }, [card]).querySelector('.nudge-use')?.textContent).toBe(
    'Review order',
  );
  expect(
    render({ ...refusal, action: 'gather-grain' }, [card]).querySelector('.nudge-use')?.textContent,
  ).toBe('Review order');
});
it('recognizes current work without a prior order, requiring the same work in both villages', async () => {
  const { suggestionChoice } = await import('./suggestion-choice.ts');
  const f = structuredClone(frame);
  for (const side of [f.human, f.classic]) {
    const person = side.find((p) => p.id === suggestion.order.personId);
    if (!person) throw Error('Missing worker');
    person.action = 'build';
    person.placeId = 'site';
    person.state = 'working';
  }
  expect(suggestionChoice(suggestion, f).underway).toBe(true);
  const classic = f.classic.find((p) => p.id === suggestion.order.personId);
  if (!classic) throw Error('Missing worker');
  classic.action = 'gather-grain';
  classic.placeId = 'field';
  expect(suggestionChoice(suggestion, f).underway).toBe(false);
});
