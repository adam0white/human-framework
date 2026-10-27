/** A file import identifies the original bytes without adopting their run identity. */
export type FileImport = {
  imported: true;
  sourceRunId: string | null;
  sourceHash: string;
};

export async function importedFileRecord(raw: Record<string, unknown>, text: string): Promise<FileImport> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return {
    imported: true,
    sourceRunId:
      typeof raw.runId === 'string' && raw.runId.trim().length > 0 && raw.runId.length <= 128
        ? raw.runId
        : null,
    sourceHash: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
}

const runIds = new WeakMap<object, string>();

/** One live run owns its identity; imported metadata comes only from accepted file validation. */
export function recordFile<T extends object>(
  owner: object,
  value: T,
  fileImport?: FileImport,
): T & { runId: string; fileImport?: FileImport } {
  let runId = runIds.get(owner);
  if (!runId) {
    runId = crypto.randomUUID();
    runIds.set(owner, runId);
  }
  const { fileImport: _untrusted, ...record } = value as T & { fileImport?: unknown };
  return { ...record, runId, ...(fileImport ? { fileImport } : {}) } as T & {
    runId: string;
    fileImport?: FileImport;
  };
}
