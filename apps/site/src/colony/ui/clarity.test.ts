// @vitest-environment happy-dom
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { activityDescription, needDescription, trustDescription } from './descriptions.ts';
import { GoalCard } from './GoalCard.tsx';
import { Inspector } from './Inspector.tsx';
import { PeopleRows } from './PeopleRows.tsx';
import { Composer, EMPTY_COMPOSER, PaneStats, SuggestionCard } from './parts.tsx';

const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
function render(component: Parameters<typeof renderToStaticMarkup>[0]) {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(component);
  return el;
}

function sourcePath(name: string) {
  const candidates = [`apps/site/src/colony/ui/${name}`, `src/colony/ui/${name}`];
  const file = candidates.map((p) => resolve(process.cwd(), p)).find(existsSync);
  if (!file) throw new Error(`Missing ${name}`);
  return file;
}

describe('Well first-minute clarity', () => {
  it('puts the goal and Play before optional context with fewer than forty mandatory words', () => {
    const el = render(
      createElement(GoalCard, { frame, text: '', autoPause: true, onAutoPause: vi.fn(), onPlay: vi.fn() }),
    );
    const context = el.querySelector('[popover]');
    expect(context?.getAttribute('popover')).toBe('auto');
    expect(context?.textContent).toContain('may say no');
    expect(context?.textContent).toContain('Your own orders can');
    expect(el.querySelector('.btn-play')?.nextElementSibling).toBe(context?.parentElement);
    expect(el.querySelector('.goal-card-goal')?.textContent).toContain('Roof the house, store 12 meals');
    context?.remove();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const text: string[] = [];
    while (walker.nextNode()) text.push(walker.currentNode.textContent ?? '');
    const words = text.join(' ').trim().split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(40);
  });

  it('keeps the selected villager, place, predicted reply and Confirm outside optional order controls', () => {
    const el = render(
      createElement(Composer, {
        state: { ...EMPTY_COMPOSER, personId: 'maryam', placeId: 'site' },
        frame,
        job: 'build',
        prediction: {
          personId: 'maryam',
          action: 'build',
          kind: 'willNot',
          text: 'Will refuse: the others would go unfed',
        },
        onChange: vi.fn(),
        onWho: vi.fn(),
        onWhere: vi.fn(),
        onHover: vi.fn(),
        onConfirm: vi.fn(),
        onInspect: vi.fn(),
      }),
    );
    expect(el.querySelector('.worker-picker summary')?.textContent).toContain('Maryam');
    expect(el.querySelector('.destination-picker summary')?.textContent).toContain('House');
    expect(el.querySelector('.composer-line')?.textContent).toContain('Maryam → House');
    expect(el.querySelector('.predict')?.textContent).toContain('the others would go unfed');
    expect(el.querySelector('.predict')?.textContent).toContain('Ask again after she cooks the meal');
    const confirm = el.querySelector<HTMLButtonElement>('.btn-confirm');
    expect(confirm?.disabled).toBe(false);
    expect(confirm?.closest('details')).toBeNull();
    expect(el.querySelector('.order-options')?.textContent).toContain('faster, hungrier');
    expect(el.querySelector('.order-options')?.textContent).toContain('may cost trust');
  });

  it('teaches suggestions at arrival and makes danger review explicit', () => {
    const nudge = NUDGES[0];
    if (!nudge) throw new Error('missing suggestion');
    const el = render(
      createElement(SuggestionCard, {
        nudge,
        minute: nudge.minute,
        queued: 0,
        active: false,
        onUse: vi.fn(),
        onSkip: vi.fn(),
      }),
    );
    expect(el.querySelector('.nudge-help')?.textContent).toBe(
      'Review the order, then Confirm sends it. You can skip or choose your own.',
    );
    const css = readFileSync(sourcePath('colony.css'), 'utf8');
    for (const match of css.matchAll(/\.nudge-slot\s*\{([^}]+)\}/g)) {
      expect(match[1]).not.toContain('fixed');
    }
  });

  it('describes mood, trust and human needs without numbers, bars or prayer percentages', () => {
    const stats = render(createElement(PaneStats, { frame, side: 'human' }));
    expect(stats.textContent).not.toContain('%');
    expect(stats.textContent).not.toContain('Prayers');
    expect(stats.textContent).toContain('They are getting to know you.');
    const people = render(
      createElement(PeopleRows, { frame, side: 'human', selectedId: null, onSelect: vi.fn() }),
    );
    expect(people.querySelectorAll('.prow-bar')).toHaveLength(0);
    expect(people.textContent).not.toContain('%');
    const inspector = render(
      createElement(Inspector, { personId: 'maryam', why: null, frame, onClose: vi.fn() }),
    );
    const human = inspector.querySelector('.inspector-human');
    expect(human?.querySelectorAll('.need-track, .trust-track, .need-n')).toHaveLength(0);
    expect(human?.textContent).not.toMatch(/\d|%/);
    const injury = frame.human.find((p) => p.id === 'maryam')?.needs.find((n) => n.id === 'injury');
    expect(injury?.value).toBe(1);
    expect(human?.textContent).toContain('They are unhurt.');
    expect(human?.textContent).not.toContain('Little pain');
    expect(needDescription('injury', 0.9)).toBe('They are slightly hurt.');
    expect(needDescription('sleep', 0.2)).toBe('They are exhausted.');
    expect(needDescription('sleep', 0.5)).toBe('They are tired.');
    expect(needDescription('sleep', 0.9)).toBe('They are rested.');
    expect(trustDescription(0.2)).toBe('They are wary of you.');
    expect(activityDescription('Walking to Kitchen')).toBe('They are walking to the kitchen.');
    expect(activityDescription('Carried by Yusuf')).toBe('They are being carried by Yusuf.');
    expect(activityDescription('Idle')).toBe('They are waiting.');
  });
});
