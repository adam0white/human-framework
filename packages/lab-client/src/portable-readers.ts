/** Source candidate only. Publish16 only after every pending reader below has a
 * signed exact-green deployment and retained reader proof. See
 * docs/lab/reader-rollout-2026-10-30.md. Existing app runtime remains15/32.
 * Verified historical live manifests and exact source bindings through2026-10-30:
 * Warren: https://warren.adamwhite.work/release.json — 88de249cbc79efbd800291122c47ed4e0626e2cc.
 * Well: https://human.adamwhite.work/release.json — 11ad834f8b161d2fb27f31f129d7028ff1beed5d.
 * Warren continuity.fresh skips blocked/unsupported people individually.
 * Well uses claimSiteCastBatch with per-person worker preflight and named skips.
 * Watch: https://human.adamwhite.work/release.json — 097892eacdcb64a8ca8c127213e604bee0bf7eb7, client 0.5.14.
 * Watch claimSiteCastBatch names per-person skips; live synthetic occupied and unsupported
 * histories retained their complete envelopes after export (2026-10-30).
 * Glance: https://glance.adamwhite.work/release.json — 9a6c484d16896021775d0106bc54f37a46c78da8,
 * client 0.5.13. Receipt: resume-glance-reader-delivery-receipt.json (2026-10-30),
 * eight actual production viewport/engine controls with isolated synthetic shelf transport.
 * This certifies per-person reading only; outgoing Glance checkpoints stay disabled.
 * Good Hands: https://goodhands.adamwhite.work/release.json — 354141d88a19ca34735795336da455b1a4cf7045,
 * client 0.5.7. Receipt: resume-goodhands-reader-delivery-receipt.json (2026-10-30),
 * two live viewport controls, full state/continuation replay and twelve byte-matched assets.
 * Only optional roles are covered. Its required Nermin opening deliberately refuses
 * unavailable histories (Good Hands docs/design.md); this certificate preserves that rule.
 * Rope: https://rope.adamwhite.work/release.json — a75c2910d96fbb2e50bc56a4a8cf20cd6c489982,
 * client 0.5.15. Receipt: resume-rope-refusal-delivery-receipt.json (2026-10-30),
 * four completed start/resume viewport controls, complete replay and thirteen matched assets.
 * Synthetic shelf transport proves reader safety, not custody or source retirement.
 * Stairwell: ecf6da82b7a6e267f4f8165eab0990cb271a614d, client13.
 * Headless current owner/SDK/replay plus all ten live assets; rendered UI unverified
 * because the leased browser was unavailable and isolated browsers are forbidden.
 * Hearsay:76ebfb8f73956e1bbdc5cc6318d9f15e453d105b, client12; actual
 * live two-size reader/input/export/native/file replay and preserved originals.
 * Pass:b6e919a8601554aa2aac34045286f1b3cf8f9245, client12; actual live
 * two-size native/file/usefulinput/export/reload with single visible named notice,
 * preserved originals and complete replay;100 immutable delivery artifacts verified.
 * Murmur/client8 and Voice/client15 are PENDING live qualification.
 * Their candidate entries MUST NOT be published without the release receipt gate.
 * Recheck by 2026-11-03. Absent peers remain read-only; these certify readers,
 * not an HF4 port, successful admission, or permission for every other writer.
 */
export type PortableReaderCertificate = {
  client: string;
  perPersonSkips: boolean;
  /** Omitted covers all roles; present covers only these IDs. Empty covers none. */
  castIds?: readonly string[];
};
export const PORTABLE_READERS: Readonly<Record<string, PortableReaderCertificate>> = {
  warren: { client: '0.5.7', perPersonSkips: true },
  well: { client: '0.5.9', perPersonSkips: true },
  watch: { client: '0.5.14', perPersonSkips: true },
  glance: { client: '0.5.13', perPersonSkips: true },
  rope: { client: '0.5.15', perPersonSkips: true },
  stairwell: { client: '0.5.13', perPersonSkips: true },
  hearsay: { client: '0.5.12', perPersonSkips: true },
  // Inactive until immutable publication, which requires each live proof above.
  pass: { client: '0.5.12', perPersonSkips: true },
  murmur: { client: '0.5.8', perPersonSkips: true },
  voice: { client: '0.5.15', perPersonSkips: true },
  goodhands: {
    client: '0.5.7',
    perPersonSkips: true,
    castIds: [
      'hf.cast.zeynep.pass',
      'hf.cast.derya.stairwell',
      'hf.cast.selin.voice',
      'hf.cast.hulya.pass',
      'hf.cast.hatice.hearsay',
      'hf.cast.aylin.murmur',
    ],
  },
};
