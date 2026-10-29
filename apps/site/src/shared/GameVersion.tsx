import releases from '../game-releases.json';

/** Checked-in live release receipts; never substitute the library version for a game's pin. */
export function GameVersion({ id }: { id: keyof typeof releases }) {
  const release = releases[id];
  return (
    <span className="game-version">
      <span>HF {release.framework}</span>
      {'reason' in release && <span className="game-line">{release.reason}</span>}
      <span className="game-line">
        <a href={release.release}>Release record</a> · checked {release.checked}
      </span>
    </span>
  );
}
