# Review of the portable-kit evidence milestone

Started 2026-09-07; execution continued into 2026-09-08 UTC. This record separates a frozen external design/API review from reviews and executed checks of the subsequent implementation.

## Independent scope and provenance

Three GPT-6 Astra agents at ultra effort owned separate branches. `courtyard_experience` authored the social protocol experiment; `ongoing_commons` authored the Common Ground comparison; `runtime_critic` authored an installed-package maintenance/watch consumer. They cross-reviewed different lanes. Root integrated and independently repeated the comparison and social experiments.

Two additional, independent Claude CLI processes requested `--model fable`; both reported `claude-fable-5-1`, with auxiliary Haiku usage retained in the provenance. Each received the same nine-file frozen source/document snapshot, with Read/Glob/Grep access only. They did not receive user exports, credentials, configuration, other reviews, tests or the later lane implementations. Their findings are source inspection, not executed test verification. The direction response exceeded its requested 800-word ceiling; its complete original text is retained.

[API review](../../research/reviews/2026-09-07-evidence-fable-api.md) · [Direction review](../../research/reviews/2026-09-07-evidence-fable-direction.md) · [Process arguments, models and snapshot hashes](../../research/reviews/2026-09-07-evidence-fable-provenance.json).

## Findings and decisions

| Finding | Disposition |
|---|---|
| A changed transitive body/practice formula could be packaged under the same human version. | Accepted. Packaging now checks reviewed source hashes for the human module **and** its model dependency. It also binds each runtime package version to its human/clock version tuple. Regression tests first reproduced both the original source-drift hole and a peer-found tuple hole. Existing lock entries remain historical. |
| Pending-person import compares capacity through order-dependent JSON serialization. | Reproduced through public APIs. Reversing capacity keys fails; ascending sorting itself succeeds because the original fields are already alphabetical. The external claim that every canonicalized store necessarily fails is too broad. Fixed in Human/runtime 0.1.1 with explicit validated import, retaining the old implementation. |
| Fractional time can produce component-invalid state. | Reproduced below the time ceiling: a valid person starting at 32,768 accumulated minutes fails self-export after 2,945 one-second advances. The review's own example begins at the ceiling and would fail the bound first. Human 0.1.1 now derives accumulated pending time from its common start/elapsed reference; validation tolerance was not weakened. |
| Human wire fields and result semantics are incompletely documented. | Accepted. The public contract now lists setup, action, outcome, view and snapshot fields, capacity checks, paid failed/interrupted work, meal receipts, and read-only host reconciliation. Independent authoring exposed why the omitted effort/skill fields matter. |
| Concurrent jobs with different durations necessarily throw. | Corrected. Scheduling each attempt's end makes the clock stop at the earliest boundary and supports different durations. Documentation now states this coverage invariant and explicit idle accounting. Capping a person's advance alone would lose elapsed time. |
| ESM-only, exported constants and platform scope are unspecified. | Accepted and documented. Node/Apple Silicon execution is evidence; engine bindings and other build platforms remain unverified. |
| A controller comparison does not establish the value of the body's mechanics. | Accepted. The 48-trial comparison holds physics fixed and evaluates controllers only. A prescribed-action stamina-plus-practice-counter rival remains the next separate model-value test. |
| No preregistration, execution tests or named reviewers were supplied. | True of the review snapshot. The subsequent comparison has committed registration, frozen source hashes, development and reserved artifacts. This record names the lane ownership and cross-review; it does not retroactively expand the external reviewers' scope. |
| An event-to-attempt helper may be more useful than a social abstraction. | Plausible next design test. The independent host records this glue explicitly. Extract a helper only if a second host can use it without importing world rules, and retain the direct-host implementation as a rival. |
| Shared-leaf extraction could remove unused laboratory vocabulary from the package. | Deferred as a deliberate compatibility change. Current exports include unused authored constants but no laboratory controller. A source lock addresses immediate version drift; it is not a claim that the present dependency graph is the final design. |

## Implementation review consequences

The social candidate reproduced direct host outcomes while using more serialized state. It stays private and experimental, outside the portable package and public build. The initial randomized harness under-exercised work fulfillment; its failing coverage check and corrected sampling are documented, rather than counting a long null run as useful coverage. Peer review also tightened record chronology.

The maintenance consumer's first import validator accepted an internally valid but lower-effort repair. A public wire-schema clarification enabled complete action-blueprint matching. Cross-review then identified two further present-state contradictions: a capacity-blocked pending repair could still imply world progress, and a warning timestamp in the future could suppress lookout. These were reproduced with failing regressions and fixed as import invariants, not dismissed through an appeal to the separate limitation that saves cannot authenticate their entire history. The consumer report retains the defects and authoring assistance.

The integrated verification record links exact checks and source identity. The new experiments do not close the human playtest, physical-mobile performance, general social cognition or qualified theological review tracks.

Final implementation review found no remaining actionable defect in the new Human file or package wiring. The compatibility reviewer independently ran both Node versions, all 1,440 allowed/blocked capacity-key permutations, and 14,400 fractional differential advances per binary. A separate reviewer checked the final package, installed host tests, forged alternate-root registry, spoofed declaration and symlinked-ancestor rejection. Root reproduced the 48 comparison trials/pairs and final social probe and ran the complete 280-test suite. The frozen external snapshot did not include any of these subsequent implementations.
