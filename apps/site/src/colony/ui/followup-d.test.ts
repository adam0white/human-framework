// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { NUDGES, SCENARIO_VERSION } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { Playback } from '../sim/playback.ts';
import { Composer, EMPTY_COMPOSER, SuggestionCard } from './parts.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Well follow-up d controls', () => {
  it('keeps commit and exit together outside open options, preserving the order on exit', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onWatch = vi.fn();
    const onChange = vi.fn();
    const onConfirm = vi.fn();
    await act(() =>
      root.render(
        createElement(Composer, {
          state: { ...EMPTY_COMPOSER, personId: 'yusuf', placeId: 'site', rush: true },
          frame: null,
          job: 'build',
          prediction: null,
          onChange,
          onWho: vi.fn(),
          onWhere: vi.fn(),
          onHover: vi.fn(),
          onConfirm,
          onInspect: vi.fn(),
          onWatch,
        }),
      ),
    );
    await act(() => host.querySelector<HTMLElement>('.order-options summary')?.click());
    expect(host.querySelector<HTMLDetailsElement>('.order-options')?.open).toBe(true);
    const watch = host.querySelector<HTMLButtonElement>('.composer-actions .watch-village');
    expect(watch?.textContent).toBe('Watch village');
    expect(watch?.closest('.order-options')).toBeNull();
    expect(host.querySelector('.composer-actions .btn-confirm')).not.toBeNull();
    await act(() => watch?.click());
    expect(onWatch).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    await act(() => root.unmount());
    host.remove();
  });

  it('puts the specific danger before Use and exposes Keep watching without clearing the card', async () => {
    const pb = new Playback(createFrameworkHumanSide);
    pb.handle({ type: 'init', seed: 20261003, scenarioVersion: SCENARIO_VERSION, gen: 1, autoPause: true });
    pb.handle({ type: 'resume' });
    pb.handle({ type: 'setSpeed', speed: 2 });
    pb.handle({ type: 'dismissNudge', id: 'dawn-site' });
    while (!pb.state().slowMo) pb.handle({ type: 'tick', dtMs: 250 });
    const nudge = pb.game?.visibleNudges().find((n) => n.id === 'cedar');
    expect(nudge).toBeDefined();
    if (!nudge || !pb.game) throw new Error('Missing cedar');
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onSkip = vi.fn();
    await act(() =>
      root.render(
        createElement(SuggestionCard, {
          nudge,
          minute: pb.game?.minute ?? 0,
          queued: 0,
          active: false,
          onUse: vi.fn(),
          onSkip,
          onKeepWatching: () => pb.handle({ type: 'resume' }),
        }),
      ),
    );
    const danger = host.querySelector('.nudge-reason');
    const use = host.querySelector('.nudge-use');
    expect(danger).not.toBeNull();
    expect(use).not.toBeNull();
    expect(
      Boolean(danger && use && danger.compareDocumentPosition(use) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    const keep = host.querySelector<HTMLButtonElement>('.nudge-keep-watching');
    expect(keep?.textContent).toBe('Keep watching');
    await act(() => keep?.click());
    expect(onSkip).not.toHaveBeenCalled();
    expect(host.querySelector('.nudge-reason')).not.toBeNull();
    expect(pb.state()).toMatchObject({ paused: false, slowMo: false, speed: 2 });
    expect(pb.game.visibleNudges().some((n) => n.id === nudge.id)).toBe(true);
    const minute = pb.game.minute;
    pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game.minute).toBe(minute + 4);
    pb.handle({ type: 'pause', cause: 'manual' });
    for (let i = 0; i < 20; i++) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game.minute).toBe(minute + 4);
    pb.handle({ type: 'resume' });
    while (pb.game.minute < nudge.until) pb.handle({ type: 'tick', dtMs: 250 });
    expect(pb.game.visibleNudges().some((n) => n.id === nudge.id)).toBe(false);
    expect(NUDGES.find((n) => n.id === nudge.id)?.until).toBe(nudge.until);
    await act(() => root.unmount());
    host.remove();
  });
});
