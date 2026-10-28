/** SCOPE: versioned JSON transport for the existing run operations. Admission and
 * simulation remain owned by step and inspect; this adapter holds no run state. */
import { inspect, step } from './run.ts';
import type { InspectQuery, Result, Run, StepBatch } from './run-schema.ts';

export const RUN_WIRE_VERSION = 1 as const;
type Operation = 'step' | 'inspect';

/** Version 1 request: {format: 'hf-run-wire', version: 1, operation: 'step' | 'inspect', input}.
 * Response: {format, version, operation: 'step' | 'inspect' | null, result}.
 * Duplicate keys, unknown versions and malformed envelopes are refused before dispatch. */
export function runWire(run: Run, requestJson: string): string {
  let request: unknown;
  try {
    request = JSON.parse(requestJson);
    if (hasDuplicateKeys(requestJson)) return response(null, failure('$', 'duplicate JSON object key'));
  } catch {
    return response(null, failure('$', 'expected JSON request'));
  }
  if (request === null || typeof request !== 'object' || Array.isArray(request))
    return response(null, failure('$', 'expected request object'));
  const envelope = request as Record<string, unknown>;
  if (envelope.format !== 'hf-run-wire') return response(null, failure('$.format', 'unknown wire format'));
  if (envelope.version !== RUN_WIRE_VERSION)
    return response(null, failure('$.version', 'unsupported wire version'));
  if (envelope.operation !== 'step' && envelope.operation !== 'inspect')
    return response(null, failure('$.operation', 'unknown operation'));
  const operation = envelope.operation;
  if (Object.keys(envelope).some((key) => !['format', 'version', 'operation', 'input'].includes(key)))
    return response(operation, failure('$', 'unknown request field'));
  if (!Object.hasOwn(envelope, 'input')) return response(operation, failure('$.input', 'missing input'));
  // The operations validate the untrusted payload before any state change.
  const result =
    operation === 'step'
      ? step(run, envelope.input as StepBatch)
      : inspect(run, envelope.input as InspectQuery);
  return response(operation, result);
}

// JSON.parse has already checked syntax. Track keys per object, decoding escapes
// so that, for example, "version" and "\u0076ersion" count as the same key.
function hasDuplicateKeys(json: string): boolean {
  const stack: (Set<string> | null)[] = [];
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (char === '{') stack.push(new Set());
    else if (char === '[') stack.push(null);
    else if (char === '}' || char === ']') stack.pop();
    else if (char === '"') {
      const start = i;
      while (++i < json.length) {
        if (json[i] === '\\') i++;
        else if (json[i] === '"') break;
      }
      let next = i + 1;
      while (/\s/u.test(json[next] ?? '') && next < json.length) next++;
      const keys = stack.at(-1);
      if (json[next] === ':' && keys) {
        const key = JSON.parse(json.slice(start, i + 1)) as string;
        if (keys.has(key)) return true;
        keys.add(key);
      }
    }
  }
  return false;
}

function failure(path: string, message: string): Result<never> {
  return { ok: false, error: { code: 'invalid-schema', path, message } };
}
function response(operation: Operation | null, result: Result<unknown>): string {
  return JSON.stringify({ format: 'hf-run-wire', version: RUN_WIRE_VERSION, operation, result });
}
