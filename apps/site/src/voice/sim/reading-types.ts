/** Voice's display and world vocabulary. Live actor values come only from public HF4 inspections and events. */
import type {
  Inspection,
  Offer,
  PersonAuthoring,
  PersonId,
  Lexicon as PublicLexicon,
  Signed,
  StepResult,
  Unit,
} from '@adam0white/human-framework';

export type { PersonId, Signed, Unit };
export type Minute = number;
export type EntityId = string;
type Mutable<T> = T extends readonly (infer E)[]
  ? Mutable<E>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
type HostView = Extract<Inspection['people'][number], { kind: 'host' }>;
type Part<K extends HostView['parts'][number]['select']> = Mutable<
  Extract<HostView['parts'][number], { select: K }>['value']
>;
type Event = StepResult['events'][number];
type State = Mutable<PersonAuthoring['state']>;
export type NativeDecision = Mutable<Extract<Event['data'], { kind: 'decision' }>['decision']>;
export type SuggestionResolution = NonNullable<NativeDecision['suggestion']> & { says: string };
export type DecisionRecord = Omit<NativeDecision, 'suggestion' | 'suggestions'> & {
  suggestion?: SuggestionResolution;
  suggestions?: SuggestionResolution[];
};
export type DayRecord = Mutable<Extract<Event['data'], { kind: 'day-closed' }>['record']>;
export type Considered = DecisionRecord['considered'][number];
export type Term = Considered['terms'][number];
export type Suggestion = Omit<
  Extract<
    import('@adam0white/human-framework').Payloads['suggestion.received']['received'],
    { kind: 'ordinary' }
  >['suggestion'],
  'adviceId'
>;
export type SuggestionVerdict = SuggestionResolution['verdict'];
type AuthoredEpisode = Mutable<Omit<PersonAuthoring['biography'][number], 'basis' | 'provenance'>>;
/** Displayed source text joined to an admitted public episode ID. Unknown source magnitudes stay absent. */
export type Episode = Omit<AuthoredEpisode, 'valence' | 'salience'> &
  Partial<Pick<AuthoredEpisode, 'valence' | 'salience'>>;
export type BodyReadout = Part<'body'>['readout'];
export type StandingAdvice = Part<'advice'>[number];
export type RngState = { a: number; b: number; c: number; d: number };
export type Lexicon = Partial<PublicLexicon> & {
  plainEnglish?: boolean;
  locale?: string;
  lines?: Record<string, string[]>;
};
export type Commitment = Part<'agenda'>['commitments'][number] & { recurEvery?: number };
export type NeedId = keyof Offer['expected']['needs'];
export interface VoicePerson {
  id: string;
  name: string;
  now: number;
  life: { bornAt: number; sex: PersonAuthoring['identity']['sex']; alive: boolean };
  body: Part<'body'>['state'] & { circadianPeak: number };
  needs: State['needs'];
  traits: State['traits'];
  values: State['values'];
  skills: Record<string, { level: number; practiced?: number; lastAt?: number }>;
  social: { relationships: State['relationships'] };
  conscience: { norms: State['heldNorms']; breaches: [] };
  will: { voices: Part<'relationships'>['voices']; advice: Part<'advice'> };
  receivedTexts: Pick<Episode, 'id' | 'at' | 'kind' | 'actorId' | 'targetId' | 'summary'>[];
  memory: { episodes: Episode[]; expectations: Part<'expectations'>; beliefs: State['beliefs'] };
  agenda: Omit<Part<'agenda'>, 'commitments'> & { commitments: Commitment[] };
  habits: State['habits'];
  affect: State['affect'];
  trace: DecisionRecord[];
  chronicle?: DayRecord[];
  chronicleDay?: { day: number; kept: DayRecord['kept']; released: DayRecord['released'] };
  activity: Activity | null;
  lexicon?: Lexicon;
}
/** Opening authoring only. It cannot be used to edit a live person. */
export interface PersonSpec {
  id: string;
  name: string;
  seed?: number;
  now?: number;
  bornAt?: number;
  sex?: PersonAuthoring['identity']['sex'];
  traits?: Partial<State['traits']>;
  values?: Partial<State['values']>;
  body?: Partial<State['body']>;
  skills?: Record<string, number>;
  norms?: State['heldNorms'];
  relationships?: (Pick<State['relationships'][number], 'otherId'> &
    Partial<State['relationships'][number]>)[];
  voices?: State['voices'];
  commitments?: Omit<Commitment, 'status' | 'exempt'>[];
  lexicon?: Lexicon;
}
/** Honest host opportunities, in Voice's displayed minute clock. */
export interface Affordance {
  id: string;
  action: string;
  label: string;
  duration: number;
  effort: number;
  focus?: number;
  mode?: 'awake' | 'sleep';
  targetId?: string;
  placeId?: string;
  with?: string[];
  alongside?: string[];
  advertises: Partial<Record<NeedId, number>>;
  material?: number;
  skill?: { id: string; difficulty: number; domain?: 'general' | 'language' | 'motor' | 'knowledge' };
  tags?: string[];
  norms?: Mutable<Offer['norms']>;
  fulfills?: string[];
  advances?: string[];
  diminishes?: string[];
  requires?: Offer['demands']['requires'];
  risk?: Offer['expected']['risk'];
}
/** Accepted host work, not a writable actor activity. */
export interface Activity {
  decisionId: string;
  intention: string;
  affordanceId: string;
  action: string;
  affordance: Affordance;
  startedAt: number;
  endsAt: number;
  effort: number;
  focus: number;
  mode: 'awake' | 'sleep';
  targetId?: string;
  protest?: boolean;
}
export interface Percept {
  at: number;
  channel: import('@adam0white/human-framework').PerceptData['channel'];
  kind: string;
  actorId?: string;
  targetId?: string;
  placeId?: string;
  valence?: number;
  salience: number;
  summary: string;
  claims?: Mutable<import('@adam0white/human-framework').PerceptData['claims']>;
  norms?: Mutable<Offer['norms']>;
  advice?: { action: string; affordanceId?: string; strength?: number }[];
}
export interface Outcome {
  affordanceId: string;
  action: string;
  targetId?: string;
  status: 'completed' | 'failed' | 'interrupted';
  at: number;
  needs?: Partial<Record<NeedId, number>>;
  material?: number;
  summary?: string;
  percepts?: Percept[];
  exposures?: { kind: string }[];
}
