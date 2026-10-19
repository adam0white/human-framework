/** Shared pieces of the lab client: endpoint, privacy URL, run envelope and gzip. */
export const DEFAULT_ENDPOINT = 'https://human.adamwhite.work/lab/api';
export const PRIVACY_URL = 'https://human.adamwhite.work/lab/privacy/';

/** The run envelope: exactly the JSON that is compressed and sent. */
export function runEnvelope(
  game: string,
  build: Build,
  run: unknown,
  extra: { note?: string; who?: string } = {},
) {
  const note = extra.note?.trim();
  const who = extra.who?.trim();
  return { v: 1 as const, game, ...(note ? { note } : {}), ...(who ? { who } : {}), build, run };
}

export async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

export type Build = { c?: string; hf?: string; a?: string };
