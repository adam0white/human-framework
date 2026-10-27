/** SCOPE: detached current reads. Subjective views use only the observer's own
 * stores. Unknown other-person facts stay unknown. No RNG or normal-read hash. */

import { cloneData } from './core/clone.ts';
import { exportRun } from './run.ts';
import { PORTABLE_ADMISSION_REJECTED } from './run-admission.ts';
import { freezeData, readKernel } from './run-kernel.ts';
import { OWNERS } from './run-owners.ts';
import { bodyPerception } from './run-person.ts';
import type * as T from './run-schema.ts';
import { validateData } from './run-validation.ts';
import { projectEvents } from './run-view.ts';
import { skillLevel } from './skills/skills.ts';

function fail(
  path: string,
  message: string,
  code: T.ContractError['code'] = 'invalid-admission',
): T.Result<never> {
  return { ok: false, error: { code, path, message } };
}
export function inspectCurrentRun(
  run: T.Run,
  input: T.DeepReadonly<T.InspectQuery>,
): T.Result<T.DeepReadonly<T.Inspection>> {
  const admitted = validateData('InspectQuery', input);
  if (!admitted.ok) return admitted;
  const q = admitted.value;
  const record = readKernel(run),
    state = record.current;
  if (new Set(q.people).size !== q.people.length || new Set(q.select).size !== q.select.length)
    return fail('$', 'duplicate person or selection', 'duplicate-id');
  for (const id of q.people)
    if (!Object.hasOwn(state.people, id)) return fail('$.people', `unknown person ${id}`, 'unknown-id');
  if (q.perspective.kind === 'person' && !Object.hasOwn(state.people, q.perspective.observer))
    return fail('$.perspective.observer', 'unknown observer', 'unknown-id');
  if (q.diagnostic && q.perspective.kind !== 'host')
    return fail('$.diagnostic', 'full hash requires privileged host perspective');
  if (q.lifecycle) return fail('$.lifecycle', 'C0 lifecycle reader composition required');
  if (
    q.perspective.kind === 'host' &&
    q.select.some((s) => s === 'persona' || s === 'calendar' || s === 'chapter')
  )
    return fail('$.select', PORTABLE_ADMISSION_REJECTED, 'invalid-admission');
  let start = 0;
  if (q.afterEvent !== undefined) {
    const index = state.events.findIndex((e) => e.id === q.afterEvent);
    if (index < 0) return fail('$.afterEvent', 'unknown event cursor', 'unknown-id');
    const cursor = state.events[index];
    if (!cursor) return fail('$.afterEvent', 'unknown event cursor', 'unknown-id');
    const requestId = cursor.data.kind === 'claim-told' ? cursor.data.deliveryRequestId : undefined;
    const related =
      requestId === undefined
        ? []
        : state.events.filter(
            (e) => e.data.kind === 'communication-requested' && e.data.request.id === requestId,
          );
    if (
      !projectEvents(
        [...related, cursor],
        q.perspective,
        record.spec.definitions.lexicon,
        record.spec.seed,
        state.receipts.communications,
      ).some((e) => e.id === cursor.id)
    )
      return fail('$.afterEvent', 'unknown event cursor', 'unknown-id');
    start = index + 1;
  }
  const events = q.select.includes('events')
    ? projectEvents(
        state.events.slice(start),
        q.perspective,
        record.spec.definitions.lexicon,
        record.spec.seed,
        state.receipts.communications,
      )
    : [];
  const context = (person: T.PersonId): T.FrameContext => ({
    effective: record.parameters.effective,
    effectiveParametersHash: record.parameters.hash,
    person,
    at: state.at,
    priorAt: state.at,
    phase: state.cursor.phase,
    fidelity: state.cursor.fidelity,
    worldRevision: state.world.revision,
    causes: [],
  });
  const readings = (actor: T.ActorState): T.SkillReading[] =>
    Object.entries(actor.skills).map(([id, skill]) => ({
      id,
      competence: skillLevel({ ...actor, now: state.at, effective: record.parameters.effective }, id),
      practicedMs: skill.practicedMs,
      lastPracticed: skill.lastPracticed,
    }));
  const body = (actor: T.ActorState) =>
    OWNERS.body.read(actor.body, { ...context(actor.id), perception: bodyPerception(actor, state.at) });
  const people: T.DeepReadonly<T.PersonView>[] = [];
  for (const id of q.people) {
    const actor = state.people[id];
    if (!actor) return fail('$.people', 'unknown person', 'unknown-id');
    if (q.perspective.kind === 'host') {
      const parts: T.DeepReadonly<T.SelectedPart<T.HostParts>>[] = [];
      for (const select of q.select)
        switch (select) {
          case 'summary':
            parts.push({
              select,
              value: {
                name: actor.name,
                alive: actor.body.alive,
                activity: actor.activity
                  ? { id: actor.activity.id, actionId: actor.activity.offer.actionId }
                  : null,
              },
            });
            break;
          case 'skills':
            parts.push({ select, value: readings(actor) });
            break;
          case 'body':
            parts.push({ select, value: { state: actor.body, readout: body(actor) } });
            break;
          case 'beliefs':
            parts.push({ select, value: actor.memory.beliefs });
            break;
          case 'relationships':
            parts.push({ select, value: { ties: actor.social.relationships, voices: actor.will.voices } });
            break;
          case 'methods':
            parts.push({ select, value: actor.methods });
            break;
          case 'agenda':
            parts.push({ select, value: actor.agenda });
            break;
          case 'events':
            parts.push({
              select,
              value: events.filter((e) => state.events.find((raw) => raw.id === e.id)?.person === id),
            });
            break;
        }
      people.push({ kind: 'host', id, parts });
    } else if (q.perspective.observer === id) {
      const parts: T.DeepReadonly<T.SelectedPart<T.SelfParts>>[] = [];
      for (const select of q.select)
        switch (select) {
          case 'summary':
            parts.push({ select, value: { name: actor.name, mood: actor.affect.mood } });
            break;
          case 'skills':
            parts.push({ select, value: readings(actor) });
            break;
          case 'body':
            parts.push({ select, value: { perceived: body(actor).perceived } });
            break;
          case 'beliefs':
            parts.push({ select, value: actor.memory.beliefs });
            break;
          case 'relationships':
            parts.push({ select, value: { ties: actor.social.relationships, voices: actor.will.voices } });
            break;
          case 'methods':
            parts.push({ select, value: actor.methods });
            break;
          case 'agenda':
            parts.push({ select, value: actor.agenda });
            break;
          case 'events':
            parts.push({ select, value: events });
            break;
          case 'persona':
            parts.push({ select, value: { kind: 'unavailable', reason: 'privileged-projection' } });
            break;
          case 'calendar':
            parts.push({
              select,
              value: { kind: 'known', value: actor.agenda.commitments, evidenceIds: [] },
            });
            break;
          case 'chapter':
            parts.push({ select, value: { kind: 'unavailable', reason: 'host-narrative-clock' } });
            break;
        }
      people.push({ kind: 'self', id, parts });
    } else {
      // Never read target faculties to estimate what the observer has learned.
      // There is no admitted observation-to-skill/body/agenda projector yet.
      const observer = state.people[q.perspective.observer];
      const impressions = observer?.social.impressions.find((i) => i.targetId === id)?.cues ?? [];
      const parts: T.DeepReadonly<T.SelectedPart<T.OtherParts>>[] = [];
      for (const select of q.select)
        switch (select) {
          case 'summary':
            parts.push({ select, value: { signs: { kind: 'unobserved' }, impressions } });
            break;
          case 'skills':
          case 'body':
          case 'beliefs':
          case 'relationships':
          case 'methods':
          case 'agenda':
          case 'calendar':
            parts.push({ select, value: { kind: 'unobserved' } });
            break;
          case 'events':
            parts.push({ select, value: events });
            break;
          case 'persona':
            parts.push({ select, value: { kind: 'unavailable', reason: 'privileged-projection' } });
            break;
          case 'chapter':
            parts.push({ select, value: { kind: 'unavailable', reason: 'host-narrative-clock' } });
            break;
        }
      people.push({ kind: 'other', id, parts });
    }
  }
  let skill: T.SkillSuccess | undefined;
  let method: T.DeepReadonly<T.MethodEvidence> | undefined;
  if (q.skill) {
    const s = q.skill;
    if (!q.people.includes(s.person)) return fail('$.skill.person', 'skill person must be selected');
    if (q.perspective.kind !== 'host' && q.perspective.observer !== s.person)
      return fail('$.skill', 'current private skill requires host or self');
    if (!record.spec.definitions.skills.some((d) => d.id === s.skill))
      return fail('$.skill.skill', 'unknown skill', 'unknown-id');
    const actor = state.people[s.person];
    if (!actor) return fail('$.skill.person', 'unknown person', 'unknown-id');
    const capacity = body(actor).capacity;
    skill = {
      person: s.person,
      skill: s.skill,
      competence: skillLevel({ ...actor, now: state.at, effective: record.parameters.effective }, s.skill),
      capacity,
      successChance: OWNERS.skills.successChance(
        actor,
        { skill: s.skill, difficulty: s.difficulty, capacity, support: s.support ?? 0 },
        context(s.person),
      ),
    };
  }
  if (q.method) {
    const m = q.method;
    if (!q.people.includes(m.person)) return fail('$.method.person', 'method person must be selected');
    if (q.perspective.kind !== 'host' && q.perspective.observer !== m.person)
      return fail('$.method', 'private method evidence requires host or self');
    const actor = state.people[m.person];
    if (!actor) return fail('$.method.person', 'unknown person', 'unknown-id');
    if (!record.spec.definitions.actions.some((a) => a.id === m.action))
      return fail('$.method.action', 'unknown action', 'unknown-id');
    const book = state.offers[m.person];
    const available =
      book?.offers.some(
        (o) =>
          o.actionId === m.action &&
          !book.rejected.some((r) => r.offerId === o.id && r.offerRevision === book.revision),
      ) ?? false;
    method = OWNERS.methods.evidence(actor.methods, {
      ...context(m.person),
      action: m.action,
      contextId: m.contextId,
      available,
      sourceTrust: Object.entries(actor.memory.sourceTrust).map(([sourceId, trust]) => ({ sourceId, trust })),
      voices: actor.will.voices,
    });
  }
  const result: T.DeepReadonly<T.Inspection> = {
    at: state.at,
    perspective: q.perspective,
    people,
    events,
    ...(skill ? { skill } : {}),
    ...(method ? { method } : {}),
    ...(q.diagnostic ? { fullHash: exportRun(run).hashes.full } : {}),
  };
  return { ok: true, value: freezeData(cloneData(result)) };
}
