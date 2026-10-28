/** Verified live deployments only. Source pins and merged ports are insufficient.
 * Recheck live client >=0.5.5 and its per-person skip control by 2026-11-03.
 * None is certified yet; absent entries keep shared people read-only.
 */
export const PORTABLE_READERS: Readonly<Record<string, { client: string; perPersonSkips: boolean }>> = {};
