# Simplify shared package adoption — 24 October 2026

Use client **0.4.6** with kit **0.5.6**. HF remains **2.18.0**, engine **2.17.0**, with no engine-rule change. The earlier 0.4.5/0.5.5 candidate tarballs are preserved and superseded, never overwritten. npm publication remains deferred; distribution uses immutable GitHub release assets.

- [lab-client 0.4.6](https://github.com/adam0white/human-framework/releases/download/lab-client-v0.4.6/adam0white-lab-client-0.4.6.tgz)
  SHA512: `fa60304eef9365a22a9bcc08c9cfe1d137baa40a85628c6e9dd15078e606045f381cb2c1e0b8d47f68dd74863b9d51339e26bb71d69e85d74209065337b429b6`
- [lab-kit 0.5.6](https://github.com/adam0white/human-framework/releases/download/lab-kit-v0.5.6/adam0white-lab-kit-0.5.6.tgz)
  SHA512: `15061d0dd8f837d1040175f20c9264159eed3eadbe333f042d1a9264ea3874db92bef690d27dcf6d78665fccfc5466ea95e2b8de907ded82bc41ba8c75aa9a49`

Copy the exact release assets into the host's vendor directory and verify both hashes before installing:

```sh
npm install --save-exact ./vendor/adam0white-lab-client-0.4.6.tgz ./vendor/adam0white-lab-kit-0.5.6.tgz
```

Keep manifests and lockfiles together. Use the host's focused tests, signed commit, exact green CI and clean deployment. The signed source/release/live receipts are recorded in the HF worker report.

## Host changes

- Mount the actual `telemetryNotice()` node in a stable footer. Do not turn it into a boolean, copy its HTML or replace its text. Central notice state may asynchronously remove that node. Blocked/partitioned frames retain once/origin fallback.
- Send All games links to `https://human.adamwhite.work/games/` as ordinary top-level navigation. Central outgoing clicks use `gameNavigation(href)`. `createLab` consumes the fresh handoff before recording session initialization and strips the fragment.
- Keep diagnostic imports, seed/version choices, replay, export, verify and continuity controls behind exact `?lab=1`. `personaChannel` starts continuity automatically. Loaded state stays pinned. No hidden import of people or new cross-device service is added.
- Keep one Recording switch. Local Recording off and DNT/GPC remain respected. F-491 automatic linkage and one-page Feedback with optional sharing remain the authority. The default SDK dialog title is Feedback.

A top-level handoff changes future recording identity only. Earlier server records are neither merged nor relabeled. It transfers notice status, not fictional shelf history. Copied/stale/noncentral-referrer/unapproved-destination handoffs are rejected. A later partitioned iframe reply cannot replace the accepted future identity.

WebKit rejected a successful asynchronous same-origin shelf reply because its window source did not equal the iframe. A transferred request-specific reply port fixes that startup failure without weakening the old window-source checks. The request is still admitted only from an approved origin and the actual parent frame.

The historical BIL recording-ID split cause is unproven. Both engines retained one ID in the director's unblocked baseline. Deliberately blocking the identity iframe reproduces a split; top-level navigation recovers a central ID for future recording. This is a controlled failure-mode regression, not proof of ITP or recovery of historical identities.
