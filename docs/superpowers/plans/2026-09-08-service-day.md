# Service Day milestone implementation plan

Started by the authorized continuation at `ce968e8` on 2026-09-08. Baseline 421 tests pass, main is clean and the live app is verified 0.7 at `fa16e74`. User authorization covers implementation, private pushes and deployment with independent Astra Ultra and scoped Fable review.

## Design and work ownership

- `codex/service-day-core` owns a new two-person, two-obligation host. Morning inlet and later clinic service share real owned parts, meals, actual Human condition and partial work. Deniz has an intelligible own clinic commitment and can refuse incompatible requests. No free replenishment/reset or decorative surplus-only ending. Existing games and frozen runtime/model/clock remain controls. Specific design: `docs/service-day-design.md` in that lane, integrated with core.
- `codex/service-day-ui` owns the mobile/desktop world, choices, partner responses, carryover display, clock/session policy, saves and optional play-note integration. It consumes the agreed real core API; temporary mock layouts are not final verification evidence.
- `codex/service-day-comparison` owns preregistered view-only deadline-first versus clinic-conserving policies, actual carryover/fork evidence, frozen reserved comparisons and honest accounting. Both policies may be simple; no new planning faculty is presumed. Frozen host inputs and identical information/costs are required.
- Root owns shared routing/gallery/version, reviews, release integration and a static public-module graph guard. The guard should catch public JavaScript importing a module absent from the build allowlist without executing the app. It is a build check, not a new simulation dependency or a substitute for browser QA.

## Static module guard specification

Use built-in Node `vm.SourceTextModule` in a bounded child process with `--experimental-vm-modules` to parse static imports/reexports and link against the exact selected JavaScript set. Do not call `evaluate` or execute target source. A missing/private target, bare/remote import, invalid syntax or missing named export fails before clearing the previous build. Resolve relative/root-relative browser specifiers and preserve cycles. Query, fragment and percent-encoded specifiers are rejected: review found that stripping them conflates distinct browser module identities and can incorrectly accept conflicting star exports. This restriction replaces the initial query-stripping proposal; current public code requires none of these aliases. No third-party runtime/test dependency is added; Node 22 and current Node must pass. Relevant primary API: [Node 22 VM module documentation](https://nodejs.org/download/release/v22.0.0/docs/api/vm.html#moduledependencyspecifiers).

The check concerns **static JavaScript imports/reexports**. Computed/dynamic imports, HTML/CSS/worker/fetch assets and runtime behavior remain explicit browser/review obligations; do not call this a complete browser security boundary. The constructor/link stage is separate from evaluation, and VM is not treated as a safe evaluator of untrusted code. Source is parsed, not run. A timeout/parse failure is a blocked build with a useful file-level error. Alternate-root build fixtures keep using the authoritative build tooling.

## Checklist

- [x] Reconcile handoff/contract/roadmap and live manifest; run baseline; create isolated lanes and dispatch Astra Ultra workers.
- [x] Agree core exports/view contract and transfer dependency commits to UI/comparison without confusing their ownership.
- [ ] Core: test two feasible service routes, paid carryover, owned resources, independent decisions/refusals, partial interruption, late recovery, event precedence, strict imports and command-budget terminal continuation. Commit scoped source/evidence.
- [ ] UI: actual core-driven responsive interface and session tests, real browser download/import, phase transition with no reset, useful first actions and accurate consequence/response labels. Commit only UI-owned files.
- [ ] Comparison: preregister, freeze, execute matched view-only policies and carryover forks, retain failures/simple-policy sufficiency, audit individual owned costs and time, commit reproducible evidence.
- [ ] Root: failing tests for static graph errors/nonexecution/cycles/exports; implement guard and integrate before build output deletion; confirm unchanged public bytes on existing source.
- [ ] Obtain fresh Astra review plus two scoped Fable lenses; verify findings and fix concrete defects while preserving counterexamples.
- [ ] Integrate specific commits, add `/service/` and gallery/app metadata, full tests + minimum-version new tests + package/build checks.
- [ ] Local and production browser QA, pushed main, deployment, exact payload/manifest/private-path verification; save private release evidence and update current handoff/roadmap.

No generated note or agent review supplies a human participant. Human explanation, authoring benefit, physical-device timing and external empirical/theological validation remain open. If a strong simple policy gets all services, keep that result rather than making the host harder to favor another controller.
