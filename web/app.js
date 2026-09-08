import { createSimulation, step, getView, rankActions, exportReplay, replay, ENGINE_VERSION } from '../src/core/index.js';
import { scenarios, getScenario } from '../src/scenarios/index.js';
import { actionGuidance, decisionGuidance } from './guidance.js';

const $ = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = (value, digits = 1) => Number.isFinite(value) ? Number(value.toFixed(digits)).toLocaleString('en-US') : '—';
const percent = (value) => Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—';
const displayName = (value) => String(value ?? '').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
const policyName = policy => ({full:'Full action loop',baseline:'Simple utility baseline','planned-simple':'Planned simple recovery'})[policy] ?? policy;
const signed = (value) => `${value > 0 ? '+' : ''}${number(value, 2)}`;
const modules = [
  ['body', 'Body coupling', 'Scoring and performance; capacity limits remain'],
  ['beliefs', 'Belief learning', 'Hazard updates and inspection value'],
  ['commitments', 'Promise weighting', 'Weight a recognized promise'],
  ['learning', 'Practice learning', 'Practice updates and learning value'],
  ['relationships', 'Relationships', 'Assistance and partner trust'],
];
const phases = [
  ['observe', 'Observe'], ['understand', 'Understand'], ['weigh', 'Weigh'], ['choose', 'Choose'],
  ['attempt', 'Attempt'], ['resolve', 'Resolve'], ['learn', 'Learn'],
];
const scenarioNotes = {
  courier: 'An uncertain crossing',
  workshop: 'Practice under pressure',
  commons: 'A shared, scarce resource',
  solo: 'One person. No social effects.',
};
const actionIcons = { work: '↗', rest: '◡', eat: '◒', observe: '◎', help: '⇄' };

let state;
let actorId;
let researcher = false;
let running = false;
let animationToken = 0;
let lastAnimatedRound = -1;

const isArchived = () => Boolean(state && state.version !== ENGINE_VERSION);
const archiveLabel = () => `Archived ${String(state.version).split('.').slice(0, 2).join('.')} rules`;
function restartScenario() {
  if (!isArchived()) return state.scenario;
  return getScenario(scenarios.some((scenario) => scenario.id === state.scenario.id) ? state.scenario.id : scenarios[0].id);
}
function requestExecutionMarkup(decision) {
  const record = decisionGuidance(decision);
  return `<dl class="request-execution"><div><dt>Requested</dt><dd>${escapeHTML(record.requested)}</dd></div><div><dt>Executed</dt><dd>${escapeHTML(record.executed)}</dd></div></dl>`;
}

function showMessage(message, error = false) {
  const element = $('app-message');
  element.textContent = message;
  element.className = `app-message${error ? ' error' : ''}`;
  element.hidden = false;
}

function clearMessage() {
  $('app-message').hidden = true;
}

function getOptions() {
  const seed = Number($('seed-input').value);
  if (!$('seed-input').value.trim() || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    throw new Error('Choose a whole-number seed from 0 to 4,294,967,295.');
  }
  return {
    seed,
    policy: $('policy-input').value,
    modules: Object.fromEntries(modules.map(([id]) => [id, $(`module-${id}`).checked])),
  };
}

function applyOptionsToForm(options) {
  $('seed-input').value = options.seed;
  $('policy-input').value = options.policy;
  for (const [id] of modules) $(`module-${id}`).checked = options.modules[id];
  updateSettingsNote();
}

function updateSettingsNote() {
  const count = modules.filter(([id]) => $(`module-${id}`).checked).length;
  $('module-count').textContent = `${count} / ${modules.length}`;
  if (!state) return;
  let dirty = true;
  try { dirty = JSON.stringify(getOptions()) !== JSON.stringify(state.options); } catch { /* Explain pending invalid settings without changing the run. */ }
  const note = $('settings-note');
  note.classList.toggle('dirty', dirty);
  note.textContent = dirty
    ? 'Settings changed. Start a new run to apply them; the current run keeps its recorded settings.'
    : `Seed ${state.options.seed} · ${policyName(state.options.policy)} · ${count === modules.length ? 'All components enabled' : `${count} of ${modules.length} components enabled`}`;
}

function stopAutoplay() {
  running = false;
  animationToken += 1;
}

function newRun(scenario, options) {
  const next = createSimulation(scenario, options);
  stopAutoplay();
  state = next;
  actorId = next.actors[0].id;
  lastAnimatedRound = -1;
  $('intention-input').value = '';
  applyOptionsToForm(next.options);
  clearMessage();
  render();
}

function actionLabel(actionId, view) {
  return view.actions.find((action) => action.id === actionId)?.label ?? displayName(actionId);
}

function renderScenarios() {
  $('scenario-tabs').innerHTML = scenarios.map((scenario, index) => `
    <button class="scenario-tab ${state.scenario.id === scenario.id ? 'active' : ''}" data-scenario="${escapeHTML(scenario.id)}" aria-pressed="${state.scenario.id === scenario.id}">
      <span class="scenario-number">0${index + 1}</span>
      <span><strong>${escapeHTML(scenario.title)}</strong><small>${escapeHTML(scenarioNotes[scenario.id] ?? scenario.subtitle ?? 'A situated-action experiment')}</small></span>
      <span class="arrow" aria-hidden="true">↗</span>
    </button>`).join('');
}

function renderLoop(view) {
  const last = state.history.at(-1)?.decisions.find((decision) => decision.actorId === actorId);
  const trace = last?.phaseTrace ?? [];
  const animate = lastAnimatedRound !== state.round;
  $('loop').innerHTML = phases.map(([id, title], index) => `
    <li class="${last ? 'is-traced' : ''}" style="animation-delay:${animate ? index * 60 : 0}ms${animate ? '' : ';animation:none'}" title="${escapeHTML(trace.find((item) => item.phase === id)?.text ?? title)}">
      <span class="loop-number">0${index + 1}</span><span class="loop-name">${title}</span>
    </li>`).join('');
  $('loop-caption').textContent = last ? `Round ${state.round} · ${view.actor.name}'s recorded experience` : 'A decision becomes an experience.';
  lastAnimatedRound = state.round;
}

function personShape(x, y, alternate = false, scale = 1) {
  const color = alternate ? '#bf7458' : '#356e58';
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="20" rx="13" ry="4" fill="#788e7820"/><circle cx="0" cy="-8" r="6" fill="${color}"/><path d="M-6 1Q0-2 6 1L8 10H-8Z" fill="${color}"/><path d="M-3 9-5 19M3 9l5 10" stroke="${color}" stroke-width="3" stroke-linecap="round"/></g>`;
}

function renderScene(view) {
  const progress = Math.max(0, Math.min(1, view.world.progress / view.world.target));
  const shared = `<pattern id="scene-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#8faa8c" stroke-opacity=".15" stroke-width=".5"/></pattern><rect width="660" height="250" fill="#e9ede2"/><rect width="660" height="250" fill="url(#scene-grid)"/>`;
  let illustration;
  if (view.scenario.theme === 'workshop' || view.scenario.id === 'workshop' || view.scenario.id === 'solo') {
    const pieces = Array.from({ length: 6 }, (_, index) => `<rect x="${352 + index * 24}" y="${113 - (index % 2) * 4}" width="17" height="15" rx="2" fill="${index < Math.ceil(progress * 6) ? '#4d866a' : '#d9d9c3'}" stroke="#8da28a" stroke-width=".7"/>`).join('');
    illustration = `
      <path d="M88 179 319 226 576 176 342 127Z" class="scene-ground"/>
      <path d="M88 179 319 226 576 176M88 179V85L343 35 576 85V176" class="scene-fine"/>
      <path d="M138 142 339 103 534 144 333 184Z" class="scene-surface"/>
      <path d="M138 142v14l195 42 201-42v-12M155 159v38M515 163v32M331 197v22" class="scene-stroke"/>
      <path d="M217 126 250 119 273 124 240 132Z" class="scene-warm"/>
      <path d="M241 106v16M235 108h12" class="scene-stroke"/>
      <path d="M168 132 195 127 203 131 176 137Z" class="scene-teal"/>
      <path d="M297 132 324 126 348 132 322 139Z" fill="#cbd6bf" stroke="#8aa089" stroke-width=".7"/>
      ${pieces}
      <path d="M463 87V43M457 43h12M465 53l-12 13h25Z" class="scene-stroke"/>
      <path d="M209 77h84M209 83h46M209 89h65" class="scene-fine"/>
      <text x="89" y="39" class="scene-label">REPAIR BENCH</text>
      <text x="434" y="214" class="scene-label">PRACTICE → EXPERIENCE</text>
      ${personShape(198, 164, false, 1.2)}${view.peers.length ? personShape(392, 176, true, 1.2) : ''}
    `;
  } else if (view.scenario.id === 'commons') {
    const fill = Math.round(progress * 39);
    illustration = `
      <ellipse cx="330" cy="168" rx="235" ry="57" class="scene-ground"/>
      <path d="M96 185q63-53 125-23M424 192q62-50 137-23" class="scene-fine"/>
      <path d="M327 90v-31h42v12h-28v20" class="scene-stroke"/>
      <path d="M318 88h40v67h-40z" class="scene-surface"/>
      <path d="m322 88-8-10h50l-8 10M337 103v27h23v10M337 103l34-20" class="scene-stroke"/>
      <ellipse cx="338" cy="160" rx="34" ry="9" fill="#cad7c6" stroke="#90ab92"/>
      ${[150, 227, 443].map((x) => `<g><ellipse cx="${x + 21}" cy="183" rx="29" ry="8" fill="#80947a20"/><path d="M${x} 130h42l-4 48q-17 10-34 0Z" class="scene-surface"/><path d="M${x + 4} ${178 - fill}h34v${fill}q-17 7-30 0Z" fill="#8db7a4" opacity=".8"/><ellipse cx="${x + 21}" cy="130" rx="21" ry="6" fill="#e5e5d4" stroke="#90a28a"/></g>`).join('')}
      <path d="M108 87v31M99 103l9 8 10-18M520 80v35M509 94l11 9 13-20" class="scene-stroke"/>
      <text x="84" y="37" class="scene-label">WATER STATION / 03</text>
      <text x="418" y="218" class="scene-label">ONE SHARED RESERVE</text>
      ${personShape(291, 175, false, 1.2)}${personShape(396, 157, true, 1.2)}
    `;
  } else {
    illustration = `
      <path d="M-10 182Q100 80 218 120T433 100T681 139V250H-10Z" class="scene-ground"/>
      <path d="M289 0Q238 70 299 132T278 250H365Q412 190 354 119T369 0Z" fill="#a6c5b1" opacity=".72"/>
      <path d="M316 0Q267 70 326 131T317 250M338 0Q289 70 348 131T339 250" stroke="#e2ece0" fill="none" stroke-width="1.3"/>
      <path d="M108 173Q186 119 241 119M371 116Q455 78 543 112" stroke="#81987c" fill="none" stroke-width="3" stroke-dasharray="5 6"/>
      <path d="M244 112 372 99 374 127 248 139Z" fill="#e5d2ae" stroke="#8b9879" stroke-width="1.4"/>
      <path d="M255 112l3 24M271 110l3 24M287 108l3 24M303 106l3 25M319 104l3 26M335 103l3 26M351 101l3 26" stroke="#b39e7d" stroke-width="1"/>
      <path d="M241 97 371 84M249 139v-45M365 128V82" class="scene-stroke"/>
      <path d="M518 104V75l23-17 25 16v32Z" class="scene-surface"/><path d="m512 76 29-24 32 24M537 87v19h12V87Z" class="scene-stroke"/>
      <path d="M108 129V99M96 115l12-24 13 24Z" class="scene-stroke"/>
      <path d="M428 178v-31M416 163l12-24 13 24Z" class="scene-stroke"/>
      <path d="M152 207Q218 194 242 191M411 49q31-13 60-9" class="scene-fine"/>
      <text x="53" y="39" class="scene-label">CROSSING / 01</text>
      <text x="459" y="215" class="scene-label">DELIVERIES ${Math.round(progress * 100)}%</text>
      <g class="scene-person" style="transform:translateX(${progress * 100}px)">${personShape(184, 143, false, 1.15)}</g>
      ${personShape(462, 109, true, 1.05)}
    `;
  }
  $('scene').innerHTML = `<svg viewBox="0 0 660 250" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${shared}${illustration}</svg>`;
}

function renderWorld(view) {
  const archived = isArchived();
  $('engine-version').textContent = `/ ${ENGINE_VERSION}`;
  $('archive-notice').hidden = !archived;
  $('archive-notice').textContent = archived ? `${archiveLabel()} · Read-only. Inspect or export the original run. Restart loads the current scenario preset and capacity rules, keeping this seed and model settings.` : '';
  const index = scenarios.findIndex((scenario) => scenario.id === view.scenario.id);
  $('scenario-kicker').textContent = index >= 0 ? `Experiment 0${index + 1} / ${view.scenario.id}` : 'Imported experiment';
  $('scenario-title').textContent = view.scenario.title;
  $('scenario-subtitle').textContent = view.scenario.subtitle || scenarioNotes[view.scenario.id] || 'A situated-action experiment';
  $('objective-text').textContent = view.scenario.objective;
  $('objective-label').textContent = view.peers.length ? 'Shared objective' : 'Your objective';
  $('scenario-aim').textContent = `Reach ${number(view.world.target)} ${view.world.resourceLabel} by round ${view.horizon} (${number(view.horizon * view.roundMinutes)} simulated minutes).`;
  $('world-brief').textContent = view.scenario.brief;
  const modelName = policyName(state.options.policy);
  const disabled = modules.filter(([id]) => !state.options.modules[id]).map(([, label]) => label);
  $('run-identity').textContent = `${archived ? archiveLabel() : 'CURRENT RUN'} · Seed ${state.options.seed} · ${modelName}${disabled.length ? ` · Off: ${disabled.join(', ')}` : ''}`;
  $('replay-identity').textContent = `${view.scenario.title} · Rules ${state.version} · Seed ${state.options.seed} · ${modelName} · Round ${view.round}${disabled.length ? ` · Off: ${disabled.join(', ')}` : ''}`;
  $('progress-text').textContent = `${number(view.world.progress)} / ${number(view.world.target)}`;
  $('progress-fill').style.width = `${Math.max(0, Math.min(100, 100 * view.world.progress / view.world.target))}%`;
  $('run-status').className = `run-status ${view.status}`;
  $('run-status').textContent = archived ? 'Archived · read-only' : view.status === 'won' ? 'Objective met' : view.status === 'lost' ? 'Time elapsed' : state.round ? 'In progress' : 'Ready to begin';
  $('world-metrics').innerHTML = `
    <div class="world-metric"><span>Round</span><strong>${view.round}<small>/ ${view.horizon}</small></strong></div>
    <div class="world-metric"><span>Simulated time</span><strong>${number(view.minutes)}<small>min</small></strong></div>
    <div class="world-metric"><span>${view.peers.length ? 'Shared rations' : 'Rations'}</span><strong>${number(view.world.food, 0)}<small>remaining</small></strong></div>`;
  const terminal = $('terminal-summary');
  terminal.hidden = view.status === 'running';
  terminal.classList.toggle('is-lost', view.status === 'lost');
  if (!terminal.hidden) terminal.innerHTML = `<strong>${view.status === 'won' ? 'The objective is complete.' : 'Time ran out before the objective was met.'}</strong>${number(view.world.progress)} of ${number(view.world.target)} ${escapeHTML(view.world.resourceLabel)} after ${view.round} rounds. ${archived ? 'Inspect the original choices below. Restart begins the current scenario preset and rules with this seed.' : 'Inspect the choices below, or restart the same seed to try another approach.'}`;
  $('play-anchor').href = !archived && view.status === 'running' ? '#your-choice' : '#run-history';
  $('play-anchor').innerHTML = `${archived ? 'Inspect archived run' : view.status !== 'running' ? 'Review this run' : view.round ? 'Choose your next action' : 'Make your first choice'} <span aria-hidden="true">↓</span>`;
  $('start-caption').textContent = archived ? `${archiveLabel()}. Restart to play the current version.` : view.status !== 'running' ? 'Run complete. Review the choices or restart.' : view.round ? 'The next round waits for your choice.' : 'Ready to play. No setup required.';
  renderScene(view);
}

function renderRoundFeedback(view) {
  const last = state.history.at(-1);
  const own = last?.decisions.find((decision) => decision.actorId === actorId);
  const record = own ? decisionGuidance(own) : null;
  $('round-feedback').classList.toggle('forced-recovery', Boolean(record?.forced));
  if (!last) {
    $('round-feedback').innerHTML = isArchived()
      ? '<strong>Archived run · no recorded rounds</strong><p>Restart with current rules to play a new scenario.</p>'
      : `<strong>Start here: request an action card.</strong><p>${escapeHTML(view.actor.name)} is ready. ${view.peers.length ? 'Each person takes one action, then' : 'Choose one action, then'} one round and ${number(view.roundMinutes)} simulated minutes pass.</p>`;
    return;
  }
  const before = state.history.length > 1 ? state.history.at(-2).world.progress : state.scenario.initialProgress;
  const practice = own?.learning?.direct;
  const learningText = practice ? ` Practice: ${displayName(practice.skill)} +${number(practice.delta * 100, 2)} points.` : '';
  $('round-feedback').innerHTML = `<span class="eyebrow">Last round · ${last.round}</span><strong>${escapeHTML(view.actor.name)}: ${record?.forced ? 'Automatic recovery' : escapeHTML(own?.actionLabel ?? 'Round completed')}</strong>${record?.forced ? requestExecutionMarkup(own) : ''}<p>${escapeHTML(own?.outcome.reason ?? '')}${escapeHTML(learningText)}${own?.outcome.promiseKept ? ' The promised attempt was made.' : ''}</p>${record?.forced ? '<p class="recovery-result">The blocked request produced no work, practice or fulfilled promise.</p>' : ''}<p class="feedback-total">${view.peers.length ? 'Shared progress' : 'Progress'}: ${number(before)} → ${number(view.world.progress)} ${escapeHTML(view.world.resourceLabel)} · ${number(view.roundMinutes)} min elapsed</p>`;
}

function renderActions(view, ranking) {
  const actors = [{ id: view.actor.id, name: view.actor.name, role: view.actor.role }, ...view.peers];
  const order = state.actors.map((actor) => actor.id);
  actors.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  $('actor-tabs').innerHTML = actors.map((actor, index) => `<button class="actor-tab ${actor.id === actorId ? 'active' : ''}" data-actor="${escapeHTML(actor.id)}" aria-pressed="${actor.id === actorId}"><span class="actor-dot ${index ? 'alternate' : ''}" aria-hidden="true"></span>${escapeHTML(actor.name)}<small>${escapeHTML(actor.role)}</small></button>`).join('');
  $('choice-round').textContent = isArchived() ? 'Read-only archive' : view.status === 'running' ? `Round ${view.round + 1} / ${view.horizon}` : 'Run complete';
  $('choice-explainer').textContent = isArchived() ? 'This historical run is read-only. Restart loads the current preset and rules.' : `Manual play: select a card to request an action for ${view.actor.name}. ${view.peers.length === 1 ? 'The other person chooses independently in the same round.' : view.peers.length ? 'The other people choose independently in the same round.' : 'There is one person, so one action completes a round.'}`;
  const available = view.status === 'running' && !running && !isArchived();
  $('action-grid').innerHTML = view.actions.map((action) => {
    const rank = ranking.findIndex((candidate) => candidate.actionId === action.id);
    const guide = actionGuidance(view, action, ranking[rank]);
    const accessible = `${guide.capacityLabel ? guide.capacityLabel + ". " + guide.capacityDetail + ". " : ""}${action.label}. ${guide.benefit}. ${guide.costs.join('. ')}.${guide.estimate ? ` ${guide.estimate}.` : ''}${guide.practice ? ` Practice if executed: ${displayName(guide.practice)}.` : ''}`;
    return `<button class="action-button ${guide.capacity && !guide.capacity.allowed ? 'capacity-warning' : ''}" data-action="${escapeHTML(action.id)}" ${available ? '' : 'disabled'} aria-label="${escapeHTML(accessible)}"><span class="action-icon" aria-hidden="true">${actionIcons[action.kind] ?? '→'}</span><span class="action-content"><strong>${escapeHTML(action.label)}</strong><small>${escapeHTML(action.description)}</small><span class="action-benefit">${escapeHTML(guide.benefit)}</span><span class="action-costs">${guide.costs.map((cost) => `<span>${escapeHTML(cost)}</span>`).join('')}${guide.practice ? `<span>Practice if executed: ${escapeHTML(displayName(guide.practice))}</span>` : ''}</span>${guide.estimate ? `<span class="action-note">${escapeHTML(guide.estimate)}</span>` : ''}${guide.capacity ? `<span class="capacity-label">${escapeHTML(guide.capacityLabel)}</span><span class="capacity-detail">${escapeHTML(guide.capacityDetail)}</span>` : ''}</span>${rank >= 0 ? `<span class="action-rank" title="Current policy ranking">#${rank + 1}</span>` : ''}</button>`;
  }).join('');
  $('auto-round').disabled = !available;
  $('run-to-end').disabled = isArchived() || (view.status !== 'running' && !running);
  $('auto-round').hidden = isArchived();
  $('run-to-end').hidden = isArchived();
  $('restart-run').textContent = isArchived() ? 'Restart with current rules' : 'Restart';
  $('restart-run').classList.toggle('archived-restart', isArchived());
  $('run-to-end').innerHTML = running ? 'Stop autoplay <span aria-hidden="true">Ⅱ</span>' : 'Run to end <span aria-hidden="true">↠</span>';
  $('intention-input').disabled = !available;
  for (const option of $('intention-input').options) {
    const unavailable = (option.value === 'Help my partner' && !view.peers.length) || (option.value === 'Keep my commitment' && !view.actor.commitment);
    option.hidden = unavailable;
    option.disabled = unavailable;
    if (unavailable && option.selected) $('intention-input').value = '';
  }
  $('play-mode-help').innerHTML = isArchived() ? '<strong>Restart with current rules</strong> begins the current scenario preset. The archived record remains unchanged in your original replay file.' : `<strong>Auto round</strong> lets the model choose ${view.peers.length ? 'for everyone once' : 'one action'}. <strong>Run to end</strong> repeats until completion or the deadline; you can stop it.`;
  renderRoundFeedback(view);
}

function renderPerson(view) {
  const actor = view.actor;
  const belief = actor.beliefs.hazard;
  const promise = actor.commitment;
  const commitment = promise
    ? `<p class="commitment-note">“Attempt ${escapeHTML(actionLabel(promise.actionId, view).toLowerCase())} by round ${promise.dueRound}.”</p><p class="commitment-meta">${promise.fulfilled ? 'The promised attempt was made.' : promise.expired ? 'The agreed round passed without the attempt.' : `A recognized promise · due in ${Math.max(0, promise.dueRound - view.round)} round(s)`}</p>`
    : '<p class="fine-print">No explicit promise is recorded for this run.</p>';
  $('person-details').innerHTML = `
    <div class="person-heading"><span class="person-avatar" aria-hidden="true">${escapeHTML(actor.name.charAt(0))}</span><div><h2 id="person-title">${escapeHTML(actor.name)}</h2><p>${escapeHTML(actor.role)} · your current viewpoint</p></div></div>
    ${['fatigue', 'hunger'].map((key) => `<div class="body-metric"><div><span>${displayName(key)}</span><strong>${percent(actor.body[key])}</strong></div><div class="mini-track"><div class="${actor.body[key] > .7 ? 'high' : ''}" style="width:${Math.max(0, Math.min(100, actor.body[key] * 100))}%"></div></div></div>`).join('')}
    <div class="person-section"><p class="eyebrow">What this person knows</p><div class="belief-card"><div class="belief-top"><strong>${escapeHTML(view.scenario.hazardLabel || 'Difficult conditions')}</strong><span>${percent(belief.estimate)}</span></div><p>Working estimate · confidence ${percent(belief.confidence)}<br>Source: ${escapeHTML(displayName(belief.source))}</p></div></div>
    ${promise ? `<div class="person-section"><p class="eyebrow">A reason to act</p>${commitment}</div>` : ''}
    <div class="person-section"><p class="eyebrow">Task-specific proficiency</p>${Object.entries(actor.skills).map(([name, value]) => `<div class="skill-row"><span>${escapeHTML(displayName(name))}</span><span>${percent(value)}</span></div>`).join('')}</div>
    ${view.peers.length ? `<div class="person-section"><p class="eyebrow">Working relationships</p>${view.peers.map((peer) => `<div class="relation-row"><span>${escapeHTML(peer.name)} · trust estimate</span><span>${percent(actor.relationships[peer.id])}</span></div><p class="fine-print">Last observed action: ${escapeHTML(peer.lastAction || 'None yet')}</p>`).join('')}</div>` : ''}`;
}

function candidateMarkup(view, candidate, index) {
    const extent = Math.max(.01, ...candidate.contributions.map((item) => Math.abs(item.value)));
    return `<details class="candidate" ${index === 0 ? 'open' : ''}><summary><span class="candidate-rank">0${index + 1}</span><span class="candidate-label">${escapeHTML(actionLabel(candidate.actionId, view))}</span><span class="candidate-score">${signed(candidate.score)}</span></summary>${candidate.selectionReason ? `<p class="forecast">${escapeHTML(candidate.selectionReason)} Tier ${candidate.selectionTier}; scores compare choices within the same tier.</p>` : ''}${Number.isFinite(candidate.forecast) ? `<p class="forecast">Estimated success if executed: ${percent(candidate.forecast)}</p>` : ''}<div class="contributions">${candidate.contributions.map((item) => `<div class="contribution"><span>${escapeHTML(item.label)}</span><span class="contribution-track"><i class="${item.value < 0 ? 'negative' : ''}" style="width:${100 * Math.abs(item.value) / extent}%"></i></span><strong>${signed(item.value)}</strong></div>`).join('')}</div></details>`;
}

function renderDecision(view, ranking) {
  if (isArchived()) {
    $('decision-intro').textContent = `${archiveLabel()}. Recorded decision weights remain in the history; no new decisions can be executed here.`;
    $('decision-details').replaceChildren();
    return;
  }
  $('decision-intro').textContent = view.status === 'running'
    ? `The ${policyName(state.options.policy)} policy currently favors “${actionLabel(ranking[0]?.actionId, view)}.” You can choose any available action. Open a row to see its actual score contributions.`
    : 'The run has ended. These are the final-state rankings, not a new decision. Recorded decisions remain in the history.';
  $('decision-details').innerHTML = ranking.map((candidate, index) => candidateMarkup(view, candidate, index)).join('');
}

function renderHistory(view) {
  $('history-count').textContent = state.history.length ? `${state.history.length} recorded round${state.history.length === 1 ? '' : 's'}` : 'No rounds yet';
  if (!state.history.length) {
    $('history-list').innerHTML = '<div class="empty-state"><span aria-hidden="true">↳</span>No recorded decisions yet.</div>';
    return;
  }
  $('history-list').innerHTML = [...state.history].reverse().map((round, index) => {
    const own = round.decisions.find((decision) => decision.actorId === actorId);
    const ownRecord = own ? decisionGuidance(own) : null;
    const title = ownRecord?.forced ? `${ownRecord.requested} → ${ownRecord.executed}` : own?.actionLabel ?? 'Round';
    const publicEvents = round.decisions.map((decision) => `<div class="history-event"><strong>${escapeHTML(decision.actorName)} · ${escapeHTML(decision.actionLabel)}</strong><span class="outcome-tag">${decision.intervention ? 'automatic recovery' : decision.outcome.progress > 0 ? `+${number(decision.outcome.progress)}` : decision.outcome.success ? 'completed' : 'attempted'}</span><p>${escapeHTML(decision.outcome.reason)}</p></div>`).join('');
    const ownTrace = own ? `${ownRecord.forced ? requestExecutionMarkup(own) : ''}<p class="private-note">${own.source === 'player' ? 'Your requested reason' : `${escapeHTML(view.actor.name)}'s recorded intention`}: ${escapeHTML(own.intention)}</p><ol class="trace-list">${own.phaseTrace.map((item) => `<li><strong>${escapeHTML(item.phase)}</strong><span>${escapeHTML(item.text)}</span></li>`).join('')}</ol><details class="past-ranking"><summary>Decision weights at the time of the request</summary><div>${own.scores.map((candidate, position) => candidateMarkup(view, candidate, position)).join('')}</div></details>` : '';
    return `<details class="history-round" ${index === 0 ? 'open' : ''}><summary title="${escapeHTML(title)}"><span class="round-index">${round.round}</span><strong>${escapeHTML(title)}</strong><small>${number(round.minutes)} min</small></summary>${publicEvents}${ownTrace}</details>`;
  }).join('');
}

function renderInspector() {
  $('actor-view').setAttribute('aria-pressed', String(!researcher));
  $('researcher-view').setAttribute('aria-pressed', String(researcher));
  $('researcher-warning').hidden = !researcher;
  $('inspector-panel').hidden = !researcher;
  if (!researcher) { $('inspector-details').replaceChildren(); return; }
  const last = state.history.at(-1);
  $('inspector-details').innerHTML = `
    <div class="inspector-metrics"><div>Actual hidden conditions<strong>${percent(state.world.hazard)}</strong></div><div>Engine / seed<strong>${escapeHTML(state.version)} / ${state.options.seed}</strong></div></div>
    ${last ? last.decisions.map((decision) => `<div class="inspector-person"><h3>${escapeHTML(decision.actorName)} · round ${last.round}</h3><p><strong>Private intention:</strong> ${escapeHTML(decision.intention)}</p><p>Request source: ${escapeHTML(decision.source)}</p>${requestExecutionMarkup(decision)}${Number.isFinite(decision.diagnostics.chance) ? `<p>Actual success chance: ${percent(decision.diagnostics.chance)}<br>Keyed random draw: ${number(decision.diagnostics.roll, 5)}</p>` : ''}<details><summary>Structured decision record</summary><pre>${escapeHTML(JSON.stringify(decision, null, 2))}</pre></details></div>`).join('') : '<p class="fine-print" style="margin-top:16px">Take a first action to inspect its resolved chances and recorded decisions.</p>'}`;
}

function render() {
  const focused = document.activeElement;
  const focusToken = focused?.dataset?.action ? ['action', focused.dataset.action]
    : focused?.dataset?.actor ? ['actor', focused.dataset.actor]
      : focused?.dataset?.scenario ? ['scenario', focused.dataset.scenario] : null;
  const view = getView(state, actorId);
  const ranking = isArchived() ? [] : rankActions(view);
  renderScenarios();
  renderLoop(view);
  renderWorld(view);
  renderActions(view, ranking);
  renderPerson(view);
  renderDecision(view, ranking);
  renderHistory(view);
  renderInspector();
  updateSettingsNote();
  if (focusToken) {
    const candidates = document.querySelectorAll(`[data-${focusToken[0]}]`);
    [...candidates].find((element) => element.dataset[focusToken[0]] === focusToken[1])?.focus({ preventScroll: true });
  }
}

function advance(command) {
  if (isArchived()) { showMessage('Archived replay is read-only. Restart with current rules to play.'); return false; }
  try {
    state = step(state, command);
    clearMessage();
    render();
    const own = state.history.at(-1)?.decisions.find((decision) => decision.actorId === actorId);
    showMessage(`Round ${state.round}. ${own?.intervention ? `Requested ${own.requestedActionLabel}; executed ${own.actionLabel}` : own?.actionLabel ?? 'Actions resolved'}. ${own?.outcome.reason ?? ''}${state.status === 'running' ? '' : state.status === 'won' ? ' The objective is complete.' : ' The available time has elapsed.'}`);
    return true;
  } catch (error) {
    stopAutoplay();
    showMessage(error.message || 'The action could not be processed.', true);
    render();
    return false;
  }
}

async function autoplay() {
  if (running) { stopAutoplay(); render(); return; }
  if (state.status !== 'running' || isArchived()) return;
  running = true;
  const token = ++animationToken;
  render();
  let count = 0;
  while (running && token === animationToken && state.status === 'running' && count < 120) {
    if (!advance({ type: 'auto' })) break;
    count += 1;
    if (state.status === 'running') await new Promise((resolve) => setTimeout(resolve, 170));
  }
  if (token === animationToken) { running = false; render(); }
}

function installEvents() {
  $('setup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try { newRun(restartScenario(), getOptions()); showMessage('A new run has started with the selected settings and current rules.'); }
    catch (error) { showMessage(error.message, true); }
  });
  $('setup-form').addEventListener('input', updateSettingsNote);
  $('setup-form').addEventListener('change', updateSettingsNote);
  $('scenario-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-scenario]');
    if (!button) return;
    try { newRun(getScenario(button.dataset.scenario), getOptions()); }
    catch (error) { showMessage(error.message, true); }
  });
  $('actor-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-actor]');
    if (button) { actorId = button.dataset.actor; render(); }
  });
  $('action-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || running || isArchived() || state.status !== 'running') return;
    const intention = $('intention-input').value;
    advance({ type: 'act', actorId, actionId: button.dataset.action, ...(intention ? { intention } : {}) });
  });
  $('auto-round').addEventListener('click', () => advance({ type: 'auto' }));
  $('run-to-end').addEventListener('click', autoplay);
  $('restart-run').addEventListener('click', () => {
    const archived = isArchived();
    newRun(restartScenario(), state.options);
    showMessage(archived ? 'Started the current scenario preset and capacity rules, keeping the replay seed and model settings.' : 'Restarted the same scenario, seed and model settings.');
  });
  $('actor-view').addEventListener('click', () => { researcher = false; renderInspector(); });
  $('researcher-view').addEventListener('click', () => { researcher = true; renderInspector(); });
  $('export-replay').addEventListener('click', () => {
    try {
      const payload = JSON.stringify(exportReplay(state), null, 2);
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `human-framework-${state.scenario.id}-seed-${state.options.seed}-round-${state.round}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showMessage('Replay exported. It contains the full scenario setup and recorded choices.');
    } catch (error) { showMessage(error.message || 'Could not export the replay.', true); }
  });
  $('import-replay').addEventListener('click', () => $('replay-file').click());
  $('replay-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('This replay is too large. Choose a JSON file smaller than 5 MB.');
      const record = JSON.parse(await file.text());
      const imported = replay(record);
      const importedActor = imported.actors[0].id;
      // Validate the projection before replacing a currently playable run.
      const importedView = getView(imported, importedActor);
      if (imported.version === ENGINE_VERSION) rankActions(importedView);
      stopAutoplay();
      state = imported;
      actorId = importedActor;
      lastAnimatedRound = -1;
      $('intention-input').value = '';
      applyOptionsToForm(state.options);
      render();
      showMessage(`Replay restored: ${state.scenario.title}, seed ${state.options.seed}, ${state.round} recorded round(s).${isArchived() ? ` ${archiveLabel()} · read-only. Restart loads the current preset and rules.` : ''}`);
    } catch (error) { showMessage(`Replay was not imported. ${error.message || 'Invalid file.'} The current run is unchanged.`, true); }
  });
}

try {
  $('module-options').innerHTML = modules.map(([id, label, detail]) => `<label for="module-${id}"><input type="checkbox" id="module-${id}" checked><span>${label}<small>${detail}</small></span></label>`).join('');
  $('seed-input').min = '0';
  $('seed-input').max = '4294967295';
  installEvents();
  if (!scenarios.length) throw new Error('No scenario presets are available.');
  newRun(scenarios[0], { seed: 7, policy: 'full', modules: Object.fromEntries(modules.map(([id]) => [id, true])) });
} catch (error) {
  $('game-content').hidden = true;
  $('load-error').hidden = false;
  $('load-error').textContent = `The laboratory could not start. ${error.message}`;
}
