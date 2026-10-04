/**
 * The voices he hears (plan §7). Yours carries the trust thread (a bar and the last three events); the others
 * show a trust word, what they last urged, whether it is still on his mind, and any conflict between voices.
 */
import type { VoiceView } from '../protocol.ts';
import { Icon, VOICE_ICON } from './Icon.tsx';
import { Meter } from './parts.tsx';

export function VoicesPane({ voices }: { voices: VoiceView[] }) {
  return (
    <section className="v-pane v-voices" aria-label="Voices">
      <h2 className="v-pane-title">Voices he hears</h2>
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
              <span className="v-voice-name">{v.name}</span>
              <span className="v-voice-rel">{v.relation}</span>
            </div>
            <p className="v-voice-trust">{v.trustWord}</p>
            {v.trust !== undefined && (
              <div className="v-thread">
                <Meter value={v.trust} label="His trust in you" />
                <span className="v-thread-num">{v.trust.toFixed(2)}</span>
              </div>
            )}
            {v.history.length > 0 && (
              <ul className="v-voice-history">
                {v.history.slice(-3).map((h) => (
                  <li key={`${h.delta}-${h.text}`} className={h.delta >= 0 ? 'is-up' : 'is-down'}>
                    <span className="v-delta">
                      {h.delta >= 0 ? '+' : '−'}
                      {Math.abs(h.delta).toFixed(2)}
                    </span>{' '}
                    {h.text}
                  </li>
                ))}
              </ul>
            )}
            {v.lastUrged && (
              <div className="v-voice-urged">
                <span>
                  urged <em>{v.lastUrged.label}</em> · {v.lastUrged.when}
                </span>
                {v.lastUrged.standing && (
                  <span className="v-voice-standing">
                    still on his mind
                    <Meter value={v.lastUrged.weight} label="still on his mind" />
                  </span>
                )}
              </div>
            )}
            {v.conflict && <p className="v-voice-conflict">{v.conflict}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
