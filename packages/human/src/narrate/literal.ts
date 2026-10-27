/** SCOPE: one pure renderer. Visibility is checked before deriving wording or variation.
 * Variation uses domain-separated event/meaning/audience identity, never actor RNG or read counts.
 * Authored names/actions remain data. No legacy packs or stored-text rewrites.
 */
import type {
  DeepReadonly,
  EventData,
  Lexicon,
  Perspective,
  RendererOwner,
  RunEvent,
} from '../run-schema.ts';
import { actionForms, displayName, stableHash } from './lexicon.ts';

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
  if (Object.hasOwn(LABELS, label)) return LABELS[label]!;
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
  if (Object.hasOwn(REASONS, reason)) return REASONS[reason]!;
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
function wording(d: DeepReadonly<EventData>, lex: DeepReadonly<Lexicon>): readonly string[] {
  switch (d.kind) {
    case 'review': {
      const r = d.record;
      if (!r.missed.length) return r.kept.length ? [`Today I kept ${list(r.kept)}.`] : [];
      if (!r.resolved.length) return [`I keep going back over ${list(r.missed)}.`];
      const next = ' Next time I will be ready when it comes.';
      return [`I did not keep ${list(r.missed)}.${next}`, `I missed ${list(r.missed)}.${next}`];
    }
    case 'prompting': {
      const act = actionForms(d.record.action, lex).base;
      const end =
        d.record.outcome === 'assented'
          ? `I went on to ${act}.`
          : d.record.outcome === 'turned'
            ? 'I used a practised response and turned away.'
            : 'I let the thought pass.';
      return [`I felt a pull to ${act}. ${end}`];
    }
    case 'decision': {
      const r = d.decision;
      if (!r.chosenAction) return ['I will wait.'];
      const act = actionForms(r.chosenAction, lex).base;
      const chosen = r.considered.find((c) => c.affordanceId === r.chosenAffordanceId);
      const motive = chosen?.terms.filter((t) => t.value > 0).sort((a, b) => b.value - a.value)[0];
      const why = motive?.source.startsWith('need:')
        ? ` ${reasonLine(motive.source)}`
        : motive?.source.startsWith('norm:')
          ? ' I want to act according to a rule I hold.'
          : motive?.source === 'memory'
            ? ' I remember what happened before.'
            : '';
      return [`I will ${act}.${why}`, `I have decided to ${act}.${why}`];
    }
    case 'claim-told':
      return [
        `${displayName(d.speaker, lex)} said that ${d.claim.prop} is ${d.claim.value ? 'true' : 'false'}.`,
      ];
    case 'conversation':
      return [
        `${displayName(d.conversation.speaker, lex)} spoke with ${displayName(d.conversation.listener, lex)}.`,
      ];
    case 'suggestion-resolved':
      return [`I ${d.resolution.verdict} the advice.`];
    case 'commitment-changed': {
      const c = d.after;
      return [`${c.label ?? c.kind}: ${c.status}.`];
    }
    case 'goal-changed':
      return [`${d.after.label}: ${d.after.status}.`];
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
      return [parts.join(' ')];
    }
    case 'year-closed':
      return [
        `Across ${d.record.days} recorded days, I kept ${d.record.kept} commitments and broke ${d.record.broken}.`,
      ];
    case 'body-change': {
      const c = d.change;
      if (c.kind === 'died') return ['The person has died.'];
      if (c.kind === 'dozed') return ['I fell asleep.'];
      if (c.kind === 'woke') return ['I woke up.'];
      if (c.kind === 'downed') return ['I cannot get up.'];
      if (c.kind === 'stood') return ['I got up.'];
      if (c.kind === 'injured') return ['I was injured.'];
      if (c.kind === 'illness') return ['I became ill.'];
      return [];
    }
    case 'crisis':
      return [d.change === 'onset' ? 'I cannot continue what I was doing.' : 'I can continue again.'];
    case 'voice-promise':
      return [`${displayName(d.voiceId, lex)} ${d.kept ? 'kept' : 'broke'} their word.`];
    // Administrative events contain no invented subjective experience.
    default:
      return [];
  }
}
export const rendererOwner: RendererOwner = {
  render(event, perspective, lexicon, seed) {
    if (!visible(event, perspective)) return [];
    const variants = wording(event.data, lexicon);
    if (!variants.length) return [];
    const audience = perspective.kind === 'host' ? 'host' : `person:${perspective.observer}`;
    const slot =
      stableHash(JSON.stringify(['hf4:renderer:v1', seed, event.id, event.data.kind, audience])) %
      variants.length;
    return [
      {
        eventId: event.id,
        audience: structuredClone(perspective),
        text: variants[slot]!,
        variantId: `en:${event.data.kind}:${slot}`,
      },
    ];
  },
};
