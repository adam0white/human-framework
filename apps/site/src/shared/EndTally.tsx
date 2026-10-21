/** Optional UI preference only: never enters a simulation, save or replay. */
import './end-tally.css';
export function TallySetting({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange(on: boolean): void;
  label: string;
}) {
  return (
    <label className="end-tally-setting">
      <input type="checkbox" checked={on} onChange={(event) => onChange(event.target.checked)} /> {label}
    </label>
  );
}

export function EndTally({ title, lines }: { title: string; lines: readonly string[] }) {
  return (
    <details className="end-tally">
      <summary>See the tally</summary>
      <h3>{title}</h3>
      <p>This game’s own reckoning, not a measure of its people.</p>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
