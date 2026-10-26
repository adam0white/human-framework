/** Self-declared linked metadata. Never inferred identity or consent. */
export type RunSource = 'agent';

export function resolveRunSource(
  declared?: RunSource,
  search = typeof location === 'undefined' ? '' : location.search,
): RunSource | undefined {
  if (declared !== undefined && declared !== 'agent') throw new Error('Invalid lab run source.');
  const params = new URLSearchParams(search);
  const source = declared ?? (params.get('labRunSource') === 'agent' ? 'agent' : undefined);
  if (params.has('labRunSource') && typeof location !== 'undefined' && typeof history !== 'undefined') {
    const url = new URL(location.href);
    url.searchParams.delete('labRunSource');
    history.replaceState(history.state, '', url.href);
  }
  return source;
}
