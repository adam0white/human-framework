import type { RunSpec } from '../src/run-schema.ts';

export function emptyRunSpec(): RunSpec {
  return {
    id: 'control',
    seed: 7,
    start: 0,
    host: { id: 'world', edition: 'control-4', schema: 'control-4' },
    definitions: {
      actions: [],
      norms: [],
      marriageCustoms: [],
      skills: [],
      skillTransfers: [],
      methods: [],
      calendar: {
        id: 'calendar',
        epoch: { id: 'epoch', simulationAt: 0, dayIndex: 0, msOfDay: 0 },
        dayMs: 86400000,
        days: [],
      },
      routines: [],
      lexicon: { names: {}, roles: {}, prefer: 'name', actions: {} },
      sources: [],
    },
    lifecycle: { kinPremises: [], kinScopes: [] },
    world: { revision: 0, facts: [], hostState: null },
  };
}
