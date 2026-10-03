/**
 * SCOPE: keyed narration templates, host phrase packs and name/role lookup (N6). Every English sentence the
 * framework narrates lives in `EN_LINES` under a stable key; a host `Lexicon` replaces (`lines`) or extends
 * (`extend`) any key, names entities ("Selin") and maps relationship roles to nouns ("daughter") so narration
 * can say "my daughter" or "his daughter". Selection stays deterministic: a template is picked by an FNV hash of
 * a caller key (a decision id, a day index), never by the person's RNG. This is presentation only. It is
 * locale-ready in the narrow sense that every string is keyed and slot-filled; grammar (plural, case, verb
 * agreement) beyond the slots is not modelled, so a locale pack supplies whole sentences per key. Nothing here
 * reads back into the simulation.
 */
import type { EntityId, Lexicon, Person } from '../types.ts';

/** FNV-1a 32-bit hash for deterministic template selection. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The default English templates. Slots are `{name}`; the slot names used by each key are listed in its comment
 * group. Order matters: selection is `hash(key) % length`, so reordering changes which line a record gets.
 */
export const EN_LINES: Readonly<Record<string, readonly string[]>> = {
  // Decision lines by dominant need (no slots).
  'need:food': ["I'm starving — eating first.", 'My stomach is growling. Food first.', 'I need to eat.'],
  'need:water': ["I'm parched. Water first.", 'I need a drink of water.', 'Thirsty — the well, then.'],
  'need:sleep': [
    "I can't keep my eyes open. Bed.",
    "I'm exhausted; I need to sleep.",
    'Sleep, before anything else.',
  ],
  'need:rest': ['I need to sit down for a while.', 'A rest first, then the rest.'],
  'need:relief': ['This pain needs seeing to.', "I can't think past the pain."],
  'need:belonging': ["I've been alone too long. I want company.", 'Let me find someone to talk to.'],
  'need:leisure': ['I need a break from all this.', 'Time for something easier.'],
  'need:meaning': ['I want to do something that matters.', 'Something worthwhile, for once.'],
  'need:competence': ['I want to get better at this.', 'Practice makes the hand steady.'],
  'need:esteem': ['I want to be seen doing well.', 'Let me show what I can do.'],
  'need:autonomy': ['My choice, this time.', "I'll do what I decide to do."],
  'need:safety': ['I want to feel safe first.', 'Caution, for now.'],
  /** {need} */
  'need:fallback': ['I need {need}.'],
  // Decision lines by other dominant sources.
  'source:habit': ['Same as always.', 'Out of habit, really.', "It's what I do at this hour."],
  'source:effort': ['The easy thing, for now.', 'Nothing strenuous.'],
  'source:material': ['There is money in it.', 'It pays.'],
  'source:expectation': ['It went well last time.', 'I know how this goes.'],
  'source:conscience:repair': ['I owe them that much.', 'I have to make this right.'],
  'source:conscience:repent': ['I need to set things right with God.', 'I have wrongs to turn from.'],
  'source:preference': ['Why not.', 'This will do.', 'Might as well.'],
  // Verbs for refusing a forbidden act ("I won't {verb}").
  'normVerb:theft': ['steal'],
  'normVerb:lying': ['lie'],
  'normVerb:harm-others': ['hurt anyone'],
  'normVerb:intoxicants': ['drink that'],
  'normVerb:backbiting': ['talk behind their back'],
  'normVerb:forbidden-food': ['eat that'],
  'normVerb:default': ['do that'],
  'normLabel:sawm-ramadan': ['my fast'],
  'normLabel:default': ['what I have undertaken'],
  // Lines for fulfilling a held norm.
  'normFulfil:salah': ['Time to pray.', 'Prayer first; the rest can wait.', 'I will pray, then see.'],
  'normFulfil:charity': ['I can spare some for others.', 'Charity, while I can.'],
  'normFulfil:help-neighbor': ['They need a hand.', 'A neighbour should help.'],
  'normFulfil:keep-promise': ['I gave my word.', 'I said I would.'],
  'normFulfil:kindness-to-parents': ['For my parents.'],
  'normFulfil:gratitude': ['I should say thank you.'],
  'normFulfil:default': ['It is the right thing.', 'Because I should.'],
  // Emotion lines keyed by the tag the tendency acts through.
  'emotion:social': ['I want company.', "I'd like someone to talk to."],
  'emotion:worship': ['My heart turns to prayer.', 'I want to be near God.'],
  'emotion:novel': ['I want something different.', "I'm restless."],
  'emotion:rest': ['I need a break.', "I've had enough for now."],
  'emotion:comfort': ['I need some comfort.', 'I want to feel safe.'],
  'emotion:repair': ['I have to put this right.', "It's weighing on me."],
  'emotion:risky': ["I'm in the mood for it.", 'Why not.'],
  'emotion:default': ['I feel like it.', 'My mood says so.'],
  // Other decision lines. decision.social: {who}.
  'decision.nothing': ["There's nothing I can do right now.", 'Nothing for it but to wait.'],
  'decision.complied': ['You insisted, so I will.', "I'd rather not, but you insist."],
  'decision.commitment': ['I said I would, so I will.', 'I have to keep to it.'],
  'decision.goal': ['Another step toward what I want.', 'Keeping at it.'],
  'decision.social': ["I'd like to see {who}.", 'Time with {who}.'],
  'decision.suggestion': ['You asked, so I will.', 'Fine, since you suggest it.'],
  'decision.closeCall': ['It was a close call.', 'Nearly did otherwise.'],
  /** {summary}: the episode summary, lower-cased, ending with a full stop. */
  'cite.bad': ['Last time, {summary}'],
  'cite.good': ['I remember: {summary}'],
  // Intentions (single phrases). intention.need: {need}; promiseTo/for/suggestionBy: {who}; goal: {goal}.
  'intention:food': ['to feed myself'],
  'intention:water': ['to drink'],
  'intention:sleep': ['to sleep'],
  'intention:rest': ['to rest'],
  'intention:relief': ['to ease the pain'],
  'intention:belonging': ['to be with people'],
  'intention:leisure': ['to enjoy myself'],
  'intention:meaning': ['to do something that matters'],
  'intention:competence': ['to get better'],
  'intention:esteem': ['to be respected'],
  'intention:autonomy': ['to choose for myself'],
  'intention:safety': ['to be safe'],
  'intention.need': ['to meet my need for {need}'],
  'intention.none': ['nothing to do'],
  'intention.complied': ['because you insisted'],
  'intention.default': ['because it suits me'],
  'intention.right': ['because it is right'],
  'intention.repair': ['to make amends'],
  'intention.repent': ['to turn back from wrong'],
  'intention.promiseTo': ['to keep my promise to {who}'],
  'intention.word': ['to keep my word'],
  'intention.goal': ['to {goal}'],
  'intention.goalFallback': ['for my goal'],
  'intention.group': ['to be among people'],
  'intention.for': ['for {who}'],
  'intention.suggestion': ['because you asked'],
  'intention.suggestionBy': ['because {who} asked'],
  'intention.habit': ['out of habit'],
  'intention.emotion': ['because I feel like it'],
  'intention.material': ['to earn'],
  'intention.precommit': ['because I resolved to'],
  'intention.expectation': ['because it worked before'],
  'devotion.allah': ['for Allah'],
  'devotion.god': ['for God'],
  'devotion.keep': ['to keep my devotion'],
  // Spoken replies to a suggestion. deferred: {After}; modified: {alt}; distrust.episode: {what};
  // omission: {what}; willNot: {verb}.
  'voice.assented.trusted': ["I trust you — fine, I'll go.", 'Good idea. On it.'],
  'voice.assented': ["Alright, I'll do it.", 'Fine.'],
  'voice.complied': ['Fine. Since you insist.', "If you insist. I'd rather not."],
  'voice.deferred': ['Not now. {After}.', '{After}, then I will.'],
  'voice.deferred.default': ['later'],
  'voice.modified': ["I'll {alt} instead.", "Not that — I'll {alt}."],
  'voice.modified.default': ['something like it'],
  'voice.distrust.episode': [
    'Last time you sent me: {what}. Not again.',
    'No. I remember last time: {what}.',
  ],
  'voice.distrust': ['Why would I listen to you?', "You've pushed me enough."],
  'voice.omission': ["I won't miss {what}, whatever you say.", 'No. Not at the cost of {what}.'],
  'voice.omission.prayer': ['my prayer'],
  'voice.omission.default': ['my duty'],
  'voice.willNot': ["I won't {verb}, whatever you say.", "No. I don't {verb}."],
  'voice.duty': ["Not while I'm keeping {what}.", 'No. Not against {what}.'],
  'voice.asleep': ["I'm asleep."],
  'voice.survival': ["I can't, not in this state."],
  'voice.notSleepy': ["I'm not tired."],
  'voice.unavailable': ["That isn't on offer here now.", 'Not now, not here.'],
  'voice.invalid': ["That doesn't make sense."],
  'voice.capacity': ["I can't. I'm spent.", "I haven't the strength."],
  'voice.skill': ["I don't know how."],
  'voice.cannot': ["I can't right now.", "That isn't possible."],
  'needFirst:need:food': ['I have to eat first.'],
  'needFirst:need:water': ['I have to drink first.'],
  'needFirst:need:sleep': ['I have to sleep first.'],
  'needFirst:need:rest': ['I have to rest first.'],
  // Person summary. describe.line: {name} {act} {state}; describe.dead: {name}; describe.feeling: {emotion}.
  'describe.dead': ['{name} has died.'],
  'describe.line': ['{name}: {act}; {state}.'],
  'describe.idle': ['idle'],
  'describe.well': ['well'],
  'describe.asleep': ['asleep'],
  'describe.hungry': ['hungry'],
  'describe.thirsty': ['thirsty'],
  'describe.tired': ['tired'],
  'describe.pain': ['in pain'],
  'describe.feeling': ['feeling {emotion}'],
  // Names and roles. role.phrase: {poss} {role}.
  'word.them': ['them'],
  'role.phrase': ['{poss} {role}'],
  'role:spouse': ['spouse'],
  'role:parent': ['parent'],
  'role:child': ['child'],
  // Chronicle (third/first person via {Subj}/{subj}/{obj}/{poss}/{Poss}). See `chronicle/story.ts`.
  /** {label} {n} {days} */
  'chronicle.prayer.all': ['{Subj} prayed {label} every day.'],
  'chronicle.prayer.one': ['{Subj} prayed {label}.'],
  'chronicle.prayer': ['{Subj} prayed {label} on {n} of {days} days.'],
  'chronicle.prayer.never': ['{Subj} did not pray {label}.'],
  /** {past} {n} {days} */
  'chronicle.action.all': ['{Subj} {past} every day.'],
  'chronicle.action': ['{Subj} {past} on {n} of {days} days.'],
  /** {kept} {total} {kinds} */
  'chronicle.kept': ['{Subj} kept {kept} of {total} {kinds}.'],
  /** {who} */
  'chronicle.trust.up': ['{Subj} came to trust {who} more.'],
  'chronicle.trust.down': ['{Subj} trusted {who} less by the end.'],
  /** {gerund} {Gerund} {when} (' around 05:00' or '') */
  'chronicle.habit.formed': ['{Gerund}{when} had become a habit.'],
  'chronicle.habit.faded': ['The habit of {gerund}{when} faded.'],
  /** {hour} */
  'chronicle.when': [' around {hour}'],
  /** Verb forms for a prayer by label. {label} */
  'prayer.base': ['pray {label}'],
  'prayer.past': ['prayed {label}'],
  'prayer.gerund': ['praying {label}'],
  /** {times} ('once' / '3 times') {n} {m} */
  /** {m} repairs to a wronged person, {k} breaches without a victim the person turned back from */
  'chronicle.breaches': ['{Subj} went against {poss} own standards {times} and made amends for {m}.'],
  'chronicle.breaches.turned': ['{Subj} went against {poss} own standards {times} and turned back from {k}.'],
  'chronicle.breaches.both': [
    '{Subj} went against {poss} own standards {times}, made amends for {m} and turned back from {k}.',
  ],
  'chronicle.breaches.none': ['{Subj} went against {poss} own standards {times}.'],
  /** {n} */
  'word.once': ['once'],
  'word.times': ['{n} times'],
  /** {amount} */
  'chronicle.material.gain': ['{Subj} came out {amount} ahead.'],
  'chronicle.material.loss': ['{Subj} ended {amount} behind.'],
  /** {kinds} */
  'chronicle.illness': ['{Subj} fell ill: {kinds}.'],
  'chronicle.mood.up': ['{Poss} spirits lifted over those days.'],
  'chronicle.mood.down': ['{Poss} spirits sank over those days.'],
  /** {summary} */
  'chronicle.episode': ['What stayed with {obj}: {summary}'],
  /** {day} */
  'chronicle.died': ['{Subj} died on day {day}.'],
  'chronicle.empty': ['Nothing was recorded.'],
  /** {past} {label} */
  'diff.unprompted': ['By the end {subj} {past} without being told.'],
  'diff.stillPrompted': ['{Subj} still needed telling to {base}.'],
  'diff.started': ['By the end {subj} {past} most days, which {subj} had rarely done before.'],
  'diff.stopped': ['By the end {subj} had mostly stopped: {gerund}.'],
  /** {who} */
  'diff.trust.up': ['{Subj} trusted {who} more than before.'],
  'diff.trust.down': ['{Subj} trusted {who} less than before.'],
  'diff.mood.up': ['{Poss} spirits were higher.'],
  'diff.mood.down': ['{Poss} spirits were lower.'],
  'diff.none': ['Little had changed.'],
  // Plural nouns for commitment kinds in chronicle counts.
  'kinds:promise': ['promises'],
  'kinds:duty': ['duties'],
  'kinds:appointment': ['appointments'],
  'kinds:worship': ['prayers'],
  'kinds:job': ['work shifts'],
  'kinds:abstain': ['abstentions'],
  'kinds:default': ['commitments'],
};

/** Templates for a key after the lexicon's replacements and extensions; empty when unknown. */
export function linesFor(key: string, lex?: Lexicon): readonly string[] {
  const base = lex?.lines?.[key] ?? EN_LINES[key] ?? [];
  const more = lex?.extend?.[key];
  return more && more.length > 0 ? [...base, ...more] : base;
}

/** Replace `{slot}` with `vars.slot`; unknown slots are left as written. */
export function fillTemplate(template: string, vars: Readonly<Record<string, string | number>> = {}): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (m, k: string) => {
    const v = vars[k];
    return v === undefined ? m : String(v);
  });
}

/**
 * A line for `key`, picked deterministically by `pickKey` (+ `salt`) and slot-filled. Falls back to `fallback`
 * (also slot-filled) when the key has no templates.
 */
export function pickLine(
  key: string,
  pickKey: string,
  vars: Readonly<Record<string, string | number>> = {},
  lex?: Lexicon,
  salt = 0,
  fallback = '',
): string {
  const items = linesFor(key, lex);
  if (items.length === 0) return fillTemplate(fallback, vars);
  return fillTemplate(items[(hashString(pickKey) + salt) % items.length] as string, vars);
}

/** The single phrase for a key (its first template), slot-filled. */
export const phraseLine = (
  key: string,
  vars: Readonly<Record<string, string | number>> = {},
  lex?: Lexicon,
  fallback = '',
): string => fillTemplate(linesFor(key, lex)[0] ?? fallback, vars);

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** Built-in role nouns, checked in this order when the lexicon maps none of a relationship's roles. */
const DEFAULT_ROLES = ['spouse', 'parent', 'child'] as const;

export interface NameOptions {
  /** Possessive for role phrases: 'my' (default, first person), 'his', 'her', 'their'. */
  possessive?: string;
  /** Overrides `lexicon.prefer`. */
  prefer?: 'name' | 'role';
}

/**
 * How `p` refers to `id` in narration: a lexicon name ("Selin"), a role phrase ("my daughter", from a lexicon
 * role noun for one of the relationship's roles, else the built-in spouse/parent/child), or the raw id.
 * `lexicon.prefer: 'role'` puts the role first. Without a lexicon this is the pre-N6 behaviour.
 */
export function nameOf(
  p: Person,
  id: EntityId | undefined,
  lexicon?: Lexicon,
  opts: NameOptions = {},
): string {
  const lex = lexicon ?? p.lexicon;
  if (!id) return phraseLine('word.them', {}, lex, 'them');
  const name = lex?.names?.[id];
  const rel = p.social.relationships.find((r) => r.otherId === id);
  let role: string | undefined;
  if (rel) {
    for (const r of rel.roles) {
      const noun = lex?.roles?.[r];
      if (noun !== undefined) {
        role = noun;
        break;
      }
    }
    if (role === undefined) {
      const builtin = DEFAULT_ROLES.find((r) => rel.roles.includes(r));
      if (builtin) role = phraseLine(`role:${builtin}`, {}, lex, builtin);
    }
  }
  const rolePhrase =
    role === undefined ? undefined : phraseLine('role.phrase', { poss: opts.possessive ?? 'my', role }, lex);
  const prefer = opts.prefer ?? lex?.prefer ?? 'name';
  if (prefer === 'name') return name ?? rolePhrase ?? id;
  return rolePhrase ?? name ?? id;
}

/** Display name for an entity without a person's relationships (lexicon name, else the id). */
export const displayName = (id: EntityId, lexicon?: Lexicon): string => lexicon?.names?.[id] ?? id;

const IRREGULAR_PAST: Record<string, string> = {
  eat: 'ate',
  sleep: 'slept',
  drink: 'drank',
  sit: 'sat',
  go: 'went',
  read: 'read',
  run: 'ran',
  buy: 'bought',
  make: 'made',
  take: 'took',
  give: 'gave',
  see: 'saw',
  meet: 'met',
  teach: 'taught',
  write: 'wrote',
  bring: 'brought',
  think: 'thought',
  fight: 'fought',
  feed: 'fed',
  build: 'built',
  sell: 'sold',
  tell: 'told',
  speak: 'spoke',
  do: 'did',
  have: 'had',
  pay: 'paid',
  steal: 'stole',
  wake: 'woke',
};

function regularPast(verb: string): string {
  if (IRREGULAR_PAST[verb]) return IRREGULAR_PAST[verb] as string;
  if (verb.endsWith('e')) return `${verb}d`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
  return `${verb}ed`;
}

function regularGerund(verb: string): string {
  if (verb.endsWith('ie')) return `${verb.slice(0, -2)}ying`;
  if (verb.endsWith('e') && !verb.endsWith('ee') && verb.length > 2) return `${verb.slice(0, -1)}ing`;
  return `${verb}ing`;
}

/**
 * Verb forms for an action id: the lexicon's forms, else derived from the id ('work-field' → base 'work field',
 * past 'worked field', gerund 'working field'). English-only derivation; locale packs should list forms.
 */
export function actionForms(
  action: string,
  lexicon?: Lexicon,
): { base: string; past: string; gerund: string } {
  const given = lexicon?.actions?.[action];
  const base = given?.base ?? action.replace(/[-_]/g, ' ');
  const [verb = base, ...rest] = base.split(' ');
  const tail = rest.length > 0 ? ` ${rest.join(' ')}` : '';
  return {
    base,
    past: given?.past ?? `${regularPast(verb)}${tail}`,
    gerund: given?.gerund ?? `${regularGerund(verb)}${tail}`,
  };
}
