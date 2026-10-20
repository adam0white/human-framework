// @vitest-environment happy-dom
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ColonyGame, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { needDescription, trustDescription } from './descriptions.ts';
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
    const context = el.querySelector('details');
    expect(context?.open).toBe(false);
    expect(context?.textContent).toContain('may say no');
    expect(context?.textContent).toContain('Your own orders can');
    expect(el.querySelector('.btn-play')?.nextElementSibling).toBe(context);
    expect(el.querySelector('.goal-card-goal')?.textContent).toContain('Roof the house, store 12 meals');
    const summary = context?.querySelector('summary');
    if (summary) context?.replaceWith(summary);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const text: string[] = [];
    while (walker.nextNode()) text.push(walker.currentNode.textContent ?? '');
    const words = text.join(' ').trim().split(/\s+/).length;
    expect(words).toBe(34);
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
    expect(el.querySelector<HTMLSelectElement>('[aria-label="Villager"]')?.value).toBe('maryam');
    expect(el.querySelector<HTMLSelectElement>('[aria-label="Place"]')?.value).toBe('site');
    expect(el.querySelector('.composer-line')?.textContent).toContain('Maryam → House');
    expect(el.querySelector('.predict')?.textContent).toContain('the others would go unfed');
    const confirm = el.querySelector<HTMLButtonElement>('.btn-confirm');
    expect(confirm?.disabled).toBe(false);
    expect(confirm?.closest('details')).toBeNull();
    expect(el.querySelector('.order-options')?.textContent).toContain('faster, hungrier');
    expect(el.querySelector('.order-options')?.textContent).toContain('may cost trust');
  });

  it('teaches suggestions at arrival and makes Use preparation explicit', () => {
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
      'Use fills an order. Confirm sends it. You can skip or choose your own.',
    );
    const source = readFileSync(sourcePath('App.tsx'), 'utf8');
    expect(source).toContain('<details');
    expect(source).toContain('Use prepares; Confirm sends.');
    const css = readFileSync(sourcePath('colony.css'), 'utf8');
    for (const match of css.matchAll(/\.nudge-slot\s*\{([^}]+)\}/g)) {
      expect(match[1]).not.toContain('absolute');
      expect(match[1]).not.toContain('fixed');
    }
  });

  it('describes mood, trust and human needs without numbers, bars or prayer percentages', () => {
    const stats = render(createElement(PaneStats, { frame, side: 'human' }));
    expect(stats.textContent).not.toContain('%');
    expect(stats.textContent).not.toContain('Prayers');
    expect(stats.textContent).toContain('Getting acquainted');
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
    expect(human?.textContent).toContain('Unhurt');
    expect(human?.textContent).not.toContain('Little pain');
    expect(needDescription('injury', 0.9)).toBe('Slightly hurt');
    expect(needDescription('sleep', 0.2)).toBe('Exhausted');
    expect(needDescription('sleep', 0.5)).toBe('Tired');
    expect(needDescription('sleep', 0.9)).toBe('Rested');
    expect(trustDescription(0.2)).toBe('Wary of you');
  });
});
