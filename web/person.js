import {
  createShowcase,
  chooseShowcase,
  getShowcaseView,
  replayWithout
} from '../src/games/three-moments.js';

const byId = id => document.getElementById(id);
const els = {
  carry: byId('carry'),
  carryPanel: byId('carry-panel'),
  choices: byId('choices'),
  choicePanel: byId('choice-panel'),
  comparisonPanel: byId('comparison-panel'),
  day: byId('day'),
  ending: byId('ending'),
  intro: document.querySelector('.intro'),
  known: byId('known'),
  knownPanel: byId('known-panel'),
  lastOutcomePanel: byId('last-outcome-panel'),
  moment: byId('moment'),
  notice: byId('notice'),
  progress: byId('progress'),
  situation: byId('situation'),
  summary: byId('summary'),
  title: byId('scene-title')
};

let session = createShowcase();
let wasComplete = false;

function setText(id, value = '') {
  byId(id).textContent = value;
}

function showNotice(message = '') {
  els.notice.textContent = message;
  els.notice.hidden = !message;
}

function renderFacts(target, facts = []) {
  target.replaceChildren();
  for (const fact of facts) {
    const row = document.createElement('div');
    row.className = 'fact';
    const label = document.createElement('dt');
    const value = document.createElement('dd');
    label.textContent = fact.label;
    value.textContent = fact.text;
    row.append(label, value);
    target.append(row);
  }
}

function renderChoice(choice, index) {
  const button = document.createElement('button');
  const label = document.createElement('span');
  const detail = document.createElement('span');
  const detailId = `choice-detail-${index}`;

  button.type = 'button';
  button.className = 'choice';
  button.dataset.action = choice.id;
  button.setAttribute('aria-describedby', detailId);
  label.className = 'choice-label';
  label.textContent = choice.label;
  detail.id = detailId;
  detail.className = 'choice-detail';
  detail.textContent = choice.detail;
  button.append(label, detail);

  if (choice.recommended) {
    const baseline = document.createElement('span');
    baseline.className = 'baseline';
    baseline.textContent = 'Model suggestion';
    button.append(baseline);
  }
  return button;
}

function render() {
  const view = getShowcaseView(session);
  const known = Array.isArray(view.known) ? view.known : [];
  const carry = Array.isArray(view.carry) ? view.carry : [];
  const summary = Array.isArray(view.summary) ? view.summary : [];
  const choices = Array.isArray(view.choices) ? view.choices : [];

  els.progress.textContent = view.progressLabel;
  els.day.textContent = /^day\b/i.test(String(view.day)) ? view.day : `Day ${view.day}`;
  els.title.textContent = view.title;
  els.situation.textContent = view.situation;
  els.intro.classList.toggle('compact', view.step > 0 || view.complete);

  renderFacts(els.known, known);
  renderFacts(els.carry, carry);
  els.knownPanel.hidden = known.length === 0;
  els.carryPanel.hidden = carry.length === 0;

  els.lastOutcomePanel.hidden = !view.lastOutcome;
  setText('last-outcome-title', view.lastOutcome?.title);
  setText('last-outcome-text', view.lastOutcome?.text);

  els.choices.replaceChildren(...choices.map(renderChoice));
  els.choicePanel.hidden = view.complete || choices.length === 0;
  els.moment.hidden = view.complete;
  els.ending.hidden = !view.complete;

  for (const button of document.querySelectorAll('[data-replay]')) {
    button.disabled = !view.replayFactors.includes(button.dataset.replay);
  }

  if (view.complete) {
    renderFacts(els.summary, [...carry, ...summary]);
    els.comparisonPanel.hidden = !view.comparison;
    setText('comparison-title', view.comparison?.title);
    setText('comparison-text', view.comparison?.text);
    if (!wasComplete) {
      requestAnimationFrame(() => els.ending.focus({preventScroll: true}));
    }
  }
  wasComplete = view.complete;
  return view;
}

function focusScene() {
  requestAnimationFrame(() => {
    els.title.focus({preventScroll: true});
    els.moment.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  });
}

els.choices.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  showNotice();
  try {
    session = chooseShowcase(session, button.dataset.action);
    const view = render();
    if (!view.complete) focusScene();
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'That choice could not be applied.');
  }
});

document.querySelector('.replay-buttons').addEventListener('click', event => {
  const button = event.target.closest('button[data-replay]');
  if (!button) return;
  showNotice();
  try {
    session = replayWithout(session, button.dataset.replay);
    wasComplete = false;
    render();
    byId('scene-title').focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'smooth'});
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'That replay could not be started.');
  }
});

byId('restart').addEventListener('click', () => {
  session = createShowcase();
  wasComplete = false;
  showNotice();
  render();
  window.scrollTo({top: 0, behavior: 'smooth'});
});

render();
