import * as commons from '../src/games/commons.js';

// Legal executable prelude, never a hand-edited save. The extra 12 paid idle
// minutes let Meryem finish her self-chosen meal before the garden request.
export const PRELUDE = Object.freeze([
  ['start', 'gather-timber'], ['next'], ['start', 'gather-timber'], ['next'],
  ['start', 'gather-timber'], ['next'], ['start', 'gather-salvage'], ['next'],
  ['start', 'rest'], ['next'], ['start', 'gather-salvage'], ['next'],
  ['start', 'build-workbench'], ['next'], ['start', 'rest'], ['next'],
  ['advance', 12], ['start', 'build-workbench'], ['advance', 27], ['request', 'garden']
]);

export function applyLegacy(game, [kind, value]) {
  if (kind === 'start') return commons.startJob(game, value);
  if (kind === 'next') return commons.advanceToNextEvent(game);
  if (kind === 'advance') return commons.advanceGame(game, value);
  if (kind === 'request') return commons.requestProject(game, value);
  if (kind === 'release') return commons.releaseProject(game);
  throw new Error('Unknown legacy command');
}

export function makeLegacyFixture(overlap = 1) {
  if (!Number.isSafeInteger(overlap) || overlap < 1 || overlap > 7) throw new Error('Invalid overlap');
  const commands = structuredClone(PRELUDE);
  commands[18][1] = 28 - overlap;
  return commands.reduce(applyLegacy, commons.createGame());
}

export function roundedCapacityFixture() {
  let state = commons.createGame({ solo: true });
  for (let i = 0; i < 3; i++) state = commons.advanceToNextEvent(commons.startJob(state, 'gather-timber'));
  return commons.advanceGame(state, 72);
}

export function legacyCounterexample() {
  const before = makeLegacyFixture();
  const fork = commons.advanceGame(before, 1);
  const restarted = commons.requestProject(commons.releaseProject(fork), 'garden');
  const untouchedFinish = commons.advanceGame(fork, fork.jobs.neighbor.endsAt - fork.clock.now);
  const restartedFinish = commons.advanceGame(restarted, restarted.jobs.neighbor.endsAt - restarted.clock.now);
  return { commands: PRELUDE, before: commons.exportGame(before), fork: commons.exportGame(fork),
    restarted: commons.exportGame(restarted), untouchedFinish: commons.exportGame(untouchedFinish),
    restartedFinish: commons.exportGame(restartedFinish) };
}
