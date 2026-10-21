import type { Frame } from '../sim/view.ts';

/** The chronicle counts stores and time, never a person's worth. */
export function watchTally(frame: Frame): string[] {
  const years = Math.max(0, frame.year - 1);
  const volumes = new Set(
    [...frame.shelf, frame.volume].filter((volume) => volume.end).map((volume) => volume.n),
  ).size;
  const sacks = Math.max(0, Math.floor(frame.grain));
  return [
    `${years + volumes + sacks} marks — one per full year, closed volume and sack left`,
    `Full years: ${years} · Closed volumes: ${volumes} · Sacks left: ${sacks}`,
  ];
}
