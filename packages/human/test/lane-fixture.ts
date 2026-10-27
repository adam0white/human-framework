/** Actual canonical parameters for instantaneous owner-port controls. No partial Actor/Person fabrication. */
import { buildParameters } from '../src/run-parameters.ts';
import type { FrameContext } from '../src/run-schema.ts';

export function frame(at = 0, person = 'ada'): FrameContext {
  const parameters = buildParameters();
  if (!parameters.ok) throw new Error(parameters.error.message);
  return {
    effective: parameters.value.effective,
    effectiveParametersHash: parameters.value.hash,
    person,
    at,
    priorAt: at,
    phase: 5,
    fidelity: { mode: 'fine' },
    worldRevision: 0,
    causes: ['owned-receipt'],
  };
}
