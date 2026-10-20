export type PhoneStep = { name?: string } & (
  | { click: string; selector?: never }
  | { selector: string; click?: never }
  | { wait: number }
  | { type: string; selector: string }
);
export interface PhoneOptions {
  url: string;
  steps?: string;
  out: string;
}
export function parsePhoneArgs(args: string[]): PhoneOptions {
  const url = args[0];
  if (!url || !/^https?:\/\//.test(url))
    throw new Error('Usage: npm run lab:phone -- <url> [--steps steps.json] [--out dir]');
  const result: PhoneOptions = { url, out: 'scratch/lab-phone' };
  for (let i = 1; i < args.length; i += 2) {
    const value = args[i + 1];
    if (!value || (args[i] !== '--steps' && args[i] !== '--out'))
      throw new Error(`Invalid option: ${args[i]}`);
    if (args[i] === '--steps') result.steps = value;
    else result.out = value;
  }
  return result;
}
export function parsePhoneSteps(value: unknown): PhoneStep[] {
  if (!Array.isArray(value)) throw new Error('Steps must be a JSON array');
  return value.map((step: unknown, i) => {
    if (!step || typeof step !== 'object') throw new Error(`Invalid step ${i + 1}`);
    const s = step as Record<string, unknown>;
    if (s.name !== undefined && typeof s.name !== 'string') throw new Error(`Invalid step name ${i + 1}`);
    if (typeof s.wait === 'number' && Number.isFinite(s.wait) && s.wait >= 0) return step as PhoneStep;
    if (typeof s.type === 'string' && typeof s.selector === 'string') return step as PhoneStep;
    if (typeof s.click === 'string' || typeof s.selector === 'string') return step as PhoneStep;
    throw new Error(`Invalid step ${i + 1}: use click (visible text), selector, wait, or type + selector`);
  });
}
export function phoneStepName(index: number, name: string): string {
  return `${String(index).padStart(2, '0')}-${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'step'
  }`;
}
