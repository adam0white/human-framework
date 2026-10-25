import { memo } from 'react';
import type { VillagerId } from '../sim/world-types.ts';
import type { Frame } from './contract.ts';
import { activityLabel, namedDescription, needDescription } from './descriptions.ts';
import { Portrait, shortName } from './parts.tsx';
import { wellWords as settingWords } from './words.ts';

function Bar({ label, value, urgent }: { label: string; value: number; urgent?: boolean | undefined }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span
      className={`prow-bar ${urgent ? 'is-urgent' : ''}`}
      title={settingWords(`${label} ${Math.round(v * 100)}%`)}
    >
      <span className="visually-hidden">
        {label} {Math.round(v * 100)}%
      </span>
      <span className="prow-bar-track" aria-hidden="true">
        <span style={{ width: `${v * 100}%` }} />
      </span>
    </span>
  );
}

/** Human needs appear as approximate descriptions; Classic keeps its mechanical meters. */
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
              {
                label: 'Food',
                value: food?.value ?? 1,
                urgent: food?.urgent,
                description: namedDescription(needDescription('food', food?.value ?? 1), shortName(v.id)),
              },
              {
                label: 'Sleep',
                value: sleep?.value ?? 1,
                urgent: sleep?.urgent,
                description: namedDescription(needDescription('sleep', sleep?.value ?? 1), shortName(v.id)),
              },
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
          <span key={b.label}>{settingWords(b.label)}</span>
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
            <span className="prow-doing">{settingWords(activityLabel(r.label))}</span>
            {r.bars.map((b) =>
              'description' in b ? (
                <span key={b.label} className={b.urgent ? 'need-description is-urgent' : 'need-description'}>
                  {settingWords(b.description)}
                </span>
              ) : (
                <Bar key={b.label} label={b.label} value={b.value} urgent={b.urgent} />
              ),
            )}
          </button>
        </li>
      ))}
    </ul>
  );
});
