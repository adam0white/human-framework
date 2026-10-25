import { settingWords } from '../../shared/setting-words.ts';
/** His goals (voice.md §3): things he holds, in his words, as his record. Not points; no pass or fail. */

import { memo } from 'react';
import type { EndView, UnaskedItem } from '../protocol.ts';
import { storyDates } from './dates.ts';

const UNASKED_WORD: Record<UnaskedItem['state'], string> = {
  yes: 'chose it',
  no: 'chose something else',
  unknown: 'no choice observed yet',
};

/**
 * Seventh pass: the list the month is for, growing or not. Each act shows whether he would now do it with no word
 * from you, from his last decision where it was open (dated when that was not today).
 */
export function UnaskedStrip({
  items,
  lead = 'These are estimates of what he would choose without your advice. They do not show completed actions:',
}: {
  items?: UnaskedItem[];
  lead?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="v-unasked">
      <span className="v-unasked-lead">{settingWords(lead)}</span>
      <ul>
        {items.map((u) => (
          <li key={u.label} className={`v-unasked-item is-${u.state}`}>
            <span>{settingWords(u.label)}</span>{' '}
            <span className="v-unasked-choice">— {settingWords(UNASKED_WORD[u.state])}</span>
            {u.day && <span className="v-unasked-day"> ({settingWords(storyDates(u.day))})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EndsList({ ends, compact = false }: { ends: EndView[]; compact?: boolean }) {
  return (
    <ul className={`v-ends ${compact ? 'is-compact' : ''}`}>
      {ends.map((e) => (
        <li key={e.id} className={`v-end v-end-${e.id}`}>
          <p className="v-end-label">“{settingWords(e.label)}”</p>
          <p className="v-end-status">{settingWords(storyDates(e.status))}</p>
          {!compact && e.id !== 'trust' && (
            <p className="v-end-detail">{settingWords(storyDates(e.detail))}</p>
          )}
          {!compact && e.after && (
            <p className="v-end-after">
              <span>Without you</span> {settingWords(e.after)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export const EndsPane = memo(function EndsPane({
  ends,
  unasked,
}: {
  ends: EndView[];
  unasked?: UnaskedItem[];
}) {
  return (
    <section className="v-pane v-ends-pane" aria-label="His goals">
      <h2 className="v-pane-title">His goals</h2>
      <p className="v-pane-aim">Help him toward these, so that on Eid he does them without you.</p>
      <UnaskedStrip items={unasked} />
      <EndsList ends={ends} />
    </section>
  );
});
