/**
 * SCOPE: opt-in host input ordering for one declared logical tick. Waits for the
 * caller's complete expected identity set, then sorts by sender and sequence.
 * Lexical sender priority is deterministic host policy, not fairness or
 * consensus. For conflicting same-voice requests, earlier senders take priority.
 * Owns no Person, clock, queue or RNG state. Does not supply transport, consensus,
 * payload validation, retries or snapshot storage. Payloads remain caller-owned;
 * hosts must agree on their meaning and save pending input alongside host state.
 */
export interface TickInputKey {
  sender: string;
  sequence: number;
}

export interface TickInput<T> extends TickInputKey {
  tick: number;
  payload: T;
}

const MAX_INPUTS = 256;

function identity(key: TickInputKey): string {
  if (
    typeof key.sender !== 'string' ||
    key.sender.length === 0 ||
    key.sender.length > 128 ||
    !Number.isSafeInteger(key.sequence) ||
    key.sequence < 0
  ) {
    throw new Error('Invalid tick input identity');
  }
  return JSON.stringify([key.sender, key.sequence]);
}

/**
 * Returns undefined while a declared input is missing. Unexpected, duplicate or
 * wrong-tick inputs throw. An empty expected set is a complete barrier. This
 * reader never mutates input arrays or envelopes and never reads payload fields.
 * Call only when explicitly opting into this host scheduling convention.
 */
export function canonicalTickInputs<T>(
  tick: number,
  inputs: readonly TickInput<T>[],
  expected: readonly TickInputKey[],
): TickInput<T>[] | undefined {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid logical tick');
  if (inputs.length > MAX_INPUTS || expected.length > MAX_INPUTS) {
    throw new Error('Tick input limit exceeded');
  }
  const wanted = new Set<string>();
  for (const key of expected) {
    const id = identity(key);
    if (wanted.has(id)) throw new Error('Duplicate expected tick input');
    wanted.add(id);
  }
  const received = new Set<string>();
  for (const input of inputs) {
    const id = identity(input);
    if (input.tick !== tick) throw new Error('Input belongs to another tick');
    if (!wanted.has(id)) throw new Error('Unexpected tick input');
    if (received.has(id)) throw new Error('Duplicate tick input');
    received.add(id);
  }
  if (received.size !== wanted.size) return undefined;
  return inputs
    .map((input) => ({
      tick: input.tick,
      sender: input.sender,
      sequence: input.sequence,
      payload: input.payload,
    }))
    .sort((a, b) => {
      if (a.sender !== b.sender) return a.sender < b.sender ? -1 : 1;
      return a.sequence - b.sequence;
    });
}
