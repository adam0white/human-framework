/** Run allocation bounds shared with the notebook Worker. Includes the whole serialized envelope. */
export const RUN_LIMITS = Object.freeze({
  inflatedBytes: 3 * 1024 * 1024,
  compressedBytes: 2 * 1024 * 1024,
  tokens: 360_000,
  containers: 45_000,
  depth: 64,
});

/**
 * Bounds allocation without parsing JSON. This is not a JSON syntax or envelope validator.
 * Counts opening containers, commas and colons outside quoted strings; escaped quotes stay quoted.
 */
export function checkRun(text: string): boolean {
  if (
    text.length > RUN_LIMITS.inflatedBytes ||
    new TextEncoder().encode(text).byteLength > RUN_LIMITS.inflatedBytes
  )
    return false;
  let depth = 0;
  let tokens = 0;
  let containers = 0;
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    if (c === '{' || c === '[') {
      if (++containers > RUN_LIMITS.containers) return false;
      if (++depth > RUN_LIMITS.depth) return false;
    } else if (c === '}' || c === ']') depth--;
    if (c === '{' || c === '[' || c === ',' || c === ':') {
      if (++tokens > RUN_LIMITS.tokens) return false;
    }
  }
  return true;
}

const mb = (bytes: number) => `${Math.ceil((bytes / (1024 * 1024)) * 10) / 10} MB`;

export function runRefusal(text: string): string {
  const bytes = new TextEncoder().encode(text).byteLength;
  return bytes > RUN_LIMITS.inflatedBytes
    ? `This run is ${mb(bytes)}; the notebook takes up to ${mb(RUN_LIMITS.inflatedBytes)}. Your saved export file still has everything.`
    : 'This run is too long to send in one piece. Your saved export file still has all of it.';
}

export function compressedRefusal(bytes: number): string {
  return `This compressed run is ${mb(bytes)}; the notebook takes up to ${mb(RUN_LIMITS.compressedBytes)}. Your saved export file still has everything.`;
}
