import type { PersonaEnvelope } from '@adam0white/lab-client';

/** Recording and branch ownership change only after the worker accepts a replacement. */
export class PersonaSession {
  head: PersonaEnvelope | undefined;
  key: string | null = null;
  private candidate: { key: string | null; head?: PersonaEnvelope } | undefined;
  constructor(private readonly apply: (key: string | null) => void) {}
  get loading(): boolean {
    return this.candidate !== undefined;
  }
  beginFile(text: string): void {
    const file = JSON.parse(text) as {
      oneCast?: { probe?: string; branchId?: string }[];
      voicePersona?: { admission?: PersonaEnvelope; acceptedHead?: PersonaEnvelope };
      voicePersonaHead?: PersonaEnvelope;
    };
    const own = file.voicePersonaHead ?? file.voicePersona?.acceptedHead;
    const row = Array.isArray(file.oneCast)
      ? file.oneCast.findLast((row) => row.probe === 'selin')
      : undefined;
    const key = own?.branchId ?? file.voicePersona?.admission?.branchId ?? row?.branchId ?? null;
    if (
      (file.voicePersona && key === null) ||
      (key !== null && (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)))
    )
      throw new Error('The continuing person has no valid recording gate.');
    this.begin(key, own);
  }
  begin(key: string | null, head?: PersonaEnvelope): void {
    this.candidate = { key, head };
    this.apply(`voice-pending-${crypto.randomUUID()}`);
  }
  stage(head: PersonaEnvelope): void {
    if (!this.candidate) throw new Error('No pending person chapter.');
    this.candidate = { key: head.branchId, head };
  }
  finish(accepted: boolean): PersonaEnvelope | undefined {
    if (!this.candidate) return this.head;
    if (accepted) {
      this.key = this.candidate.key;
      this.head = this.candidate.head;
    }
    this.candidate = undefined;
    this.apply(this.key);
    return this.head;
  }
  accept(head: PersonaEnvelope): void {
    if (this.loading) throw new Error('A person chapter is still loading.');
    this.head = head;
    this.key = head.branchId;
    this.apply(this.key);
  }
  reset(): void {
    this.head = undefined;
    this.key = null;
    this.candidate = undefined;
    this.apply(null);
  }
}

/** Preflight must finish before a claim may advance the shared head. */
export async function claimAfterValidation<T, H>(
  candidate: T,
  validate: (value: T) => Promise<T>,
  claim: (value: T) => Promise<H>,
): Promise<{ candidate: T; head: H }> {
  const pinned = await validate(candidate);
  return { candidate: pinned, head: await claim(pinned) };
}
export function requireOwnHead(current: PersonaEnvelope | null, own: PersonaEnvelope | undefined): void {
  if (current && (!own || current.revision !== own.revision || current.branchId !== own.branchId))
    throw new Error(
      'This browser already has another Selin chapter. Keep it or explicitly fork it on the people shelf.',
    );
}
