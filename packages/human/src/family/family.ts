import { freezeData, required } from '../body/span.ts';
/** SCOPE: actual family receipts and contact-based attachment. No invented kin,
 * pregnancy, caregiver warmth, inherited values or observed contact. */

import { addTime, clip, copy, DAY, minutes, output, validateNumbers, YEAR } from '../body/span.ts';
import { dcos, dlog, dpow } from '../core/libm.ts';
import { random } from '../core/random.ts';
import { deriveAptitudes } from '../lifecourse/birth.ts';
import type * as T from '../run-schema.ts';
export const FAMILY_DEFAULTS = freezeData({
  /** Per-cycle conception chance for a fertile couple at peak age (engineering prior; F14 gives 0.12–0.15 for all couples). */
  peakCycleChance: 0.2,
  cycleDays: 29.5,
  /** Ovulation-to-birth median and sd in days (F13; sd assumed as range/4). */
  gestationDays: 268,
  gestationSdDays: 9,
  /** Metabolism multiplier in the second and third trimesters (assumption). */
  pregnancyMetabolism: 1.15,
  /** Values relaxation per year at full plasticity and full warmth (assumption). */
  valueRatePerYear: 0.05,
  /** Norm-understanding relaxation per year at full plasticity (assumption). */
  normRatePerYear: 0.08,
  /** Breaches in the last year at which a caregiver's example counts for nothing. */
  breachSaturation: 4,
  /** Attachment security at birth (F12). */
  attachmentStart: 0.6,
  /** Attachment relaxation per year at full plasticity (assumption). */
  attachmentRatePerYear: 0.5,
  /** Voice-trust relaxation per year at full plasticity (assumption). */
  voiceRatePerYear: 0.3,
});

export function femaleFecundity(age: number): T.Unit {
  if (age < 15 || age >= 50) return 0;
  if (age <= 30) return 1;
  if (age <= 37) return 1 - (0.5 * (age - 30)) / 7;
  if (age <= 42) return 0.5 - (0.1 * (age - 37)) / 5;
  return 0.4 * (1 - (age - 42) / 8);
}

/** Male fertility by age, 1 = peak (assumption). */
export function maleFertility(age: number): T.Unit {
  if (age < 15) return 0;
  if (age <= 40) return 1;
  return Math.max(0.7, 1 - (0.3 * (age - 40)) / 20);
}

export const valuePlasticity = (age: number) => (age <= 12 ? 1 : clip(1 - (age - 12) / 13));
export const attachmentPlasticity = (age: number) =>
  age <= 3 ? 1 : Math.max(0.1, 1 - (0.9 * (age - 3)) / 9);
export const aptitudeOf = (family: T.DeepReadonly<T.FamilyState>, skill: string) =>
  family.aptitudes[skill] ?? 1;
export const attachmentOf = (
  family: T.DeepReadonly<T.FamilyState>,
  p: T.DeepReadonly<T.Effective_FAMILY_DEFAULTS>,
) => family.attachment ?? p.attachmentStart;
export const pregnancyWeeks = (family: T.DeepReadonly<T.FamilyState>, at: number) =>
  family.pregnancy ? Math.max(0, (at - family.pregnancy.conceivedAt) / (7 * DAY)) : 0;
export const pregnancyDue = (family: T.DeepReadonly<T.FamilyState>, at: number) =>
  family.pregnancy !== undefined && at >= family.pregnancy.dueAt;
const receive: T.FamilyOwner['receive'] = (state, input, ctx) => {
  const s = copy<T.FamilyState>(state);
  let construction: T.FamilyConstructionResult = { kind: 'none' };
  const memoryReceipts: T.MaternalBirthMemory[] = [];
  if (input.type === 'conception' && input.mother.id === ctx.person) {
    if (s.pregnancy) throw new RangeError('pregnancy already open');
    if (ctx.construction.kind !== 'gestation') throw new RangeError('gestation construction cursor required');
    const rng = copy<T.GestationCursor>(ctx.construction.cursor),
      p = ctx.effective.builtins.FAMILY_DEFAULTS;
    const u = Math.max(random(rng.words), 1e-12),
      v = random(rng.words);
    rng.uniformDraws += 2;
    rng.status = 'completed';
    const days = clip(
      p.gestationDays + p.gestationSdDays * Math.sqrt(-2 * dlog(u)) * dcos(2 * Math.PI * v),
      p.gestationDays - 4 * p.gestationSdDays,
      p.gestationDays + 3 * p.gestationSdDays,
    );
    s.pregnancy = {
      id: input.pregnancyId,
      mother: copy<T.ActorRef>(input.mother),
      father: copy<T.KnownFather>(input.father),
      offspring: copy<T.EntityRef>(input.offspring),
      conceivedAt: ctx.at,
      dueAt: addTime(ctx.at, Math.round(days * 1440) * 60000),
      basis: {
        kind: 'derived-gestation',
        conceptionInput: ctx.causes[0] ?? input.basis.evidence.id,
        stream: rng.id,
      },
    };
    construction = { kind: 'gestation', cursor: rng };
  } else if (
    input.type === 'birth' &&
    input.delivery.kind === 'open-pregnancy' &&
    input.delivery.mother.id === ctx.person
  ) {
    const pg = s.pregnancy;
    if (!pg || pg.id !== input.delivery.pregnancyId) throw new RangeError('birth pregnancy mismatch');
    const child =
      input.child.kind === 'reference'
        ? input.child.child
        : {
            kind: 'entity' as const,
            id:
              input.child.newborn.kind === 'authored'
                ? input.child.newborn.person.id
                : input.child.newborn.id,
          };
    if (child.id !== pg.offspring.id) throw new RangeError('birth offspring mismatch');
    delete s.pregnancy;
    memoryReceipts.push({
      kind: 'maternal-birth',
      id: `maternal:${input.basis.evidence.id}`,
      cause: ctx.causes[0] ?? input.basis.evidence.id,
      mother: ctx.person,
      child: copy<T.EntityRef>(child),
      at: ctx.at,
      valence: 0.9,
      salience: 0.95,
    });
  }
  return { ...output(s, ctx.at), memoryReceipts, construction };
};
type ContactSpan = T.SpanContext & {
  life: T.LifeCourse;
  contact: readonly T.FamilyContactReceipt[];
  caregivers: readonly T.UpbringingExposure['caregivers'][number][];
  knownVoices: readonly T.VoiceRelation[];
};
const contactMath = (
  state: T.DeepReadonly<T.FamilyState>,
  ctx: T.DeepReadonly<ContactSpan>,
): T.OwnerOutput<T.FamilyState> & { upbringing: readonly T.UpbringingExposure[] } => {
  const s = copy<T.FamilyState>(state);
  const relevant = ctx.contact.filter(
    (x) => x.person === ctx.person && x.caregiver !== ctx.person && x.to > ctx.from && x.from < ctx.to,
  );
  const edges = [
    ...new Set([
      ctx.from,
      ctx.to,
      ...relevant.flatMap((x) => [Math.max(ctx.from, x.from), Math.min(ctx.to, x.to)]),
    ]),
  ].sort((a, b) => a - b);
  const upbringing: T.UpbringingExposure[] = [];
  const p = ctx.effective.builtins.FAMILY_DEFAULTS;
  for (let j = 0; j < edges.length - 1; j++) {
    const from = required(edges[j]),
      to = required(edges[j + 1]);
    const active = relevant.filter((x) => x.from < to && x.to > from);
    if (!active.length) continue;
    const ids = [...new Set(active.map((x) => x.caregiver))].sort();
    const caregivers = ids
      .map((id) => ctx.caregivers.find((c) => c.id === id))
      .filter((x): x is T.DeepReadonly<T.UpbringingExposure['caregivers'][number]> => x !== undefined);
    minutes(from, to);
    s.raisedMs = (s.raisedMs ?? 0) + (to - from);
    if (caregivers.length) {
      const total = caregivers.reduce((n, c) => n + c.warmth, 0);
      const target =
        total > 0
          ? caregivers.reduce(
              (n, c) => n + c.warmth * clip(0.7 * c.warmth + (0.3 * (c.moodValence + 1)) / 2),
              0,
            ) / total
          : caregivers.reduce((n, c) => n + clip((0.3 * (c.moodValence + 1)) / 2), 0) / caregivers.length;
      // Continuous age forcing, integrated exactly on each quadratic plasticity branch.
      const breaks = [
        from,
        ...[3, 12, 25].map((age) => ctx.life.bornAt + age * YEAR).filter((t) => t > from && t < to),
        to,
      ].sort((a, b) => a - b);
      let exposureYears = 0;
      for (let n = 0; n < breaks.length - 1; n++) {
        const left = required(breaks[n]),
          right = required(breaks[n + 1]);
        const f = (t: number) =>
          attachmentPlasticity((t - ctx.life.bornAt) / YEAR) * valuePlasticity((t - ctx.life.bornAt) / YEAR);
        exposureYears += (((right - left) / YEAR) * (f(left) + 4 * f((left + right) / 2) + f(right))) / 6;
      }
      const k = 1 - dpow(1 - p.attachmentRatePerYear, exposureYears);
      s.attachment = clip(
        (s.attachment ?? p.attachmentStart) + k * (target - (s.attachment ?? p.attachmentStart)),
      );
      upbringing.push({
        id: `contact:${ctx.person}:${from}:${to}:${active
          .map((x) => x.evidenceId)
          .sort()
          .join(':')}`,
        child: ctx.person,
        from,
        to,
        contactEvidenceIds: [...new Set(active.map((x) => x.evidenceId))].sort(),
        caregivers: copy<T.UpbringingExposure['caregivers']>(caregivers),
      });
    }
  }
  return { ...output(s, ctx.to), upbringing };
};
export const familyOwner: T.FamilyOwner = {
  initialize: (input, ctx) => {
    const state = copy<T.FamilyState>(input);
    state.contactCovered = normalizedCoverage(input.contactCovered, ctx.at);
    const known = state.contactCovered.reduce((n, s) => n + s.to - s.from, 0);
    if (state.raisedMs !== undefined && state.raisedMs < known)
      throw new RangeError('family coverage exceeds authored raised time');
    if (known && state.raisedMs === undefined) state.raisedMs = known;
    return state;
  },
  receiveContacts,
  receive,
  advance: (state, ctx) => ({ ...output(copy<T.FamilyState>(state), ctx.to), upbringing: [] }),
  deriveAptitudes,
  validate: (s) => {
    const issues = validateNumbers(s);
    try {
      const coverage = normalizedCoverage(s.contactCovered, Number.MAX_SAFE_INTEGER);
      const known = coverage.reduce((n, x) => n + x.to - x.from, 0);
      if (known > (s.raisedMs ?? 0))
        issues.push({
          path: 'family.contactCovered',
          code: 'invalid-schema',
          message: 'coverage exceeds charged time',
        });
    } catch {
      issues.push({
        path: 'family.contactCovered',
        code: 'invalid-schema',
        message: 'normalized exact contact coverage required',
      });
    }

    for (const [id, x] of Object.entries(s.aptitudes))
      if (x < 0.25 || x > 4)
        issues.push({
          path: `family.aptitudes.${id}`,
          code: 'invalid-schema',
          message: 'aptitude outside [.25,4]',
        });
    if (s.pregnancy && s.pregnancy.dueAt < s.pregnancy.conceivedAt)
      issues.push({
        path: 'family.pregnancy',
        code: 'invalid-schema',
        message: 'incoherent pregnancy times',
      });
    return issues;
  },
};
export function conceptionChance(
  mother: T.DeepReadonly<Pick<T.ActorState, 'body' | 'life' | 'family'>>,
  father: T.DeepReadonly<Pick<T.ActorState, 'body' | 'life'>>,
  at: number,
  durationMs: number,
  p: T.DeepReadonly<T.Effective_FAMILY_DEFAULTS>,
): number {
  if (
    durationMs <= 0 ||
    !mother.body.alive ||
    !father.body.alive ||
    mother.life.sex !== 'female' ||
    father.life.sex !== 'male' ||
    mother.family.pregnancy
  )
    return 0;
  const c =
    p.peakCycleChance *
    femaleFecundity((at - mother.life.bornAt) / YEAR) *
    maleFertility((at - father.life.bornAt) / YEAR);
  return c <= 0 ? 0 : clip(1 - dpow(1 - c, durationMs / DAY / p.cycleDays));
}
// Sole reached-contact learning route. This is discrete learning
// from an actual received summary, never a rewind of body or the live owner clock.
type ContactFamily = T.FamilyState;
type ContactFrame = T.FrameContext & {
  life: T.LifeCourse;
  caregivers: readonly T.UpbringingExposure['caregivers'][number][];
  knownVoices: readonly T.VoiceRelation[];
};
function normalizedCoverage(spans: readonly T.DeepReadonly<T.TimeSpan>[], at: number): T.TimeSpan[] {
  let prior = -Infinity;
  return spans.map((s) => {
    if (
      !Number.isSafeInteger(s.from) ||
      !Number.isSafeInteger(s.to) ||
      s.from >= s.to ||
      s.to > at ||
      s.from <= prior
    )
      throw new RangeError('invalid normalized family contact coverage');
    prior = s.to;
    return { from: s.from, to: s.to };
  });
}
function unionContact(spans: readonly T.TimeSpan[]): T.TimeSpan[] {
  const out: T.TimeSpan[] = [];
  for (const span of [...spans].sort((a, b) => a.from - b.from || a.to - b.to)) {
    const last = out.at(-1);
    if (last && span.from <= last.to) last.to = Math.max(last.to, span.to);
    else out.push({ ...span });
  }
  return out;
}
export function receiveContacts(
  state: T.DeepReadonly<ContactFamily>,
  contacts: T.DeepReadonly<readonly T.FamilyContactReceipt[]>,
  ctx: T.DeepReadonly<ContactFrame>,
): T.OwnerOutput<ContactFamily> & { upbringing: readonly T.UpbringingExposure[] } {
  const covered = normalizedCoverage(state.contactCovered, ctx.at);
  for (const c of contacts)
    if (
      c.person !== ctx.person ||
      c.caregiver === ctx.person ||
      !c.evidenceId ||
      !ctx.caregivers.some((x) => x.id === c.caregiver) ||
      !Number.isSafeInteger(c.from) ||
      !Number.isSafeInteger(c.to) ||
      c.from >= c.to ||
      c.to > ctx.at
    )
      throw new RangeError('actual reached past family contact required');
  const reported = unionContact(contacts.map((c) => ({ from: c.from, to: c.to })));
  const fresh: T.TimeSpan[] = [];
  for (const span of reported) {
    let from = span.from;
    for (const old of covered) {
      if (old.to <= from) continue;
      if (old.from >= span.to) break;
      if (old.from > from) fresh.push({ from, to: Math.min(span.to, old.from) });
      from = Math.max(from, old.to);
      if (from >= span.to) break;
    }
    if (from < span.to) fresh.push({ from, to: span.to });
  }
  let current = copy<ContactFamily>(state);
  const upbringing: T.UpbringingExposure[] = [];
  for (const span of fresh) {
    const r = contactMath(current, {
      ...ctx,
      from: span.from,
      to: span.to,
      phase: 1,
      priorWorldRevision: ctx.worldRevision,
      contact: copy<T.FamilyContactReceipt[]>(contacts),
      life: copy<T.LifeCourse>(ctx.life),
      caregivers: copy<T.UpbringingExposure['caregivers']>(ctx.caregivers),
      knownVoices: copy<T.VoiceRelation[]>(ctx.knownVoices),
    });
    current = { ...r.state, contactCovered: current.contactCovered };
    upbringing.push(...r.upbringing);
  }
  current.contactCovered = unionContact([...covered, ...fresh]);
  return { ...output(current, ctx.at), upbringing };
}
