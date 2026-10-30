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
  const row = [...node.querySelectorAll('.well-order-goals .well-building-progress')].find((p) =>
    p.textContent?.startsWith(`${side} village:`),
  );
  if (!row?.textContent) throw new Error(`Missing ${side} building details`);
  expect(row.closest('details:not([open])')).toBeNull();
  const body = row.closest('.well-building-side');
  expect(row.textContent).not.toContain('meals');
  expect(body?.querySelector('.well-building-meals')).not.toBeNull();
  return body?.textContent ?? '';
}

it('does not claim Human construction or paid materials before an actual start', () => {
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  game.advance(1);
  const view = game.frame({ buildingDetails: true }).humanWorld.construction;
  expect(view).toMatchObject({ stockTimber: 6, nextStage: 3, nextTimber: 2, payment: 'unpaid' });
  expect(view?.active).toEqual([]);
  const snapshot = game.human.snapshot() as { host: { buildPaid: boolean } };
  expect(snapshot.host.buildPaid).toBe(false);
  const text = details(game, 'Human');
  expect(text).not.toContain('Yusuf is working on stage 3.');
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

it('shows current materials and actual selected-stage work in the first About inspector', async () => {
  const { Inspector } = await import('./Inspector.tsx');
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  const frame = game.frame({ buildingDetails: true, personId: 'yusuf' });
  const before = JSON.stringify(colonyState(game));
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(
    createElement(Inspector, { personId: 'yusuf', frame, why: null, onClose: () => {} }),
  );
  const human = node.querySelector('[aria-label="Human person"]');
  expect(human?.textContent).toContain('Timber in store: 6');
  expect(human?.textContent).toContain('2 timber needed from stores');
  expect(human?.textContent).not.toContain('Yusuf is working on stage');
  expect(JSON.stringify(colonyState(game))).toBe(before);
  const other = game.frame({ buildingDetails: true, personId: 'maryam' });
  node.innerHTML = renderToStaticMarkup(
    createElement(Inspector, { personId: 'yusuf', frame: other, why: null, onClose: () => {} }),
  );
  expect(node.textContent).not.toContain('minutes of Yusuf’s work');
  expect(node.textContent).not.toContain('Building is not currently offered to this person.');
});

it('explains remaining stage prices and an unfinished roof without promising another order will finish it', async () => {
  const { ConstructionRequirements, RoofRisk } = await import('./Construction.tsx');
  const { WARNING_AT } = await import('../sim/world-types.ts');
  const game = new ColonyGame(DEFAULT_SEED, createFrameworkHumanSide);
  const frame = game.frame({ buildingDetails: true, personId: 'yusuf' });
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(createElement(ConstructionRequirements, { world: frame.humanWorld }));
  const rows = [...node.querySelectorAll('tbody tr')].map((r) => r.textContent);
  expect(rows).toContain('Stage 7 · beam2');
  expect(rows).toContain('Stage 85');
  expect([...node.querySelectorAll('thead th')].map((cell) => cell.textContent)).toEqual(['Stage', 'Timber']);
  expect(node.textContent).not.toContain('minutes');
  node.innerHTML = renderToStaticMarkup(
    createElement(RoofRisk, { world: frame.humanWorld, minute: WARNING_AT, side: 'Human' }),
  );
  expect(node.textContent).toContain('Human roof goal at risk');
  expect(node.textContent).toContain('Due by 19:00 on day 2');
  expect(
    renderToStaticMarkup(
      createElement(RoofRisk, { world: frame.humanWorld, minute: WARNING_AT - 1, side: 'Human' }),
    ),
  ).toBe('');
});
