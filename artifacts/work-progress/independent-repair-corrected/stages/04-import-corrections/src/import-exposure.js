import {insist, near} from './shape.js';
const ACTORS = ['mara', 'tomas'], EPS = 1e-12;

// Import-only necessary feasibility checks for the two-pump yard. No schedule
// or journal is saved. An option allocates existing counts before/after the
// one earned tool arrival; all options use the same actual world time limits.
export function checkPumpExposure(works, pumps, toolAt, now, haulingMinutes) {
  const release = id => id === 'tomas' ? haulingMinutes : 0;
  const choices = Object.entries(works).map(([key, work]) => {
    const deadline = pumps[key].finishedAt ?? now;
    const edge = toolAt ?? deadline, beforeEnd = Math.min(edge, deadline);
    const paid = ACTORS.filter(id => (work.hands[id]?.minutes ?? 0) > 0);
    const total = paid.reduce((sum, id) => sum + work.hands[id].minutes, 0);
    insist(total <= deadline, 'Item paid work exceeds its sequential time');
    const alternatives = [];
    const ends = Object.fromEntries(ACTORS.map(id => [id, work.hands[id]?.minutes ?? 0]));
    for (const terminal of work.complete ? paid : [null]) {
      for (let m = toolAt === null ? ends.mara : 0; m <= ends.mara; m++) {
        for (let t = toolAt === null ? ends.tomas : 0; t <= ends.tomas; t++) {
          const before = {mara: m, tomas: t};
          const after = {mara: ends.mara - m, tomas: ends.tomas - t};
          if (m + t > beforeEnd || after.mara + after.tomas > Math.max(0, deadline - edge)) continue;
          let valid = true, precedingCoverage = 0, terminalBefore = 0, terminalRate = 0;
          for (const id of ACTORS) {
            const hand = work.hands[id];
            if (!hand) continue;
            if (before[id] > Math.max(0, beforeEnd - release(id)) || after[id] > Math.max(0, deadline - Math.max(edge, release(id)))) { valid = false; break; }
            const fast = toolAt === null ? hand.basis : Math.max(6, hand.basis - 6);
            const full = before[id] / hand.basis + after[id] / fast;
            if (id === terminal) {
              const lastBeforeTool = deadline <= edge;
              if ((lastBeforeTool ? before[id] : after[id]) < 1 || deadline <= release(id)) { valid = false; break; }
              terminalRate = 1 / (lastBeforeTool ? hand.basis : fast);
              terminalBefore = full - terminalRate;
              precedingCoverage += terminalBefore;
            } else {
              if (!near(hand.coverage, full)) { valid = false; break; }
              precedingCoverage += full;
            }
          }
          if (!valid) continue;
          if (terminal !== null) {
            // The item must still be open immediately before the sole last minute.
            if (precedingCoverage >= 1 - EPS) continue;
            const finalSlice = Math.min(1 - precedingCoverage, terminalRate);
            if (precedingCoverage + finalSlice < 1 - EPS || !near(work.hands[terminal].coverage, terminalBefore + finalSlice)) continue;
          } else if (!near(precedingCoverage, work.coverage)) continue;
          alternatives.push({key, deadline, beforeEnd, before, after, terminal});
        }
      }
    }
    insist(alternatives.length > 0, 'Item exposure cannot fit its paid rate and tool/time boundary');
    return alternatives;
  });
  function together(selected) {
    for (const id of ACTORS) {
      // Prefix capacity respects separate item deadlines as well as the tool split.
      for (const cutoff of new Set(selected.map(item => item.beforeEnd))) {
        const needed = selected.filter(item => item.beforeEnd <= cutoff).reduce((sum, item) => sum + item.before[id], 0);
        if (needed > Math.max(0, cutoff - release(id))) return false;
      }
      if (toolAt !== null) for (const cutoff of new Set(selected.map(item => item.deadline))) {
        const needed = selected.filter(item => item.deadline <= cutoff).reduce((sum, item) => sum + item.after[id], 0);
        if (needed > Math.max(0, cutoff - Math.max(toolAt, release(id)))) return false;
      }
      const terminalTimes = selected.filter(item => item.terminal === id).map(item => item.deadline);
      if (new Set(terminalTimes).size !== terminalTimes.length) return false;
    }
    return true;
  }
  const combinationsFit = choices.length === 1 ? choices[0].some(item => together([item])) : choices[0].some(first => choices[1].some(second => together([first, second])));
  insist(combinationsFit, 'One actor cannot pay incompatible item time windows');
}
