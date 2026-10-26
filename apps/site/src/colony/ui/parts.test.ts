// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { Composer, EMPTY_COMPOSER, SuggestionCard } from './parts.tsx';

it('explains the first building and cooking controls before any answer exists', () => {
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  expect(frame.cards).toEqual([]);
  const noop = () => {};
  for (const [job, placeId, expected] of [
    ['build', 'site', 'not a finished roof'],
    ['cook', 'kitchen', 'separate twelve-meal storm reserve'],
  ] as const) {
    const node = document.createElement('div');
    node.innerHTML = renderToStaticMarkup(
      createElement(Composer, {
        state: { ...EMPTY_COMPOSER, personId: 'yusuf', placeId },
        frame,
        job,
        prediction: null,
        onChange: noop,
        onWho: noop,
        onWhere: noop,
        onHover: noop,
        onConfirm: noop,
        onInspect: noop,
      }),
    );
    expect(node.querySelector('.well-task-context')?.textContent).toContain(expected);
  }
  const nudge = NUDGES.find((n) => n.order.placeId === 'site');
  if (!nudge) throw Error('Expected initial House suggestion');
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(
    createElement(SuggestionCard, {
      nudge,
      frame,
      minute: frame.minute,
      queued: 0,
      active: false,
      onUse: noop,
      onSkip: noop,
    }),
  );
  expect(node.querySelector('.well-task-context')?.textContent).toContain('not a finished roof');
  expect(node.textContent).toContain('Continuing on their own is not guaranteed');
});
