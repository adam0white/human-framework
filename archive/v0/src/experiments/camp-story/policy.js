import { chooseCommand } from '../../games/commons-policy.js';

/** Serious existing visible-state priorities, with finite available-time recovery. */
export function chooseCampCommand(view, approach = 'build-first') {
  const command = chooseCommand(view, approach);
  if (command.type === 'start' && command.jobId === 'rest') return { type: 'recover' };
  return command;
}

export function applyCampCommand(api, state, command, remaining = 1440) {
  if (command.type === 'start') return api.startJob(state, command.jobId);
  if (command.type === 'request') return api.requestProject(state, command.projectId);
  if (command.type === 'recover' && api.getGameView(state).options.recovery === 'active-idle') state = api.startJob(state, 'rest');
  if (command.type === 'advance' || command.type === 'recover') {
    const view = api.getGameView(state);
    return api.advanceGame(state, Math.min(remaining, Math.max(1, view.nextEventAt - view.now)));
  }
  throw new Error('Unknown comparison command');
}

export function drive(api, initial, approach, stop, { maxMinutes = 480, maxCommands = 1500 } = {}) {
  let state = initial, firstMilestone = null;
  const decisions = [];
  while (!stop(api.getGameView(state)) && api.getGameView(state).now < maxMinutes && decisions.length < maxCommands) {
    const view = api.getGameView(state), command = chooseCampCommand(view, approach);
    const before = state;
    state = applyCampCommand(api, state, command, maxMinutes - view.now);
    decisions.push({ view, command });
    if (firstMilestone === null && api.getGameView(state).milestoneAt !== null) firstMilestone = api.exportGame(state);
    if (JSON.stringify(state) === JSON.stringify(before)) throw new Error('Comparison controller made no progress');
  }
  return { state, decisions, firstMilestone, stopped: stop(api.getGameView(state)),
    watchdog: { maxMinutes, maxCommands, reached: !stop(api.getGameView(state)) && (api.getGameView(state).now >= maxMinutes || decisions.length >= maxCommands) } };
}
