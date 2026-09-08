# Tooling dependency review

Result: no actionable findings in the reviewed package.json/package-lock.json diff.

Reviewed at 2026-09-08T22:19:03.366Z, against HEAD 2ebdb8841215a26f69da1c394ab438b7a1f4d15d on main. Only package.json and package-lock.json were modified at review start. No repository source edits, installs, commits, full-suite tests, native codec execution or deployment were performed by this reviewer.

## Reviewed source identity

| File | HEAD SHA-256 | Reviewed working SHA-256 |
| --- | --- | --- |
| package.json | 176bef8898e797e8b786d0d711c79c1047ca237d366da3b5bae01f76c12c431f | 2fa659d24d5c9f6e0c7e7ad2d80ee9df757e330064915d505c21e20289f45cd7 |
| package-lock.json | 38e71a8f7d66e7608291d416b4322064672627c1ba80433349988d52d1680a69 | 41bf2dc2f980fbaa97364cdb097bb7574e3a365da51f6db1b8f9c89fac830be5 |

Exact git diff SHA-256: a2ae58cc9e88e0623d5ccf95366f6db246d09da2894292ed6b72094cb047d816. Diff scope: 130 additions, 120 deletions across the two package files.

## Evidence

- package.json adds only overrides.miniflare.sharp = 0.35.4. App version 0.14.0, all scripts, Node >=22 requirement, and direct development pin wrangler 4.129.0 are unchanged. No production dependency is introduced.
- Lockfile version remains 3. Exactly 27 existing package entries change: sharp 0.35.2 to 0.35.4, 16 Sharp platform/WASM entries 0.35.2 to 0.35.4, and 10 libvips entries 1.3.1 to 1.3.3. No entries are added or removed. Every changed entry remains dev=true; existing optional classifications and cpu/os/libc/engines fields are unchanged.
- All 27 changed entries were compared with the exact-version public npm registry metadata: version, dist URL, integrity, cpu/os/libc/engines, dependencies, optionalDependencies and peerDependenciesMeta all match (zero mismatches). Detailed public-package evidence: /tmp/across-tooling-review-registry.json. SHA-256: 0785014b8b6613758458515ccde3c181b1fda59555f2158979a448053144b80a. This validates lockfile values against registry metadata, not an independent tarball supply-chain audit.
- The Sharp dependency-range changes (semver ^7.8.4 to ^7.8.5; WASM @emnapi/runtime ^1.11.1 to ^1.11.3) are upstream metadata. Already-locked semver 7.8.5 and @emnapi/runtime 1.11.3 satisfy them and do not themselves change. The new optional @types/node peer metadata also matches upstream.
- Wrangler 4.129.0, Miniflare 5.20260903.0-alpha and every non-Sharp-family lock entry are byte-equivalent as parsed JSON to HEAD. Miniflare is the only declared Sharp consumer. npm ls --all sharp miniflare wrangler exits 0 and resolves Wrangler → Miniflare → sharp@0.35.4 overridden. Miniflare's original sharp 0.35.2 declaration remains in package/lock metadata, which is normal for an override.
- The nested override affects Sharp descendants of Miniflare, not every Sharp consumer globally. Its current match is exactly the targeted development chain; it neither replaces nor updates Miniflare. npm override semantics: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides
- The maintainer advisory identifies Sharp <0.35.4 as affected and 0.35.4 as patched, using prebuilt libheif 1.23.2: https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c . The chosen patch meets that boundary and matches the saved alert.

## Review limits

No browser/runtime source changes appear in this diff. This review does not assert deployed asset-byte identity; root owns the native AVIF smoke test, Wrangler dry run, and deployed-app verification. Cross-platform metadata was validated, but native execution on other operating systems was not tested. The override should be revisited when upgrading Wrangler/Miniflare so it does not keep a future patched upstream dependency pinned unnecessarily.
