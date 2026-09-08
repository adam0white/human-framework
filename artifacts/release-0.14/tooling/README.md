# Development-only Sharp security patch

GitHub reported alert1/GHSA-rgj7-g3m4-5g8c during the app0.14 push. Installed Wrangler4.129.0 → Miniflare5.20260903.0-alpha pinned Sharp0.35.2. The maintainer identifies versions below0.35.4 as affected and0.35.4 as patched: https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c . The newly available Wrangler4.130.0/Miniflare5.20260908.0-alpha still declares0.35.2, so upgrading that unrelated toolchain alone would not close the alert.

The scoped npm override `miniflare.sharp=0.35.4` changes only the development image dependency and its native codec packages. Pinned Wrangler/Miniflare and all browser/simulation sources remain unchanged. Installation used `npm install --ignore-scripts`. Independent review checks all27 changed Sharp-family lock entries against npm registry metadata; no unrelated packages/platform requirements changed. Revisit the override when the upstream toolchain adopts a supported patched dependency.

`npm audit` reports zero known vulnerabilities. Native synthetic2×2 AVIF encoding/decoding succeeds on Node26.8.1 and minimum22.0.0, using Sharp0.35.4/libheif1.23.2 on Apple Silicon macOS. Node22 emits its ordinary experimental JSON-module warning; both commands exit0. No exploit or untrusted image was used. The existing-site Wrangler dry run passes with the patched dependency. This is not native cross-platform testing or proof of absence of every vulnerability.

This tooling patch follows deployed app source2ebdb8841215a26f69da1c394ab438b7a1f4d15d. It is a private source/development change, not a new public app payload; the verified browser files and release manifest remain at that app source. GitHub alert propagation is checked separately after push and is not assumed from a local audit.
