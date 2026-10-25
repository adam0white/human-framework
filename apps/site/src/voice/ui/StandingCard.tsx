import { settingWords } from '../../shared/setting-words.ts';
/** Your one standing suggestion (voice.md §6 lifecycle): what you said, his last answer, when it lapses, Withdraw. */
import type { StandingView } from '../protocol.ts';
import { Icon, TONE_ICON, TONE_WORD } from './Icon.tsx';
import { toneClass } from './parts.tsx';

export function StandingCard({ standing, onWithdraw }: { standing: StandingView; onWithdraw: () => void }) {
  const a = standing.lastAnswer;
  return (
    <div className={`v-standing ${toneClass(a?.tone)}`} role="status">
      <div className="v-standing-text">
        <span className="v-standing-words">
          Your suggestions: <em>{settingWords(standing.label)}</em>{' '}
          <span className="v-standing-since">· {settingWords(standing.since)}</span>
        </span>
        {a && (
          <span className="v-standing-answer">
            <Icon
              name={TONE_ICON[a.tone]}
              label={TONE_WORD[a.tone]}
              className={`v-verdict-icon tone-icon-${a.tone}`}
            />
            He said: <q>{settingWords(a.says)}</q>
            {a.counter && (
              <>
                {' '}
                <em>{settingWords(a.counter)}</em>
              </>
            )}
          </span>
        )}
        <span className="v-standing-left">Still on his mind until {settingWords(standing.expires)}</span>
      </div>
      <button type="button" className="v-btn v-btn-quiet v-btn-small" onClick={onWithdraw}>
        Withdraw
      </button>
    </div>
  );
}
