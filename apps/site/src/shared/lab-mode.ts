/** Player tools stay simple. Diagnostic controls require the exact lab URL flag. */
export function labMode(search = typeof location === 'undefined' ? '' : location.search): boolean {
  return new URLSearchParams(search).get('lab') === '1';
}
