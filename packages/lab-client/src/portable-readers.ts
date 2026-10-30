/** Verified live manifests and their exact source bindings, checked 2026-10-29.
 * Warren: https://warren.adamwhite.work/release.json — 88de249cbc79efbd800291122c47ed4e0626e2cc.
 * Well: https://human.adamwhite.work/release.json — 11ad834f8b161d2fb27f31f129d7028ff1beed5d.
 * Warren continuity.fresh skips blocked/unsupported people individually.
 * Well uses claimSiteCastBatch with per-person worker preflight and named skips.
 * Watch: https://human.adamwhite.work/release.json — 097892eacdcb64a8ca8c127213e604bee0bf7eb7, client 0.5.14.
 * Watch claimSiteCastBatch names per-person skips; live synthetic occupied and unsupported
 * histories retained their complete envelopes after export (2026-10-30).
 * Recheck by 2026-11-03. Absent peers remain read-only; these certify readers,
 * not an HF4 port, successful admission, or permission for every other writer.
 */
export const PORTABLE_READERS: Readonly<Record<string, { client: string; perPersonSkips: boolean }>> = {
  warren: { client: '0.5.7', perPersonSkips: true },
  well: { client: '0.5.9', perPersonSkips: true },
  watch: { client: '0.5.14', perPersonSkips: true },
};
