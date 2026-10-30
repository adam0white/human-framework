/**
 * The voices he hears (voice.md §8). Yours carries the trust thread (words and the last three events); the others
 * show a trust word, what they last urged, whether it is still on his mind, and any conflict between voices.
 */
import { memo } from 'react';
import type { VoiceView } from '../protocol.ts';
import { Icon, VOICE_ICON } from './Icon.tsx';
import { voiceWords as settingWords } from './words.ts';
/** Numeric prefixes belong to the model record, not the player's account of the event. */
export const trustEventWords = (text: string): string => text.replace(/^[+−-]\d+(?:\.\d+)?\s+/, '');
export const trustChangeWords = (from: number, to: number): string =>
  Math.abs(to - from) < 0.005
    ? 'He listens about as closely as he did this morning.'
    : to > from
      ? 'He listens more closely than this morning.'
      : 'He listens less closely than this morning.';

export const VoicesPane = memo(function VoicesPane({ voices }: { voices: VoiceView[] }) {
  return (
    <section className="v-pane v-voices" aria-label="Voices">
      <h2 className="v-pane-title">Who else he hears</h2>
      <ul>
        {voices.map((v) => (
          <li
            key={v.id}
            className={`v-voice v-voice-${v.id}`}
            style={{ '--who': v.colour } as React.CSSProperties}
          >
            <div className="v-voice-head">
              <span className="v-voice-dot" aria-hidden="true">
                <Icon name={VOICE_ICON[v.id]} />
              </span>
              <span className="v-voice-name">{settingWords(v.name)}</span>
              <span className="v-voice-rel">{settingWords(v.relation)}</span>
            </div>
            <p className="v-voice-trust">{settingWords(v.trustWord)}</p>
            {v.pressure && <p className="v-voice-pressure">{v.pressure}</p>}
            {v.history.length > 0 && (
              <ul className="v-voice-history">
                {v.history.slice(-3).map((h) => (
                  <li key={`${h.direction}-${h.text}`} className={h.direction === 'up' ? 'is-up' : 'is-down'}>
                    {settingWords(trustEventWords(h.text))}
                  </li>
                ))}
              </ul>
            )}
            {v.lastUrged && (
              <div className="v-voice-urged">
                <span>
                  urged <em>{settingWords(v.lastUrged.label)}</em> · {settingWords(v.lastUrged.when)}
                </span>
                {v.lastUrged.standing && <span className="v-voice-standing">still on his mind</span>}
              </div>
            )}
            {v.conflict && <p className="v-voice-conflict">{settingWords(v.conflict)}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
});
