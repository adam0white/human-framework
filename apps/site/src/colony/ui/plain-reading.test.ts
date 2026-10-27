// @vitest-environment happy-dom
import { voiceOf } from '@adam0white/human-framework';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide, type FrameworkHumanSide } from '../sim/human.ts';
import { fw } from '../sim/human-cast.ts';
import { memoryText, trustOf } from '../sim/human-view.ts';
import { activityLabel } from './descriptions.ts';
import { cardEnd } from './end-report.ts';
import { Inspector, TrustMeter } from './Inspector.tsx';
import { OrderCardView } from './parts.tsx';

function render(element: Parameters<typeof renderToStaticMarkup>[0]) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(element);
  return host;
}
afterEach(() => history.replaceState(null, '', '/'));

it('names the replacing order in words while retaining both order ids', () => {
  const game = new ColonyGame(7, createFrameworkHumanSide);
  game.issue({ personId: 'yusuf', placeId: 'site' });
  game.issue({ personId: 'yusuf', placeId: 'forest' });
  game.advance(2);
  const card = game.book.cards[0];
  if (!card) throw Error('Missing order');
  const original = structuredClone(card);
  const host = render(createElement(OrderCardView, { card, onCancel: vi.fn() }));
  expect(host.textContent).toContain('replaced by your next order');
  expect(host.textContent).not.toContain(card.replacedBy);
  expect(host.querySelector('.card-chips')?.textContent).toContain('Classic');
  expect(host.querySelector('.card-chips')?.textContent).toContain('Human');
  expect(cardEnd(card)).toBe('replaced by your next order');
  expect(card).toEqual(original);
});

it('uses one full stop and an infinitive in the displayed trust loss', () => {
  const game = new ColonyGame(7, createFrameworkHumanSide);
  const person = (game.human as FrameworkHumanSide).person('yusuf');
  const voice = voiceOf(person, 'player');
  if (!voice) throw Error('Missing player voice');
  voice.history = [{ at: fw(120), delta: -0.1, reason: 'went-badly', action: 'gather-grain' }];
  const trust = trustOf(person);
  expect(trust.history[0]?.label).toBe('Your order to gather grain went badly.');
  const host = render(createElement(TrustMeter, { trust, name: 'Yusuf' }));
  expect(host.textContent).toContain('Your order to gather grain went badly.');
  expect(host.textContent).not.toContain('..');
});

it('repairs first-person memory prose without changing its source', () => {
  const source =
    'Last time you sent me: i went to gather timber in a sudden storm. I came back hurt and without timber. Not again.';
  expect(memoryText(source)).toBe(
    'Last time you sent me for timber, a storm came. I came back hurt, with no timber. Not again.',
  );
  expect(memoryText('I remember: i ate a meal.')).toBe('I remember: I ate a meal.');
});

it('opens the decision explanation from the inline i control', () => {
  const frame = new ColonyGame(7, createFrameworkHumanSide).frame();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(createElement(Inspector, { personId: 'maryam', frame, why: null, onClose: vi.fn() })),
  );
  const button = host.querySelector<HTMLButtonElement>('[aria-label="Why this decision"]');
  expect(button?.getAttribute('aria-expanded')).toBe('false');
  act(() => button?.click());
  expect(host.querySelector('.why')).not.toBeNull();
  act(() => root.unmount());
  host.remove();
});

it('uses a status label beside a named person', () => {
  expect(activityLabel('Idle')).toBe('Waiting.');
  expect(activityLabel('Carried by Yusuf')).toBe('Being carried by Yusuf.');
});

it('uses one named person in need and trust descriptions', async () => {
  const { namedDescription, needDescription, trustDescription } = await import('./descriptions.ts');
  expect(namedDescription(needDescription('food', 0.9), 'Maryam')).toBe('Maryam has eaten.');
  expect(namedDescription(needDescription('sleep', 0.4), 'Yusuf')).toBe('Yusuf is tired.');
  expect(namedDescription(trustDescription(0.7), 'Maryam')).toBe('Maryam usually trusts you.');
});
