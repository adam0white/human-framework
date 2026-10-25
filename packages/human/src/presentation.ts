/**
 * SCOPE: opt-in English display labels for framework-owned tokens. These readers do not rewrite stored
 * identifiers, labels or host prose. They do not change decisions, religious understandings or RNG state.
 * Unknown reason codes have no plain display text; the host supplies their meaning.
 */
import type { Commitment, Lexicon, NormDefinition } from './types.ts';

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

export function labelLine(label: string, lexicon?: Lexicon): string {
  if (!lexicon?.plainEnglish) return label;
  const known = Object.hasOwn(LABELS, label) ? LABELS[label] : undefined;
  if (known !== undefined) return known;
  const missedName = label.startsWith('make-up ') ? label.slice(8) : '';
  const missed = Object.hasOwn(LABELS, missedName) ? LABELS[missedName] : undefined;
  return missed === undefined ? label : `${missed}, performed later because it was missed`;
}

export function commitmentLabel(c: Pick<Commitment, 'label' | 'kind'>, lexicon?: Lexicon): string {
  if (lexicon?.plainEnglish && c.label === undefined) {
    const kinds: Readonly<Record<string, string>> = {
      worship: 'my prayer',
      promise: 'my promise',
      duty: 'my duty',
      appointment: 'my appointment',
      job: 'my work shift',
      abstain: 'my abstention',
    };
    return Object.hasOwn(kinds, c.kind) ? (kinds[c.kind] ?? c.kind) : c.kind;
  }
  return labelLine(c.label ?? c.kind, lexicon);
}

export function normLabel(norm: Pick<NormDefinition, 'id' | 'label'>, lexicon?: Lexicon): string {
  if (!lexicon?.plainEnglish) return norm.label;
  const labels: Readonly<Record<string, string>> = {
    zakat: 'Give the required share of wealth to those entitled to it',
    charity: 'Give voluntary charity',
    backbiting: 'Speaking about someone in a way they would dislike',
    'kin-marriage': 'Do not marry someone forbidden by the held rules about family relationships',
  };
  return Object.hasOwn(labels, norm.id) ? (labels[norm.id] ?? norm.label) : norm.label;
}

export function reasonLine(reason: string, lexicon?: Lexicon): string {
  if (!lexicon?.plainEnglish) return reason;
  const lines: Readonly<Record<string, string>> = {
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
  if (Object.hasOwn(lines, reason)) return lines[reason] ?? '';
  if (reason.startsWith('duty:')) return 'I need to keep this duty.';
  if (reason.startsWith('norm:')) return 'This conflicts with a rule I hold.';
  if (reason.startsWith('rule:')) return 'This conflicts with a personal rule I set.';
  if (reason.startsWith('capacity:')) return 'I cannot manage that physically.';
  if (reason.startsWith('skill:')) return 'I do not have enough skill for that.';
  if (reason.startsWith('voice:')) return 'I am following another person’s request.';
  return '';
}
