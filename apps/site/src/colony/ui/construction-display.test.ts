// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ColonyGame, DEFAULT_SEED } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import { colonyState } from '../sim/playtest.ts';
import { PersonSheet } from './Layout.tsx';

function details(game: ColonyGame, side: 'Human' | 'Classic'): string {
  const before = JSON.stringify(colonyState(game));
  const frame = game.frame({ buildingDetails: true, personId: 'yusuf' });
  const noop = () => {};
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(
    createElement(PersonSheet, {
      frame,
      id: 'yusuf',
      rush: false,
      insist: false,
      appeal: null,
      appealOpen: false,
      pending: null,
      asked: null,
      forecasts: {},
      outline: null,
      onBack: noop,
      onRush: noop,
      onInsist: noop,
      onAppeal: noop,
      onAppealOpen: noop,
      onAbout: noop,
      onPlace: noop,
      onHover: noop,
      onConfirm: noop,
      onCancelRisk: noop,
      onCancel: noop,
      onRepeat: noop,
    }),
  );
  expect(JSON.stringify(colonyState(game))).toBe(before);
  const row = [...node.querySelectorAll('.well-order-goals > p')].find((p) =>
    p.textContent?.startsWith(`${side} village:`),
  );
  if (!row?.textContent) throw new Error(`Missing ${side} building details`);
  return row.textContent;
}

it('does not call materials paid for actual default Human builders before their first resolution', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  game.advance(1);
  const view = game.frame({ buildingDetails: true }).humanWorld.construction;
  expect(view).toMatchObject({ stockTimber: 6, nextStage: 3, nextTimber: 2, payment: 'unpaid' });
  expect(view?.active.map((a) => a.personId)).toEqual(['tariq', 'yusuf']);
  const snapshot = game.human.snapshot() as { host: { buildPaid: boolean } };
  expect(snapshot.host.buildPaid).toBe(false);
  const text = details(game, 'Human');
  expect(text).toContain('Yusuf is working on stage 3.');
  expect(text).toContain('2 timber needed from stores');
  expect(text).not.toContain('materials already on site');
  expect(text).not.toContain('Materials for this stage are already on site');
  expect(game.humanWorld.resources.timber).toBe(6);
});

it('describes an actual Classic beam dependency wait without claiming the roof stages are taken', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  // Physical-world fixture: stage six is built; no Person or activity is fabricated.
  // This is a projection/display control, with no seed-only replay claim.
  game.classicWorld.house.stage = 6;
  game.classicWorld.resources.timber = 10;
  game.classic.apply({
    orderId: 'beam',
    personId: 'yusuf',
    action: 'raise-beam',
    placeId: 'site',
    rush: false,
    rollKey: 0,
  });
  for (let minute = 0; minute < 60 && !game.classic.unit('yusuf').task?.started; minute++)
    game.classic.step(minute);
  const view = game.frame({ buildingDetails: true }).classicWorld.construction;
  expect(game.classicWorld.house.stage).toBe(6);
  expect(view).toMatchObject({
    nextStage: null,
    payment: 'claimed',
    active: [{ personId: 'yusuf', stage: 7, action: 'raise-beam' }],
  });
  expect(view?.active.some((a) => a.stage >= 8)).toBe(false);
  const text = details(game, 'Classic');
  expect(text).toContain('No further stage can be claimed yet.');
  expect(text).not.toContain('All remaining stages are claimed');
  expect(text).not.toContain('Building is complete');
});
