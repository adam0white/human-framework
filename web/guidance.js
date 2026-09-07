const number = (value) => Number.isFinite(value) ? Number(value.toFixed(2)).toLocaleString('en-US') : '—';

// Presentation of known action contracts only. Forecasts come from the actor-view policy.
// This formatter neither predicts outcomes nor reads authoritative world state.
export function actionGuidance(view, action, candidate) {
  const costs = [`1 round · ${number(view.roundMinutes)} min`];
  let benefit = '';
  if (action.kind === 'work') {
    benefit = `+${number(action.output)} ${view.world.resourceLabel} on success`;
    costs.push(`Effort: +${number(action.effort * 100)} fatigue points`);
  } else if (action.kind === 'rest') {
    benefit = 'Recover fatigue';
  } else if (action.kind === 'eat') {
    benefit = view.world.food >= 1 ? 'Reduce hunger' : 'No ration available now';
    costs.push('1 ration if available at the attempt');
  } else if (action.kind === 'observe') {
    benefit = view.options.modules.beliefs ? 'New evidence about conditions' : 'Inspect conditions; belief updating is off';
  } else if (action.kind === 'help') {
    benefit = !view.peers.length ? 'No partner available to assist'
      : view.options.modules.relationships ? 'Support a partner’s next work attempt' : 'Attempt help; assistance effects are off';
    costs.push(`Effort: +${number((action.effort ?? 0.08) * 100)} fatigue points`);
  }
  return {
    benefit,
    costs,
    estimate: Number.isFinite(candidate?.forecast) ? `${Math.round(candidate.forecast * 100)}% estimated success` : null,
    practice: view.options.modules.learning && action.skill && ['work', 'observe'].includes(action.kind) ? action.skill : null,
  };
}
