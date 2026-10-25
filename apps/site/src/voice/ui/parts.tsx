import { Help } from '../../shared/Help.tsx';
import { settingWords } from '../../shared/setting-words.ts';
/** Small shared pieces: verdict styling, appeal and strength labels, the model notes. */
import { type Appeal, MODEL_NOTES, type Strength, type Tone, type VoiceId } from '../protocol.ts';

export const APPEALS: { id: Appeal; label: string; key: string }[] = [
  { id: 'duty', label: 'it’s your duty', key: 'D' },
  { id: 'safety', label: 'your health', key: 'H' },
  { id: 'benevolence', label: 'for Selin', key: 'S' },
  { id: 'belonging', label: 'you shouldn’t be alone', key: 'A' },
  { id: 'meaning', label: 'it matters', key: 'T' },
];

export const appealLabel = (a?: Appeal) => APPEALS.find((x) => x.id === a)?.label;

export const STRENGTHS: { id: Strength; label: string; key: string; hint: string }[] = [
  { id: 'mention', label: 'Mention', key: 'M', hint: 'a gentle suggestion' },
  { id: 'urge', label: 'Urge', key: 'U', hint: 'stronger advice' },
];

export const INSIST_PRICE =
  'He may agree while objecting, and he will remember that. If it goes well, he will not trust you more. Insisting when he already feels under pressure reduces his trust in you.';

export const toneClass = (tone?: Tone) => (tone ? `tone-${tone}` : '');

export const VOICE_COLOURS: Record<VoiceId, string> = {
  you: '#c9a227',
  selin: '#5b8def',
  riza: '#3fa37a',
  hacer: '#b0679b',
  osman: '#a0623a',
  doctor: '#5c6672',
};

export const VOICE_NAMES: Record<VoiceId, string> = {
  you: 'You',
  selin: 'Selin',
  riza: 'Rıza',
  hacer: 'Hacer',
  osman: 'Osman',
  doctor: 'The doctor',
};

export function ModelNotes({ notes = MODEL_NOTES }: { notes?: readonly string[] }) {
  return (
    <Help title="Model notes">
      <ul>
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </Help>
  );
}

export function Meter({ value, label, tone }: { value: number; label?: string; tone?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a styled bar; <meter> cannot be themed consistently.
    <span
      className={`v-meter ${tone ?? ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={settingWords(label)}
    >
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}
