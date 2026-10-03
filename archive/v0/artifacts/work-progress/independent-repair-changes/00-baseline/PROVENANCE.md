# Source and read provenance

The independent consumer was instructed by the parent to work only inside `/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_`. Its canonical macOS path is `/private/var/folders/6r/ypdjgl911p92261djn7bv_l40000gr/T/hf-independent-repair-ajr5o5f_`. These are the same directory, not different sources.

Read to establish the contract: `REQUIREMENTS.md`, `kit/API.md`, `kit/HUMAN.md`, root `package.json` and `kit/package.json`. Read to implement/check integration: `kit/candidate.js`, `kit/src/human/v0.1.1.js`, and `kit/src/core/model.js`. The local package was already installed as `node_modules/paid-work-probe -> ../kit`; this was inspected, and no installation command was needed.

Read after implementation for checksum comparison: `kit-manifest.json`. The provided manifest names source commit `cf46083` and interface freeze `000feba`; these are provenance labels from that file, not independently inspected Git history. All eight listed kit files were hashed after implementation; the unused `kit/src/runtime/index.js` and `kit/src/runtime/clock.js` were hashed only and are not imported by either runtime arm. Their bytes are excluded from the active source dependency totals, with that exclusion explicit.

All authored code, tests, documentation and evidence were written/read within this directory. No Human Framework repository source, other consumer, prior comparison, reviewer, private memory, external documentation, network install, external AI call, subagent, Git command, publication or deployment was used. The parent-provided contract was the only task context beyond the kit; candidate documentation's mentions of another host did not lead to reading it.

The candidate and direct arms were developed by the same independent consumer author with the same tests and shared host orchestration. This is independent of the original consumer/repository, not a blinded comparison between two independent implementation authors. Direct's domain rule was authored from the prospective law after the candidate/API had been read; it does not import or call candidate code. Source provenance cannot turn this into a human-time experiment.

The candidate source was frozen by the parent before this consumer began and remained unchanged. This consumer requested no interface changes. The only execution issue was the canonical-path filesystem permission adjustment; no additional read scope was granted. Test fixtures with explicit nondefault origins and the synthetic upper-clock snapshot are documented in `CONSUMER.md` and `EVIDENCE.md`.

`evidence/freeze.json` inventories the final files and hashes, excluding itself and the preexisting node_modules symlink. The parent should take its baseline snapshot before issuing any extension requirements. No extension is implemented here.
