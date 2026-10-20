/** Shared pieces of the lab client: endpoint, privacy URL, run envelope and gzip. */
import { checkRun, runRefusal } from './limits.ts';

export const DEFAULT_ENDPOINT = 'https://human.adamwhite.work/lab/api';
export const PRIVACY_URL = 'https://human.adamwhite.work/lab/privacy/';

/** The run envelope: exactly the JSON that is compressed and sent. */
export function runEnvelope(
  game: string,
  build: Build,
  run: unknown,
  extra: { note?: string; who?: string; compacted?: boolean } = {},
) {
  const note = extra.note?.trim();
  const who = extra.who?.trim();
  return {
    v: 1 as const,
    game,
    ...(note ? { note } : {}),
    ...(who ? { who } : {}),
    build,
    run,
    ...(extra.compacted ? { compacted: true } : {}),
  };
}

export async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

export type Build = { c?: string; hf?: string; a?: string };

/** A game can provide a replay-preserving replacement when the full run exceeds allocation bounds. */
export type CompactOptions = {
  compact?: (run: unknown) => unknown;
  /** Explains the game's compact form in the consent dialog. */
  compactNote?: string;
};

/** Serialize first; only an over-bound envelope may invoke the game's compactor, once. */
export function prepareRun(
  game: string,
  build: Build,
  run: unknown,
  extra: { note?: string; who?: string } & CompactOptions = {},
): string {
  let text = JSON.stringify(runEnvelope(game, build, run, extra));
  if (checkRun(text)) return text;
  if (extra.compact) {
    const replacement = extra.compact(run);
    if (replacement === undefined || replacement === null) throw new Error(runRefusal(text));
    text = JSON.stringify(runEnvelope(game, build, replacement, { ...extra, compacted: true }));
    if (checkRun(text)) return text;
  }
  throw new Error(runRefusal(text));
}
