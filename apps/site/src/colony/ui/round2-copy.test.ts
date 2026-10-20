// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ColonyGame, type HurtNews, NUDGES } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { dayClock } from './contract.ts';
import { VillageStrip } from './PhoneStage.tsx';
import { HurtLine, inferredJob, SuggestionCard, sameJobCopy, suggestionNeedsReview } from './parts.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
const nudge = NUDGES.find((n) => n.order.placeId === 'forest');
if (!nudge) throw new Error('Forest suggestion required');
const suggestion = nudge;
function card(action: OrderCard['order']['action'], personId = suggestion.order.personId): OrderCard {
  return {
    order: {
      id: action,
      personId,
      placeId: 'forest',
      action,
      issuedAt: suggestion.minute + 1440,
      rollKey: 0,
      rush: false,
      insist: false,
    },
    status: 'done',
    classic: { state: 'ok' },
    human: { state: 'notNow', label: 'After supper.' },
  };
}
function markup(component: Parameters<typeof renderToStaticMarkup>[0]) {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(component);
  return node;
}
function suggestionMarkup(cards: OrderCard[]) {
  return markup(
    createElement(SuggestionCard, {
      nudge: suggestion,
      frame,
      cards,
      minute: suggestion.minute,
      queued: 0,
      active: false,
      onUse: vi.fn(),
      onSkip: vi.fn(),
    }),
  );
}

describe('Well round 2 task copy', () => {
  it('describes repeat work and infers the task from the selected village current world', () => {
    expect(sameJobCopy('gather-timber', 'yusuf')).toBe('Already gathering timber: keeps him at it');
    expect(sameJobCopy('cook', 'maryam')).toBe('Already cooking: keeps her at it');
    expect(sameJobCopy('build', 'samira')).toBe('Already building: keeps her at it');
    expect(inferredJob(frame, 'forest')).toBe('gather-timber');
    expect(inferredJob(frame, 'cedar')).toBe('fell-cedar');
    expect(inferredJob({ ...frame, humanWorld: { ...frame.humanWorld, cedarFelled: true } }, 'cedar')).toBe(
      'gather-timber',
    );
    expect(
      inferredJob({ ...frame, humanWorld: { ...frame.humanWorld, cedarFelled: true } }, 'cedar', 'classic'),
    ).toBe('fell-cedar');
  });

  it('matches refusal history to worker and inferred task, while retaining current risk', () => {
    expect(suggestionMarkup([card('cook')]).textContent).not.toContain('After supper.');
    const other = suggestion.order.personId === 'maryam' ? 'yusuf' : 'maryam';
    expect(suggestionMarkup([card('gather-timber', other)]).textContent).not.toContain('After supper.');
    const refusal = card('gather-timber');
    const node = suggestionMarkup([refusal]);
    expect(node.textContent).toContain(`Suggested at ${dayClock(suggestion.minute)}`);
    expect(node.textContent).toContain(`answered an order issued at ${dayClock(refusal.order.issuedAt)}`);
    expect(node.textContent).toContain('After supper.');
    expect(node.querySelector('.nudge-reason')?.textContent).toBe(suggestion.reason);
  });

  it('shows the active project deadline and food target after the storm, with the storm in history', () => {
    const storm = frame.timeline.markers.find((m) => m.kind === 'storm');
    if (storm?.until === undefined) throw new Error('Storm end required');
    const deadline = storm.until + 900;
    const next = {
      ...frame,
      minute: storm.until + 1,
      goals: frame.goals.map((g) => ({
        ...g,
        id: g.id === 'roof' ? ('project' as const) : g.id,
        deadlineMinute: deadline,
      })),
      humanWorld: { ...frame.humanWorld, project: { kind: 'storeroom' as const, stage: 1, stages: 6 } },
    };
    const node = markup(createElement(VillageStrip, { frame: next, side: 'human' }));
    expect(node.querySelector('.lk-chips')?.textContent).toContain(
      `Store-room by ${dayClock(deadline).replace('D', 'Day ')}`,
    );
    expect(node.querySelector('.lk-chips')?.textContent).toContain('Meals 0 / 12');
    expect(node.querySelector('.lk-chips')?.textContent).not.toContain('Storm');
    expect(node.querySelector('details')?.textContent).toContain('Storm passed');
  });

  it('offers an ordinary rest order for the specific injured person', async () => {
    const news = { side: 'human', personId: 'yusuf', minute: 300, how: 'hurt at work' } satisfies HurtNews;
    const onRest = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => root.render(createElement(HurtLine, { news: [news], onRest })));
    const button = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Send Yusuf home');
    expect(button).toBeDefined();
    await act(() => button?.click());
    expect(onRest).toHaveBeenCalledExactlyOnceWith(news);
    await act(() => root.unmount());
  });
});

describe('Well suggestion danger review', () => {
  const dawn = NUDGES[0];
  if (!dawn) throw new Error('Missing dawn suggestion');
  it('checks both villages for a dangerous beam and cedar job', () => {
    expect(suggestionNeedsReview(dawn, frame)).toBe(false);
    expect(
      suggestionNeedsReview(dawn, { ...frame, classicWorld: { ...frame.classicWorld, houseStage: 6 } }),
    ).toBe(true);
    const cedar = { ...dawn, order: { ...dawn.order, placeId: 'cedar' as const } };
    expect(
      suggestionNeedsReview(cedar, { ...frame, humanWorld: { ...frame.humanWorld, cedarFelled: true } }),
    ).toBe(true);
  });
  it('retains review for weather danger, forced work, rush and a safety promise', () => {
    expect(suggestionNeedsReview(dawn, { ...frame, weather: { ...frame.weather, kind: 'storm' } })).toBe(
      true,
    );
    expect(suggestionNeedsReview({ ...dawn, prefill: { rush: true } }, frame)).toBe(true);
    expect(suggestionNeedsReview({ ...dawn, prefill: { insist: true } }, frame)).toBe(true);
    expect(suggestionNeedsReview({ ...dawn, order: { ...dawn.order, appeal: 'safety' } }, frame)).toBe(true);
  });
});
