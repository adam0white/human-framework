/** His ends (plan §1): things he holds, in his words, as his record. Not points; no pass or fail. */
import type { EndView } from '../protocol.ts';
import { Meter } from './parts.tsx';

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

export function EndsPane({ ends }: { ends: EndView[] }) {
  return (
    <section className="v-pane v-ends-pane" aria-label="His ends">
      <h2 className="v-pane-title">His ends</h2>
      <p className="v-pane-aim">Help him toward these, so that on Eid he does them without you.</p>
      <EndsList ends={ends} />
    </section>
  );
}
