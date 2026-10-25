/** Require a value at an internal boundary; fail here instead of using a non-null assertion. */
export function requireValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing required value');
  return value;
}
