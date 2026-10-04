import { memo, type ReactNode, useEffect, useRef, useState } from 'react';
import type { VillagerId } from '../sim/world-types.ts';
import type { Frame } from './contract.ts';
import { Portrait, shortName } from './parts.tsx';

/** Height the status rows need (a header and six 24 px rows); below it the map keeps the whole pane. */
const ROWS_H = 180;
/** The map's aspect (20×14 tiles). */
const MAP_ASPECT = 448 / 640;

/**
 * A pane's body: the map, plus one status row per person when the pane is tall enough to hold both without
 * shrinking the map (desktop panes are width-bound and had empty bands above and below the map). Phones and short
 * desktop windows show only the map.
 */
export function PaneBody({ rows, children }: { rows: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setFits(el.clientHeight - el.clientWidth * MAP_ASPECT >= ROWS_H);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={`pane-body ${fits ? 'has-rows' : ''}`} ref={ref}>
      <div className="pane-map">{children}</div>
      {fits && rows}
    </div>
  );
}

function Bar({ label, value, urgent }: { label: string; value: number; urgent?: boolean | undefined }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className={`prow-bar ${urgent ? 'is-urgent' : ''}`} title={`${label} ${Math.round(v * 100)}%`}>
      <span className="visually-hidden">
        {label} {Math.round(v * 100)}%
      </span>
      <span className="prow-bar-track" aria-hidden="true">
        <span style={{ width: `${v * 100}%` }} />
      </span>
    </span>
  );
}

/** One row per person: who, what they are doing, and the two numbers that side has for them. */
export const PeopleRows = memo(function PeopleRows(props: {
  frame: Frame | null;
  side: 'classic' | 'human';
  selectedId: VillagerId | null;
  onSelect(id: VillagerId): void;
}) {
  const f = props.frame;
  if (!f) return null;
  const rows =
    props.side === 'classic'
      ? f.classic.map((u) => ({
          id: u.id,
          label: u.label,
          dead: u.state === 'dead',
          bars: [
            { label: 'Fed', value: 1 - u.hunger / 100, urgent: u.hunger >= 80 },
            { label: 'HP', value: u.hp / 100, urgent: u.hp < 40 },
          ],
        }))
      : f.human.map((v) => {
          const need = (id: string) => v.needs.find((n) => n.id === id);
          const food = need('food');
          const sleep = need('sleep');
          return {
            id: v.id,
            label: v.protest ? `${v.label} (under protest)` : v.label,
            dead: v.state === 'dead',
            bars: [
              { label: 'Food', value: food?.value ?? 1, urgent: food?.urgent },
              { label: 'Sleep', value: sleep?.value ?? 1, urgent: sleep?.urgent },
            ],
          };
        });
  return (
    <ul
      className={`prows prows-${props.side}`}
      aria-label={props.side === 'classic' ? 'Classic units' : 'Human people'}
    >
      <li className="prow prow-head" aria-hidden="true">
        <span />
        <span />
        <span>Doing</span>
        {(rows[0]?.bars ?? []).map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </li>
      {rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            className={`prow ${props.selectedId === r.id ? 'is-on' : ''} ${r.dead ? 'is-dead' : ''}`}
            aria-pressed={props.selectedId === r.id}
            onClick={() => props.onSelect(r.id)}
          >
            <Portrait id={r.id} size={18} />
            <span className="prow-name">{shortName(r.id)}</span>
            <span className="prow-doing">{r.label}</span>
            {r.bars.map((b) => (
              <Bar key={b.label} label={b.label} value={b.value} urgent={b.urgent} />
            ))}
          </button>
        </li>
      ))}
    </ul>
  );
});
