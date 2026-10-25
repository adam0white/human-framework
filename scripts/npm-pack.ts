import { basename } from 'node:path';

/** Read npm 11 array or npm 12 package-keyed metadata for one local archive. */
export function packedFilename(output: string): string {
  const start = output.search(/^(?:\[|\{)/m);
  if (start < 0) throw new Error('npm pack: missing JSON metadata');
  const value: unknown = JSON.parse(output.slice(start));
  const entries: unknown[] = Array.isArray(value)
    ? value
    : value !== null && typeof value === 'object'
      ? Object.values(value)
      : [];
  const entry = entries.length === 1 ? entries[0] : undefined;
  const filename = entry && typeof entry === 'object' && 'filename' in entry ? entry.filename : undefined;
  if (typeof filename !== 'string' || !filename.endsWith('.tgz') || filename !== basename(filename)) {
    throw new Error('npm pack: expected exactly one local .tgz filename');
  }
  return filename;
}
