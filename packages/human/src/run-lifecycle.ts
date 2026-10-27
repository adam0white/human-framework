/** SCOPE: pure lifecycle inspection from current model or held evidence.
 * No source equations live here. Customs and kin completeness remain premises. */
import { ageYearsAt } from './body/span.ts';
import * as family from './family/family.ts';
import { developmentForAge, learningMultiplier } from './lifecourse/development.ts';
import { chronicHazard, chronicRiskPerYear } from './lifecourse/health.ts';
import { modifiersForAge, stageForAge } from './lifecourse/lifecourse.ts';
import * as partnering from './partnering/partnering.ts';
import { hashCanonical } from './run-canonical.ts';
import { freezeData, readKernel } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import type * as T from './run-schema.ts';
export function knownKin(state: T.DeepReadonly<T.RunState>, scopeId: T.Id, people:readonly[T.Id,T.Id]): T.KinSnapshot {
  const scope = state.lifecycle.kinScopes.find((scope) => scope.id === scopeId);
  if (!scope) throw new RangeError('Unknown declared kin scope');
  if(new Set(people).size!==2||!people.every(id=>scope.people.some(person=>person.id===id)))throw new RangeError('Kin scope does not certify the requested pair');
  if (scope.kinRevision !== state.lifecycle.kinRevision || scope.at !== state.at)
    throw new RangeError('Kin scope is not current');
  return {
    at: state.at,
    kinRevision: state.lifecycle.kinRevision,
    hash: hashCanonical('hf-run4/kin', scope, state.lifecycle.kinPremises),
    roles: state.lifecycle.kinPremises,
    scope,
    unresolved: [],
    marriages: Object.values(state.people).flatMap((actor) =>
      actor.bonds.marriages.map((marriage) => ({
        person: { kind: 'entity' as const, id: actor.id },
        marriage,
      })),
    ),
  };
}
export function inspectLifecycle(
  run: T.Run,
  input: T.DeepReadonly<T.LifecycleQuery>,
  perspective: T.DeepReadonly<T.Perspective>,
): T.Result<T.DeepReadonly<T.LifecycleInspection>> {
  const record = readKernel(run),
    state = record.current,
    p = record.parameters.effective.builtins;
  const actor = (id: T.Id) => {
    const actor = state.people[id];
    if (!actor) throw new RangeError('Unknown lifecycle actor');
    return actor;
  };
  const context = (person: T.Id, at = state.at): T.FrameContext => ({
    person,
    at,
    priorAt: at,
    phase: 0,
    fidelity: state.cursor.fidelity,
    worldRevision: state.world.revision,
    effective: record.parameters.effective,
    effectiveParametersHash: record.parameters.hash,
    causes: [],
  });
  try {
    if (input.kind === 'person') {
      if (perspective.kind !== 'person' || perspective.observer !== input.query.person)
        throw new RangeError('Held lifecycle requires its observer');
      const self = actor(input.query.person),
        other = 'other' in input.query ? input.query.other.id : undefined;
      const relationships = self.social.relationships.filter(
        (tie) => other === undefined || tie.otherId === other,
      );
      const courtships = self.bonds.courtships.filter((tie) => other === undefined || tie.withId === other);
      const marriages = self.bonds.marriages.filter((tie) => other === undefined || tie.spouseId === other);
      return {
        ok: true,
        value: freezeData(
          structuredClone({
            perspective,
            query: input.query,
            basis: 'held-evidence' as const,
            relationships,
            courtships,
            marriages,
            evidenceIds: [],
            unknowns:
              other !== undefined && !relationships.length ? [{ kind: 'entity' as const, id: other }] : [],
          }),
        ),
      };
    }
    if (perspective.kind !== 'host') throw new RangeError('Lifecycle truth requires host perspective');
    const q = input.query;
    const base = {
      perspective: { kind: 'host' as const },
      basis: 'actual-state-and-engineering-model' as const,
    };
    let value: T.DeepReadonly<T.LifecycleInspection>;
    switch (q.kind) {
      case 'aptitude':
        value = {
          ...base,
          query: { ...q, kind: 'aptitude' },
          value: family.aptitudeOf(actor(q.person).family, q.skill),
        };
        break;
      case 'attachment':
        value = {
          ...base,
          query: { ...q, kind: 'attachment' },
          value: family.attachmentOf(actor(q.person).family, p.FAMILY_DEFAULTS),
        };
        break;
      case 'female-fecundity':
        value = {
          ...base,
          query: { ...q, kind: 'female-fecundity' },
          value: family.femaleFecundity(q.ageYears),
        };
        break;
      case 'male-fertility':
        value = { ...base, query: { ...q, kind: 'male-fertility' }, value: family.maleFertility(q.ageYears) };
        break;
      case 'value-plasticity':
        value = {
          ...base,
          query: { ...q, kind: 'value-plasticity' },
          value: family.valuePlasticity(q.ageYears),
        };
        break;
      case 'attachment-plasticity':
        value = {
          ...base,
          query: { ...q, kind: 'attachment-plasticity' },
          value: family.attachmentPlasticity(q.ageYears),
        };
        break;
      case 'conception-chance':
        value = {
          ...base,
          query: { ...q, kind: 'conception-chance' },
          value: family.conceptionChance(
            actor(q.mother),
            actor(q.father),
            state.at,
            q.durationMs,
            p.FAMILY_DEFAULTS,
          ),
        };
        break;
      case 'pregnancy':
        value = {
          ...base,
          query: { ...q, kind: 'pregnancy' },
          value: {
            weeks: family.pregnancyWeeks(actor(q.person).family, q.at),
            due: family.pregnancyDue(actor(q.person).family, q.at),
            pregnancy: actor(q.person).family.pregnancy ?? null,
          },
        };
        break;
      case 'pregnancy-modifiers':
        throw new RangeError('Pregnancy diagnostic awaits the owning pure reader port');
      case 'spouses':
        value = {
          ...base,
          query: { ...q, kind: 'spouses' },
          value: partnering.spousesOf(actor(q.person).bonds),
        };
        break;
      case 'mourning':
        value = {
          ...base,
          query: { ...q, kind: 'mourning' },
          value: partnering.inMourning(actor(q.person).bonds, q.at),
        };
        break;
      case 'widowhood-mortality':
        value = {
          ...base,
          query: { ...q, kind: 'widowhood-mortality' },
          value: partnering.widowhoodMortality(
            actor(q.person).bonds,
            actor(q.person).life.sex,
            q.at,
            p.PARTNERING_DEFAULTS,
          ),
        };
        break;
      case 'values-similarity':
        value = {
          ...base,
          query: { ...q, kind: 'values-similarity' },
          value: partnering.valuesSimilarity(actor(q.a).values, actor(q.b).values),
        };
        break;
      case 'age-fit':
        value = {
          ...base,
          query: { ...q, kind: 'age-fit' },
          value: partnering.ageFit(actor(q.a).life, actor(q.b).life, state.at),
        };
        break;
      case 'attraction':
        value = {
          ...base,
          query: { ...q, kind: 'attraction' },
          value: partnering.attraction(actor(q.a), actor(q.b), state.at),
        };
        break;
      case 'compatibility':
        value = {
          ...base,
          query: { ...q, kind: 'compatibility' },
          value: partnering.compatibility(actor(q.a), actor(q.b)),
        };
        break;
      case 'courtship-stage':
        value = {
          ...base,
          query: { ...q, kind: 'courtship-stage' },
          value: partnering.courtshipStage(actor(q.person).bonds, q.other, q.at, p.PARTNERING_DEFAULTS),
        };
        break;
      case 'kinship':
        value = {
          ...base,
          query: { ...q, kind: 'kinship' },
          value: partnering.kinship(knownKin(state, q.kinScopeId,[q.a,q.b]), q.a, q.b),
        };
        break;
      case 'age':
        value = {
          ...base,
          query: { ...q, kind: 'age' },
          value: ageYearsAt(actor(q.person).life.bornAt, q.at),
        };
        break;
      case 'life-stage':
        value = {
          ...base,
          query: { ...q, kind: 'life-stage' },
          value: stageForAge(ageYearsAt(actor(q.person).life.bornAt, q.at)),
        };
        break;
      case 'life-modifiers':
        value = {
          ...base,
          query: { ...q, kind: 'life-modifiers' },
          value: OWNERS.life.modifiers(actor(q.person).life, context(q.person, q.at)),
        };
        break;
      case 'development':
        value = {
          ...base,
          query: { ...q, kind: 'development' },
          value: developmentForAge(ageYearsAt(actor(q.person).life.bornAt, q.at)),
        };
        break;
      case 'stage-for-age':
        value = { ...base, query: { ...q, kind: 'stage-for-age' }, value: stageForAge(q.ageYears) };
        break;
      case 'modifiers-for-age':
        value = {
          ...base,
          query: { ...q, kind: 'modifiers-for-age' },
          value: modifiersForAge(q.ageYears, p.LIFE_DEFAULTS),
        };
        break;
      case 'development-for-age':
        value = {
          ...base,
          query: { ...q, kind: 'development-for-age' },
          value: developmentForAge(q.ageYears),
        };
        break;
      case 'learning-multiplier':
        value = {
          ...base,
          query: { ...q, kind: 'learning-multiplier' },
          value: learningMultiplier(q.ageYears, q.domain),
        };
        break;
      case 'chronic-risk':
        value = {
          ...base,
          query: { ...q, kind: 'chronic-risk' },
          value: chronicRiskPerYear(
            q.ageYears,
            q.exposures,
            record.parameters.effective.fixedPriors.chronicConditions,
            p.HEALTH_DEFAULTS,
          ),
        };
        break;
      case 'partnering-terms':
        value = {
          ...base,
          query: { ...q, kind: 'partnering-terms' },
          value: OWNERS.partnering.terms(actor(q.person).bonds, q.offer, {
            ...context(q.person, q.at),
            social: actor(q.person).social,
          }),
        };
        break;
      case 'can-marry': {
        const custom = record.spec.definitions.marriageCustoms.find((custom) => custom.id === q.customId);
        if (!custom) throw new RangeError('Unknown marriage custom');
        const kin = knownKin(state, q.kinScopeId,[q.a,q.b]);
        value = {
          ...base,
          query: q,
          value: partnering.canMarry(
            { ...actor(q.a), knownKin: kin },
            { ...actor(q.b), knownKin: kin },
            q.at,
            custom,
            q.guardian,
          ),
        };
        break;
      }
      case 'chronic-hazard': {
        const condition = record.parameters.effective.fixedPriors.chronicConditions.find(
          (condition) => condition.kind === q.conditionId,
        );
        if (!condition) throw new RangeError('Unknown sourced chronic condition');
        value = {
          ...base,
          query: q,
          value: chronicHazard(q.ageYears, condition, q.exposures, p.HEALTH_DEFAULTS),
        };
        break;
      }
      case 'mortality-hazard':
        throw new RangeError('Mortality diagnostic awaits the owning pure reader port');
    }
    return { ok: true, value: freezeData(structuredClone(value)) };
  } catch (error) {
    if (!(error instanceof RangeError || error instanceof TypeError)) throw error;
    return { ok: false, error: { code: 'invalid-admission', path: '$.lifecycle', message: error.message } };
  }
}
