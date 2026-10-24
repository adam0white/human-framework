/** Browser ownership is local-only. Keep complete admitted cast and replay input unchanged. */
export function unlinkedFeedbackRun(run: unknown): unknown {
  if (!run || typeof run !== 'object' || Array.isArray(run)) return run;
  const copy = { ...(run as Record<string, unknown>) };
  delete copy.castOwnership;
  return copy;
}

/** Worker replacement can leave an export promise unanswered. Feedback must still send. */
export async function optionalFeedbackRun(getRun: () => unknown | Promise<unknown>): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(getRun),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), 4000);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
