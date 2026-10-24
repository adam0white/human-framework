/** Browser ownership is local-only. Keep complete admitted cast and replay input unchanged. */
export function unlinkedFeedbackRun(run: unknown): unknown {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return run;
  const copy = { ...(run as Record<string, unknown>) };
  delete copy.castOwnership;
  return copy;
}
