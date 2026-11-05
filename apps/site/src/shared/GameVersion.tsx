import releases from '../game-releases.json';

/** Qualified release sources; the linked live manifest is the deployment authority. */
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
