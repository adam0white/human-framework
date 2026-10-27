# Simplify shared package adoption — 24 October 2026

> Historical simplify adoption wave, 2026-10-24. Preserve these artifact hashes and host-change receipts. Do not use its opening package pins for a new adoption. HF 3 hosts use [client 0.4.10 and kit 0.5.11](navigation-journal-adoption-2026-10-25.md), with exact release receipts. Per-game source, deployment and owner readiness remain separate.

Use client **0.4.6** with kit **0.5.7**. HF remains **2.18.0**, engine **2.17.0**, with no engine-rule change. The earlier 0.4.5/0.5.5 candidate tarballs and kit0.5.6 are preserved and superseded, never overwritten. npm publication remains deferred; distribution uses immutable GitHub release assets.

- [lab-client 0.4.6](https://github.com/adam0white/human-framework/releases/download/lab-client-v0.4.6/adam0white-lab-client-0.4.6.tgz)
  SHA512: `fa60304eef9365a22a9bcc08c9cfe1d137baa40a85628c6e9dd15078e606045f381cb2c1e0b8d47f68dd74863b9d51339e26bb71d69e85d74209065337b429b6`
- [lab-kit 0.5.7](https://github.com/adam0white/human-framework/releases/download/lab-kit-v0.5.7/adam0white-lab-kit-0.5.7.tgz)
  SHA512: `491a41dc363cf30d8acf3972c531f0e41dc0b5748b15cefc80d6b15924bab1160ca2683cebd8cdfa2da97aefacbee1150c172d7977117285f0c7b7e043e089b0`

Copy the exact release assets into the host's vendor directory and verify both hashes before installing:

```sh
npm install --save-exact ./vendor/adam0white-lab-client-0.4.6.tgz ./vendor/adam0white-lab-kit-0.5.7.tgz
```

Keep manifests and lockfiles together. Use the host's focused tests, signed commit, exact green CI and clean deployment. The signed source/release/live receipts are recorded in the HF worker report.

The compact0.5.7 disclosure is “We record and link play across games on this device.” It has no Dismiss control. It keeps the same asynchronous claim and actual DOM node. At360px, both Chromium and WebKit measured14px text and28.890625px height after fonts loaded; enlarged text wraps naturally.

## Host changes

- Mount the actual `telemetryNotice()` node in a stable footer. Do not turn it into a boolean, copy its HTML or replace its text. Central notice state may asynchronously remove that node. Blocked/partitioned frames retain once/origin fallback.
- Send All games links to `https://human.adamwhite.work/games/` as ordinary top-level navigation. Central outgoing clicks use `gameNavigation(href)`. `createLab` consumes the fresh handoff before recording session initialization and strips the fragment.
- Keep diagnostic imports, seed/version choices, replay, export and verification in collapsed Debug beside Lab privacy. Put cast controls and chosen persona experiments on the public central shelf. `personaChannel` starts continuity automatically. Loaded state stays pinned. No hidden import of people or new cross-device service is added.
- Keep one Recording switch. Local Recording off and DNT/GPC remain respected. F-491 automatic linkage and one-page Feedback with optional sharing remain the authority. The default SDK dialog title is Feedback.

A top-level handoff changes future recording identity only. Earlier server records are neither merged nor relabeled. It transfers notice status, not fictional shelf history. Copied/stale/noncentral-referrer/unapproved-destination handoffs are rejected. A later partitioned iframe reply cannot replace the accepted future identity.

WebKit rejected a successful asynchronous same-origin shelf reply because its window source did not equal the iframe. A transferred request-specific reply port fixes that startup failure without weakening the old window-source checks. The request is still admitted only from an approved origin and the actual parent frame.

The historical BIL recording-ID split cause is unproven. Both engines retained one ID in the director's unblocked baseline. Deliberately blocking the identity iframe reproduces a split; top-level navigation recovers a central ID for future recording. This is a controlled failure-mode regression, not proof of ITP or recovery of historical identities.
