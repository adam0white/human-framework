/** Self-declared linked metadata. Never inferred identity or consent. */
export type RunSource = 'agent';

export function resolveRunSource(
  declared?: RunSource,
  search = typeof location === 'undefined' ? '' : location.search,
): RunSource | undefined {
  if (declared !== undefined && declared !== 'agent') throw new Error('Invalid lab run source.');
  return declared ?? (new URLSearchParams(search).get('labRunSource') === 'agent' ? 'agent' : undefined);
}
