/** His ends (plan §1): things he holds, in his words, as his record. Not points; no pass or fail. */
import type { EndView, UnaskedItem } from '../protocol.ts';
import { Meter } from './parts.tsx';

const UNASKED_MARK: Record<UnaskedItem['state'], { glyph: string; word: string }> = {
  yes: { glyph: '✓', word: 'yes' },
  no: { glyph: '✗', word: 'not yet' },
  unknown: { glyph: '–', word: 'no chance yet' },
};

/**
 * Seventh pass: the list the month is for, growing or not. Each act shows whether he would now do it with no word
 * from you, from his last decision where it was open (dated when that was not today).
 */
export function UnaskedStrip({
  items,
  lead = 'He’d now do unasked:',
}: {
  items?: UnaskedItem[];
  lead?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="v-unasked">
      <span className="v-unasked-lead">{lead}</span>
      <ul>
        {items.map((u) => (
          <li key={u.label} className={`v-unasked-item is-${u.state}`}>
            <span>{u.label}</span>{' '}
            <span className="v-unasked-mark" title={UNASKED_MARK[u.state].word}>
              {UNASKED_MARK[u.state].glyph}
              <span className="v-sr"> {UNASKED_MARK[u.state].word}</span>
            </span>
            {u.day && <span className="v-unasked-day"> ({u.day})</span>}
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
          <p className="v-end-label">“{e.label}”</p>
          <p className="v-end-status">{e.status}</p>
          {e.progress !== undefined && <Meter value={e.progress} label={e.label} />}
          {!compact && <p className="v-end-detail">{e.detail}</p>}
          {!compact && e.after && (
            <p className="v-end-after">
              <span>Without you</span> {e.after}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EndsPane({ ends, unasked }: { ends: EndView[]; unasked?: UnaskedItem[] }) {
  return (
    <section className="v-pane v-ends-pane" aria-label="His ends">
      <h2 className="v-pane-title">His ends</h2>
      <p className="v-pane-aim">Help him toward these, so that on Eid he does them without you.</p>
      <UnaskedStrip items={unasked} />
      <EndsList ends={ends} />
    </section>
  );
}
