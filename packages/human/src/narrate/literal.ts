/** SCOPE: one pure renderer. Visibility is checked before deriving wording or variation.
 * Authored variation uses the event’s recorded choice; fallback keeps event/audience identity.
 * Neither path advances actor RNG or read counts.
 * Authored names/actions remain data. No legacy packs or stored-text rewrites.
 */
import { cloneData } from '../core/clone.ts';
import type {
  DeepReadonly,
  EventData,
  Lexicon,
  Perspective,
  RendererOwner,
  RunEvent,
} from '../run-schema.ts';
import { actionForms, displayName, stableHash } from './lexicon.ts';
import { fillTemplate, NARRATION_TEMPLATES } from './templates.ts';

const LABELS: Readonly<Record<string, string>> = {
  Fajr: 'the dawn prayer',
  Dhuhr: 'the midday prayer',
  Asr: 'the afternoon prayer',
  Maghrib: 'the sunset prayer',
  Isha: 'the night prayer',
  suhoor: 'the meal before dawn',
  iftar: 'the meal to end the fast',
  'Eid prayer': 'the Eid holiday prayer',
  'make-friend': 'making a friend',
  'master-skill': 'learning a skill',
  'earn-respect': 'earning respect',
  serve: 'helping others',
  'make-up': 'a missed commitment to complete later',
};
export function labelLine(label: string): string {
  const known = Object.hasOwn(LABELS, label) ? LABELS[label] : undefined;
  if (known !== undefined) return known;
  if (label.startsWith('make-up ')) {
    const name = label.slice(8);
    if (Object.hasOwn(LABELS, name)) return `${LABELS[name]}, performed later because it was missed`;
  }
  return label;
}
const REASONS: Readonly<Record<string, string>> = {
  dead: 'The person has died.',
  invalid: 'That action does not make sense.',
  break: 'I cannot do that during this breakdown.',
  downed: 'I cannot get up.',
  asleep: 'I am asleep.',
  'not-sleepy': 'I am not sleepy enough.',
  capacity: 'I cannot manage that physically.',
  unavailable: 'That option is not available.',
  distrust: 'I do not trust this advice.',
  commanded: 'I am following an order.',
  command: 'I am following an order.',
  busy: 'I am doing something else right now.',
  'need:food': 'I need to eat first.',
  'need:water': 'I need to drink first.',
  'need:sleep': 'I need to sleep first.',
  'need:rest': 'I need to rest first.',
  'need:bladder': 'I need to use the toilet first.',
  'need:survival': 'I need to meet an urgent bodily need first.',
};
export function reasonLine(reason: string): string {
  const known = Object.hasOwn(REASONS, reason) ? REASONS[reason] : undefined;
  if (known !== undefined) return known;
  const key = reason.split(':')[0];
  switch (key) {
    case 'duty':
      return 'I need to keep this duty.';
    case 'norm':
      return 'This conflicts with a rule I hold.';
    case 'rule':
      return 'This conflicts with a personal rule I set.';
    case 'capacity':
      return 'I cannot manage that physically.';
    case 'skill':
      return 'I do not have enough skill for that.';
    case 'voice':
      return 'I am following another person’s request.';
    default:
      return '';
  }
}
/** Closed projection meanings. Callers must pass only the admitted perspective's evidence. */
export type ProjectionMeaning =
  | { kind: 'maternal-birth' }
  | {
      kind: 'chronicle-change';
      change: 'unprompted' | 'still-prompted' | 'started' | 'stopped' | 'trust' | 'mood';
      subject: string;
      before: number;
      after: number;
    }
  | {
      kind: 'forecast';
      spans: readonly {
        label: string;
        fatigue: number;
        sleepiness: number;
        hunger: number;
        thirst: number;
      }[];
    }
  | { kind: 'attention'; retained: boolean }
  | { kind: 'held-norm'; label: string; conviction: number }
  | { kind: 'mood'; valence: number; arousal?: number }
  | {
      kind: 'trust';
      subject: string;
      store: 'person' | 'advising voice' | 'information source';
      trust: number;
    }
  | { kind: 'no-evidence'; subject: 'held rules' | 'learned trust' };
export function renderProjection(meaning: ProjectionMeaning): string {
  switch (meaning.kind) {
    case 'chronicle-change': {
      const m = meaning;
      switch (m.change) {
        case 'unprompted':
          return `By the end, they did ${labelLine(m.subject)} without being told.`;
        case 'still-prompted':
          return `They still did ${labelLine(m.subject)} after being prompted.`;
        case 'started':
          return `They began ${labelLine(m.subject)}.`;
        case 'stopped':
          return `They stopped ${labelLine(m.subject)}.`;
        case 'trust':
          return `Their trust in ${m.subject} grew ${m.after > m.before ? 'stronger' : 'weaker'}.`;
        case 'mood':
          return `Their recorded mood became ${m.after > m.before ? 'more pleasant' : 'less pleasant'}.`;
      }
      throw new RangeError('Unknown chronicle change');
    }
    case 'maternal-birth':
      return 'I gave birth.';
    case 'forecast':
      return meaning.spans
        .map(
          (s) =>
            `During ${s.label}, I expect ${s.fatigue >= 0.8 ? 'to feel very tired' : s.sleepiness >= 0.8 ? 'to feel very sleepy' : s.thirst >= 0.8 ? 'to need water' : s.hunger >= 0.8 ? 'to need food' : 'to manage my bodily needs'}.`,
        )
        .join(' ');
    case 'attention':
      return meaning.retained
        ? 'Their memories retain some experiences. These do not show everything they noticed.'
        : 'Their records contain no retained experiences. This does not show what they noticed.';
    case 'held-norm':
      return meaning.conviction === 0
        ? `They have a recorded rule, “${labelLine(meaning.label)}”, with no stated conviction.`
        : `They hold an understanding of the rule “${labelLine(meaning.label)}”. This is their view.`;
    case 'mood':
      return meaning.arousal !== undefined
        ? meaning.arousal === 0
          ? 'Their recorded mood is calm.'
          : 'Their recorded mood is stirred.'
        : `Their recorded mood feels ${meaning.valence < 0 ? 'unpleasant' : meaning.valence > 0 ? 'pleasant' : 'neutral'}.`;
    case 'trust':
      return `Their trust in the ${meaning.store} ${meaning.subject} is ${meaning.trust < 0.5 ? 'below' : meaning.trust > 0.5 ? 'above' : 'at'} the middle of its range.`;
    case 'no-evidence':
      return `Their records contain no ${meaning.subject}.`;
  }
}
const list = (items: readonly string[]): string => {
  const xs = items.map(labelLine);
  return xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
};
function visible(e: DeepReadonly<RunEvent>, p: DeepReadonly<Perspective>): boolean {
  if (p.kind === 'host') return true;
  if (e.data.kind === 'claim-told') return e.data.listener === p.observer || e.data.speaker === p.observer;
  return e.person === p.observer;
}
type WordingKey = keyof typeof NARRATION_TEMPLATES;
export function describeWording(
  d: DeepReadonly<EventData>,
  lex: DeepReadonly<Lexicon>,
): { key: string; slots: Record<string, string>; templates: readonly string[] } | undefined {
  const describe = (key: WordingKey, slots: Record<string, string> = {}) => ({
    key,
    slots,
    templates: NARRATION_TEMPLATES[key],
  });
  switch (d.kind) {
    case 'review': {
      const r = d.record;
      if (!r.missed.length)
        return r.kept.length ? describe('review.kept', { items: list(r.kept) }) : undefined;
      return describe(r.resolved.length ? 'review.resolved' : 'review.unresolved', { items: list(r.missed) });
    }
    case 'prompting': {
      const action = actionForms(d.record.action, lex).base;
      return describe(
        d.record.outcome === 'assented'
          ? 'prompting.assented'
          : d.record.outcome === 'turned'
            ? 'prompting.turned'
            : 'prompting.other',
        { action },
      );
    }
    case 'decision': {
      const r = d.decision;
      if (!r.chosenAction) return describe('decision.wait');
      const action = actionForms(r.chosenAction, lex).base;
      const chosen = r.considered.find((c) => c.affordanceId === r.chosenAffordanceId);
      const motive = chosen?.terms.filter((t) => t.value > 0).sort((a, b) => b.value - a.value)[0];
      const why = motive?.source.startsWith('need:')
        ? ` ${reasonLine(motive.source)}`
        : motive?.source.startsWith('norm:')
          ? ' I want to act according to a rule I hold.'
          : motive?.source === 'memory'
            ? ' I remember what happened before.'
            : '';
      return describe('decision.act', { action, why });
    }
    case 'claim-told':
      return describe('claim.told', {
        speaker: displayName(d.speaker, lex),
        prop: d.claim.prop,
        value: d.claim.value ? 'true' : 'false',
      });
    case 'conversation':
      return describe('conversation', {
        speaker: displayName(d.conversation.speaker, lex),
        listener: displayName(d.conversation.listener, lex),
      });
    case 'suggestion-resolved':
      return describe('suggestion.resolved', { verdict: d.resolution.verdict });
    case 'commitment-changed':
      return describe('commitment.changed', {
        label: d.after.label ?? d.after.kind,
        status: d.after.status,
      });
    case 'goal-changed':
      return describe('goal.changed', {
        label: d.after.label,
        status: d.after.status,
      });
    case 'day-closed': {
      const r = d.record,
        parts = [`Day ${r.day}.`];
      if (r.kept.length) parts.push(`I kept ${list(r.kept.map((n) => n.label ?? n.action ?? n.kind))}.`);
      if (r.broken.length)
        parts.push(`I did not keep ${list(r.broken.map((n) => n.label ?? n.action ?? n.kind))}.`);
      if (r.released.length)
        parts.push(`I was released from ${list(r.released.map((n) => n.label ?? n.action ?? n.kind))}.`);
      for (const a of r.actions)
        parts.push(
          `I ${actionForms(a.action, lex).past}${a.prompted === 0 ? ' without being told' : a.prompted === a.done ? ' after being prompted' : ''}.`,
        );
      for (const h of r.habits)
        parts.push(
          `My habit of ${actionForms(h.action, lex).gerund} grew ${h.direction === 'up' ? 'stronger' : 'weaker'}.`,
        );
      for (const t of r.trust)
        parts.push(`I trusted ${displayName(t.voiceId, lex)} ${t.delta > 0 ? 'more' : 'less'}.`);
      if (r.illness.onset.length) parts.push(`I became ill with ${list(r.illness.onset)}.`);
      if (r.illness.recovered.length) parts.push(`I recovered from ${list(r.illness.recovered)}.`);
      if (r.illness.worse.length) parts.push(`${list(r.illness.worse)} became worse.`);
      if (r.illness.better.length) parts.push(`${list(r.illness.better)} became easier to bear.`);
      if (r.breaches.length) parts.push('I acted against rules I hold.');
      if (r.repairs.length) parts.push('I made repairs for past harm.');
      if (r.material !== 0)
        parts.push(
          `My recorded material balance ${r.material > 0 ? 'rose' : 'fell'} by ${Math.abs(r.material)}.`,
        );
      parts.push(...r.episodes.map((e) => e.summary));
      if (!r.alive) parts.push('The person has died.');
      return describe('day.closed', { summary: parts.join(' ') });
    }
    case 'year-closed':
      return describe('year.closed', {
        days: String(d.record.days),
        kept: String(d.record.kept),
        broken: String(d.record.broken),
      });
    case 'body-change': {
      const kind = d.change.kind;
      switch (kind) {
        case 'died':
        case 'dozed':
        case 'woke':
        case 'downed':
        case 'stood':
        case 'injured':
        case 'illness':
          return describe(`body.${kind}`);
        default:
          return undefined;
      }
    }
    case 'crisis':
      return describe(d.change === 'onset' ? 'crisis.onset' : 'crisis.other');
    case 'voice-promise':
      return describe('voice.promise', {
        voice: displayName(d.voiceId, lex),
        outcome: d.kept ? 'kept' : 'broke',
      });
    case 'observation-attended':
      if (d.summary) return describe('observation.summary', { summary: d.summary });
      return d.died === undefined
        ? undefined
        : describe('observation.death', { person: displayName(d.died, lex) });
    default:
      return undefined;
  }
}
export const rendererOwner: RendererOwner = {
  render(event, perspective, lexicon, seed) {
    if (!visible(event, perspective)) return [];
    const descriptor = describeWording(event.data, lexicon);
    if (!descriptor) return [];
    const authored = event.wording?.key === descriptor.key ? lexicon.wordings?.[descriptor.key] : undefined;
    const variants = authored ?? descriptor.templates;
    const audience = perspective.kind === 'host' ? 'host' : `person:${perspective.observer}`;
    const slot =
      authored && event.wording?.key === descriptor.key
        ? event.wording.index
        : stableHash(JSON.stringify(['hf4:renderer:v1', seed, event.id, event.data.kind, audience])) %
          descriptor.templates.length;
    const template = variants[slot];
    if (template === undefined) return [];
    const text = fillTemplate(template, descriptor.slots);
    return [
      {
        eventId: event.id,
        audience: cloneData(perspective),
        text,
        variantId: authored ? `wording:${descriptor.key}:${slot}` : `en:${event.data.kind}:${slot}`,
      },
    ];
  },
};
