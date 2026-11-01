// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ColonyGame } from '../sim/game.ts';
import { createFrameworkHumanSide } from '../sim/human.ts';
import type { OrderCard } from '../sim/orders.ts';
import { PersonSheet, placesFor, Status } from './Layout.tsx';
import { personOrderStatus } from './order-status.ts';

it('keeps a settled refusal distinct from completed work in the latest-order row', () => {
  const card: OrderCard = {
    order: {
      id: 'o1',
      personId: 'idris',
      placeId: 'well',
      action: 'draw-water',
      issuedAt: 0,
      rollKey: 0,
      rush: false,
      insist: false,
    },
    status: 'done',
    classic: { state: 'ok', settled: true },
    human: { state: 'willNot', settled: true, label: 'That is not my work.' },
  };
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(createElement(Status, { card }));
  expect(node.querySelector('.chip-ok')?.textContent).toBe('Classic ✓ done');
  expect(node.querySelector('.chip-willNot')?.textContent).toBe('Human ✗ will not');
});

it('renders a real Classic completion separately from Human agreement and settlement', () => {
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  game.issue({ personId: 'idris', placeId: 'well' });
  game.advance(1);
  const pending = game.frame().cards[0];
  if (!pending) throw new Error('Missing water order');
  expect(pending.order.action).toBe('draw-water');
  expect(pending.classic).toMatchObject({ state: 'ok' });
  expect(pending.classic.settled).not.toBe(true);
  const node = document.createElement('div');
  const render = (card: OrderCard) => {
    node.innerHTML = renderToStaticMarkup(createElement(Status, { card }));
  };
  render(pending);
  expect(node.querySelector('.chip-ok')?.textContent).toBe('Classic ✓ agreed');
  // Bounded ordinary simulation, not a replay matrix or an injected completion.
  for (let minute = 0; minute < 120 && !game.frame().cards[0]?.classic.settled; minute++) game.advance(1);
  const completed = game.frame().cards[0];
  if (!completed) throw new Error('Missing completed water order');
  expect(completed.classic).toMatchObject({ state: 'ok', settled: true, label: 'done' });
  expect(completed.classic.outcome).toContain('Finished drawing water');
  render(completed);
  expect(node.querySelector('.chip-ok')?.textContent).toBe('Classic ✓ done');
  expect(personOrderStatus(completed, 'classic')).toContain('Finished drawing water');
  // Generated Human view variants: agreement and settlement alone are not work receipts.
  for (const settled of [false, true]) {
    const agreed: OrderCard = { ...completed, human: { state: 'assent', settled } };
    render(agreed);
    expect(node.querySelector('.chip-assent')?.textContent).toBe(
      settled ? 'Human ✓ order ended' : 'Human ✓ agreed',
    );
    expect(personOrderStatus(agreed)).toBe(settled ? 'Well: order ended' : 'Well: agreed');
  }
});

it('names shuttering in the latest House order as well as the destination tile', () => {
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  frame.cards = [
    {
      order: {
        id: 'o1',
        personId: 'idris',
        placeId: 'site',
        action: 'shutter-house',
        issuedAt: 2100,
        rollKey: 2100,
        rush: false,
        insist: false,
      },
      status: 'active',
      classic: { state: 'ok' },
      human: { state: 'assent', says: 'Fine.' },
    },
  ];
  const noop = () => {};
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(
    createElement(PersonSheet, {
      frame,
      id: 'idris',
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
  expect(node.querySelector('.well-latest strong')?.textContent).toContain('shutter the house');
});

it('links the sent appeal to its answer and keeps current goal numbers beside the order', () => {
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  game.issue({ personId: 'idris', placeId: 'site', appeal: 'safety' });
  const frame = game.frame();
  const card = frame.cards[0];
  if (!card) throw new Error('Missing order');
  card.human.outcome = 'I did more building work. House 3/10.';
  const person = frame.human.find((p) => p.id === 'idris');
  if (!person) throw new Error('Missing Idris');
  person.label = 'Praying Fajr';
  const issued = frame.cards[0]?.order.issuedAt ?? 0;
  frame.minute = issued + 30;
  person.trust.history = [
    { minute: issued - 1, delta: -0.1, label: 'before this order' },
    { minute: issued, delta: 0.1, label: 'Your order went well' },
    { minute: issued + 1, delta: -0.1, label: 'You pushed too hard' },
    { minute: issued + 31, delta: -0.1, label: 'future event' },
  ];
  const noop = () => {};
  const node = document.createElement('div');
  const renderSheet = (pending: 'cedar' | null = null) => {
    node.innerHTML = renderToStaticMarkup(
      createElement(PersonSheet, {
        frame,
        id: 'idris',
        rush: false,
        insist: false,
        appeal: 'children',
        appealOpen: false,
        pending,
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
  };
  renderSheet();
  expect(node.querySelector('.well-person-body > p')?.textContent).toContain('dawn prayer');
  expect(node.querySelector('.well-person-body > p')?.textContent).not.toContain('Fajr');
  expect(node.querySelector('.well-latest')?.textContent).toContain('Sent appeal: you’ll be safer.');
  expect(node.querySelector('.well-latest')?.textContent).not.toContain('for the children');
  expect(node.querySelector('.well-latest')?.textContent).toContain('I did more building work. House 3/10.');
  expect(node.querySelector('.well-order-goals')?.textContent).toContain(
    `Human village: roof ${frame.humanWorld.houseStage} of 10 stages`,
  );
  expect(node.querySelector('.well-order-goals')?.textContent).toContain(
    `${frame.humanWorld.resources.meals} of 12 meals`,
  );
  expect(node.querySelector('.well-order-goals')?.textContent).toContain('the next stage is');
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain(
    'Other events can also affect trust.',
  );
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain('Idris trusts you more.');
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain('Idris trusts you less.');
  expect(node.querySelector('.well-trust-changes')?.textContent).not.toMatch(
    /before this order|future event/,
  );
  delete card.order.appeal;
  frame.humanWorld.project = { kind: 'storeroom', stage: 2, stages: 6 };
  frame.humanWorld.houseProgress = 0.999;
  const stock = frame.goals.find((g) => g.id === 'stock');
  if (!stock) throw new Error('Missing meal goal');
  stock.targetValue = 5;
  renderSheet();
  expect(node.querySelector('.well-latest')?.textContent).toContain('No appeal sent.');
  expect(node.querySelector('.well-order-goals')?.textContent).toContain('store-room 2 of 6 stages');
  expect(node.querySelector('.well-order-goals')?.textContent).toContain('the next stage is nearly done');
  expect(node.querySelector('.well-order-goals')?.textContent).toContain('of 5 meals');
  frame.humanWorld.project.stage = 6;
  renderSheet();
  const humanGoals = node.querySelector(
    '.well-order-goals [data-village=human] .well-building-progress',
  )?.textContent;
  expect(humanGoals).toBeTruthy();
  expect(humanGoals).not.toContain('the next stage is');
  card.order.action = 'cook';
  card.human.says = 'We have enough food stored. I’ll cook when it runs low.';
  renderSheet();
  expect(node.querySelector('.well-latest')?.textContent).toContain('We have enough food stored.');
  const food = node.querySelector('.well-food-explanation');
  expect(food?.textContent).toContain('Each completed pot adds to the same meal store');
  expect(food?.textContent).toContain('threshold rises from 6 to 12 at Day 2 16:00');
  expect(food?.textContent).toContain('not a capacity or a guarantee');
  expect(food?.textContent).toContain('People eat from this store.');
  expect(food?.textContent).toContain('A due meal duty can make cooking available earlier');
  expect(food?.textContent).toContain('ingredients and weather still matter, and people decide');
  expect(food?.textContent).not.toContain('separate');
  frame.village = 'early-warning';
  renderSheet();
  expect(node.querySelector('.well-food-explanation')?.textContent).toContain(
    'threshold rises from 6 to 12 at Day 2 12:00',
  );
  expect(node.querySelector('.well-food-explanation')?.textContent).not.toContain('Day 2 16:00');
  expect(node.querySelector('[aria-label="Order Idris to Kitchen"]')?.closest('details')).toBeNull();
  renderSheet('cedar');
  expect(node.querySelector('.well-risk .well-task-context')?.textContent).toContain('adds 3 timber');
  expect(node.querySelector('.well-risk')?.textContent).toContain('can injure whoever fells it');
  frame.humanWorld.cedarFelled = true;
  renderSheet('cedar');
  expect(node.querySelector('.well-risk')?.textContent).not.toContain('Completing the cedar felling');
});

it('offers Home shelter for the well-house resident without changing old Home meaning', async () => {
  const { homeOrderMeaning } = await import('./order-status.ts');
  const { inferredJob } = await import('./parts.tsx');
  const frame = new ColonyGame(20261003, createFrameworkHumanSide).frame();
  expect(placesFor('danyal', 8).at(-1)).toBe('home-idris');
  expect(inferredJob(frame, 'home-idris')).toBe('shelter');
  expect(inferredJob({ ...frame, rules: 7 }, 'home-idris')).toBe('eat');
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  game.issue({ personId: 'idris', placeId: 'home-idris' });
  const card = game.frame().cards[0];
  if (!card) throw Error('Missing Home order');
  expect(homeOrderMeaning(card)).toContain('until dawn (05:00)');
  expect(homeOrderMeaning({ ...card, order: { ...card.order, action: 'eat' } })).toContain('eat once');
});

it('keeps initial task context separate from later dated injury history and unknown roof delay', () => {
  const game = new ColonyGame(20261003, createFrameworkHumanSide);
  const frame = game.frame();
  const noop = () => {};
  const node = document.createElement('div');
  const render = () => {
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
  };
  expect(frame.cards).toEqual([]);
  render();
  expect(node.textContent).toContain('not a finished roof');
  const cooking = [...node.querySelectorAll('.well-task-context')].find((p) =>
    p.textContent?.includes('Each completed pot'),
  );
  expect(cooking?.textContent).toContain('same meal store');
  expect(cooking?.textContent).toContain('threshold rises from 6 to 12 at Day 2 16:00');
  expect(cooking?.closest('details')).toBeNull();
  expect(node.textContent).not.toContain('separate twelve-meal storm reserve');
  const details = node.querySelector('section.well-construction-inventory');
  expect(details?.closest('details')?.hasAttribute('open')).toBe(false);
  expect(node.querySelector('section.well-order-goals')?.closest('details')).toBeNull();
  expect(details?.querySelector('h3')?.textContent).toBe('Current stores and construction');
  expect(details?.textContent).toContain('The cause of the remaining delay is unknown');
  expect(node.querySelector('.well-places button')).not.toBeNull();
  game.issue({ personId: 'yusuf', placeId: 'site' });
  frame.cards = game.frame().cards;
  frame.minute = 20;
  const person = frame.human.find((p) => p.id === 'yusuf');
  if (!person) throw Error('Missing Yusuf');
  person.trust.history = [
    { minute: 10, delta: -0.01, label: 'I was hurt while following your order to build.' },
  ];
  person.needs = person.needs.filter((need) => need.id !== 'injury');
  render();
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain('Recorded at Day 1 05:10');
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain('Current injury reading: unknown');
  person.needs.push({ id: 'injury', label: 'Injury', value: 1 });
  render();
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain('They are unhurt');
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain(
    'does not establish healing or present pain',
  );
  expect(node.querySelector('.well-trust-changes')?.textContent).toContain(
    'I was hurt while following your order to build',
  );
});
