/** SCOPE: the one engine-limit error. Every numerical, work, segment or counter budget that runs out throws
 * it, so `step` reports `limit-exceeded` by type, never by matching message text. */
export class EngineLimitError extends RangeError {}
