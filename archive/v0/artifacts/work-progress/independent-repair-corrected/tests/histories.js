export const histories = {
  H1: {setup: {}, commands: [[0, 'start', 'mara']], expected: {at: 20, mara: 20, tomas: 0}},
  H2: {setup: {tool: true}, commands: [[0, 'start', 'mara']], expected: {at: 15, mara: 15, tomas: 0}},
  H3: {setup: {}, commands: [[0, 'start', 'mara'], [7, 'stop', 'mara'], [10, 'start', 'mara']], expected: {at: 23, mara: 20, tomas: 0}},
  H4: {setup: {tool: true}, commands: [[0, 'start', 'mara'], [1, 'stop', 'mara'], [1, 'start', 'mara']], expected: {at: 15, mara: 15, tomas: 0}},
  H5: {setup: {}, commands: [[0, 'start', 'mara'], [1, 'offerHandover', 'mara', 'tomas']], expected: {at: 19, mara: 1, tomas: 18}},
  H6: {setup: {}, commands: [[0, 'start', 'tomas'], [1, 'offerHandover', 'tomas', 'mara']], expected: {at: 20, mara: 19, tomas: 1}},
  H7: {setup: {busy: true}, commands: [[0, 'start', 'mara'], [1, 'offerHandover', 'mara', 'tomas']], expected: {at: 20, mara: 20, tomas: 0}},
  H8: {setup: {twoPumps: true}, commands: [[0, 'start', 'mara', 'south'], [2, 'start', 'tomas', 'north']], expected: {at: 20, mara: 20, tomas: 18}}
};

// Independently evaluated arithmetic oracle: only the prospective scalar work law.
// It has no candidate, direct host, or Human imports and never reads their results.
export function oracle(name) {
  const script = histories[name];
  const pumps = Object.fromEntries((script.setup.twoPumps ? ['south', 'north'] : ['south']).map(id => [id, {share: 0, assigned: null, finishedAt: null}]));
  const credit = {mara: {minutes: 0, effort: 0}, tomas: {minutes: 0, effort: 0}};
  for (let elapsed = 0; elapsed < 40; elapsed++) {
    for (const [at, action, actor, argument, target = 'south'] of script.commands) {
      if (at !== elapsed) continue;
      if (action === 'start') pumps[argument ?? 'south'].assigned = actor;
      if (action === 'stop') for (const pump of Object.values(pumps)) if (pump.assigned === actor) pump.assigned = null;
      if (action === 'offerHandover' && !(script.setup.busy && elapsed < 4)) pumps[target].assigned = argument;
    }
    for (const pump of Object.values(pumps)) if (pump.assigned) {
      const assigned = pump.assigned;
      const divisor = (assigned === 'mara' ? 20 : 18) - (script.setup.tool && elapsed >= 1 ? 6 : 0);
      const slice = Math.min(1 - pump.share, 1 / divisor);
      pump.share += slice; credit[assigned].minutes++; credit[assigned].effort += .20 * slice;
      if (pump.share >= 1 - 1e-12) { pump.finishedAt = elapsed + 1; pump.assigned = null; }
    }
    if (Object.values(pumps).every(pump => pump.finishedAt !== null)) return {at: elapsed + 1, credit, pumps: Object.fromEntries(Object.entries(pumps).map(([id, pump]) => [id, pump.finishedAt]))};
  }
  throw new Error('Oracle did not finish');
}

export function runHistory(host, name, driver, roundTrip = false) {
  const script = histories[name]; let state = host.create(script.setup), commandIndex = 0, step = 0;
  const commands = [], checkpoints = [{kind: 'created', snapshot: host.exportState(state)}];
  const irregular = [3, 1, 7, 2, 5]; let roundTripped = false;
  for (;;) {
    // Save an additional active current state at 1 before any command there.
    if (state.minute === 1 && roundTrip && !roundTripped) {
      state = host.restoreState(JSON.parse(JSON.stringify(host.exportState(state)))); roundTripped = true;
      checkpoints.push({kind: 'roundtrip', snapshot: host.exportState(state)});
    }
    while (commandIndex < script.commands.length && script.commands[commandIndex][0] === state.minute) {
      const [, action, ...args] = script.commands[commandIndex++];
      const call = host[action](state, ...args); state = call.state;
      commands.push({at: state.minute, action, args, result: call.result});
      checkpoints.push({kind: 'command', snapshot: host.exportState(state)});
    }
    if (state.minute === 40) break;
    const amount = driver === 'minute' ? 1 : driver === 'event' ? (host.nextEvent(state) ?? 40) - state.minute : irregular[step++ % irregular.length];
    const commandAt = script.commands[commandIndex]?.[0] ?? 40;
    const target = Math.min(40, commandAt, state.minute < 1 ? 1 : 40, state.minute + amount);
    if (!(target > state.minute)) throw new Error('Driver failed to progress');
    const before = state.minute; state = host.advance(state, target);
    commands.push({at: before, action: 'advance', target});
    checkpoints.push({kind: 'advance', snapshot: host.exportState(state)});
  }
  return {name, driver, roundTrip, commands, checkpoints, final: host.exportState(state), projection: host.projection(state)};
}
