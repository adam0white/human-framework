# Security policy

## Reporting a vulnerability

Report vulnerabilities privately through GitHub's private vulnerability reporting:
[Security → Report a vulnerability](https://github.com/adam0white/human-framework/security/advisories/new).
Please do not open a public issue for a security problem.

Include what you found, how to reproduce it, and what an attacker could do with it. The project is maintained
by one person; expect an acknowledgement within a week. There is no bug bounty.

## Scope

- The site at https://human.adamwhite.work (the games and the home page, built from `apps/site`), including its
  response headers (`apps/site/public/_headers`).
- The `@adam0white/human-framework` package (`packages/human`) as released on the
  [GitHub releases page](https://github.com/adam0white/human-framework/releases).
- This repository's GitHub Actions workflows.

Out of scope: the archived v0 codebase under `archive/` (not built or deployed), Cloudflare's own
infrastructure, and findings that need a compromised browser or device. Saves and playtest exports are the
player's own data, held in their browser; a crafted save that only affects the player who loads it is a bug,
not a vulnerability, unless it runs code or reaches other origins.

## Supported versions

Only the latest release of the package and the currently deployed site receive fixes.
