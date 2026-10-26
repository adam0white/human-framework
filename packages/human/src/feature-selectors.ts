/**
 * SCOPE: fail before mutation for the explicit community death, upbringing and conditioned forecast
 * selectors. This is not whole-options or Person validation. Omitted selectors retain legacy behavior.
 * Hosts still own saving run options and supplying them after restore; no option is inferred from state.
 */
export function assertSelector(name: string, value: unknown, supported: string): void {
  if (value !== undefined && value !== supported)
    throw new Error(`Unsupported ${name}; expected '${supported}' or undefined`);
}

export function assertUpbringing(options: unknown): void {
  if (options === undefined) return;
  if (options === null || typeof options !== 'object' || Array.isArray(options))
    throw new Error('Unsupported upbringing options; expected an object or undefined');
  assertSelector('upbringing.model', (options as { model?: unknown }).model, 'warmth-through-25');
}
