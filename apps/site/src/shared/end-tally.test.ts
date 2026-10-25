// @vitest-environment happy-dom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColonyGame } from '../colony/sim/game.ts';
import { createFrameworkHumanSide } from '../colony/sim/human.ts';
import { wellTally } from '../colony/ui/end-tally.ts';
import { GoalCard } from '../colony/ui/GoalCard.tsx';
import { sampleReport } from '../voice/sim/fixtures.ts';
import { voiceTally } from '../voice/ui/end-tally.ts';
import { Report } from '../voice/ui/Report.tsx';
import { newGame } from '../watch/sim/night.ts';
import { buildFrame } from '../watch/sim/view.ts';
import { watchTally } from '../watch/ui/end-tally.ts';
import { ClosedPage, FallenPage } from '../watch/ui/pages.tsx';
import type { WatchActions } from '../watch/ui/useWatch.ts';
import { TallySetting } from './EndTally.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Preference() {
  const [on, setOn] = useState(false);
  return createElement(TallySetting, { on, onChange: setOn, label: 'Keep a tally' });
}

it('starts the UI preference off and changes only the presentation when checked', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(() => root.render(createElement(Preference)));
  const checkbox = container.querySelector<HTMLInputElement>('input');
  expect(checkbox?.checked).toBe(false);
  await act(() => checkbox?.click());
  expect(checkbox?.checked).toBe(true);
  await act(() => root.unmount());
});

describe('end reckoning from existing reports', () => {
  it('counts a closed Watch volume once and shows the tally only on the terminal page when requested', () => {
    const frame = buildFrame(newGame(4242), 0, false);
    frame.year = 3;
    frame.grain = 4.75;
    frame.volume.end = 'The village cannot stay.';
    frame.shelf = [frame.volume];
    const before = JSON.stringify(frame);
    expect(watchTally(frame)).toEqual([
      '7 marks — one per full year, closed volume and sack left',
      'Full years: 2 · Closed volumes: 1 · Sacks left: 4',
    ]);
    const actions = {} as WatchActions;
    expect(renderToStaticMarkup(createElement(FallenPage, { frame, actions, seed: 4242 }))).toContain(
      'The chronicle’s tally',
    );
    expect(
      renderToStaticMarkup(createElement(FallenPage, { frame, actions, seed: 4242, tally: true })),
    ).toContain('7 marks');
    expect(renderToStaticMarkup(createElement(ClosedPage, { frame, actions }))).not.toContain('marks');
    expect(JSON.stringify(frame)).toBe(before);
  });

  it('keeps Well scenario choices and their default, with several voices and separate village totals', () => {
    const game = new ColonyGame(20261003, createFrameworkHumanSide);
    const frame = game.frame();
    const markup = renderToStaticMarkup(
      createElement(GoalCard, {
        frame,
        text: '',
        autoPause: false,
        onAutoPause: () => {},
        onPlay: () => {},
        onVillage: () => {},
      }),
    );
    const container = document.createElement('div');
    container.innerHTML = markup;
    const choices = container.querySelectorAll<HTMLInputElement>('input[name="village"]');
    expect(choices.length).toBe(2);
    expect(choices[0]?.checked).toBe(true);
    expect(choices[1]?.checked).toBe(false);
    expect(container.textContent).toContain('Maryam:');
    expect(container.textContent).toContain('Yusuf:');
    expect(container.textContent).toContain('Tariq:');
    expect(container.textContent).not.toContain('Early warning:');
    const summary = {
      goals: frame.goals.map((goal) => ({
        ...goal,
        classic: { ...goal.classic, status: 'met' as const },
        human: { ...goal.human, status: 'failed' as const },
      })),
      scoreboard: {
        ...frame.scoreboard,
        classic: { ...frame.scoreboard.classic, meals: 4 },
        human: { ...frame.scoreboard.human, meals: 2 },
      },
    };
    const before = JSON.stringify(summary);
    expect(wellTally(summary)).toEqual([
      'Classic: 7 marks — 3 goals met + 4 meals left; one mark each',
      'Human: 2 marks — 0 goals met + 2 meals left; one mark each',
    ]);
    expect(JSON.stringify(summary)).toBe(before);
  });

  it('keeps Voice’s month report unscored by default and counts the record, excluding unspoken lines', () => {
    const words = [
      {
        beat: 'a',
        kind: 'care' as const,
        day: 1,
        minute: 0,
        clock: '05:00',
        words: 'I am here.',
        answer: 'Thank you.',
      },
      {
        beat: 'b',
        kind: 'question' as const,
        day: 1,
        minute: 1,
        clock: '05:01',
        words: 'A walk?',
        answer: '',
        said: false as const,
      },
    ];
    const before = JSON.stringify(sampleReport);
    const lines = voiceTally(sampleReport, words);
    expect(lines[0]).toContain(`${sampleReport.rows.length + 3} marks`);
    expect(lines[1]).toContain('Suggestion kinds: 2 · Care or question lines spoken: 1');
    const props = {
      view: sampleReport,
      sceneWords: words,
      onKeepListening: () => {},
      onReplay: () => {},
      onNewTown: () => {},
    };
    expect(renderToStaticMarkup(createElement(Report, props))).not.toContain('The notebook’s tally');
    expect(renderToStaticMarkup(createElement(Report, { ...props, tally: true }))).toContain(
      'The notebook’s tally',
    );
    expect(JSON.stringify(sampleReport)).toBe(before);
  });
});
