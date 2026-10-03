# Continuous work: private correction contract

This bounded experiment follows direct player feedback recorded on 2026-09-08. It is an authored host correction, not a physiological claim. Original Common Ground, Before the Rain, Human 0.1.0/0.1.1, the clock, package locks and existing saves remain unchanged.

## Reproduction before implementation

`scripts/continuous-work-fixture.js` starts from the original public `createGame()` and uses only legal commands. The player starts fitting the workbench tools at 160. Meryem starts edging the garden at 187. Workbench completion at 188 leaves her existing garden job due at 207. Release plus request at 188 instead produces a fresh job due at 202, preserving the paid minute of body/practice but charging a new full .20 effort. The original failing behavior remains a passing characterization test; it must not be silently edited away.

## Selected bounded design

Three approaches were considered: rewriting the due date; keeping a physical fraction of a stage and changing future productivity; and replacing the human runtime. Select the physical stage fraction. A due-date discount alone cannot reconcile the existing pending Human attempt and can refund paid exertion. The runtime already accounts for paid segments and need not change.

The private continuation imports validated Common Ground snapshots whose active jobs are assemblies or whose people are idle. It rejects other pending jobs explicitly instead of losing them. Import retains the original snapshot as provenance, migrates persons through Human 0.1.1's explicit existing migration, closes the prior attempt without changing body/practice/time, and credits only the fraction evidenced by each still-active assembly. Already-canceled work is not reconstructed. This is a distinct private host/save identity; it is not a complete replacement game or a change to an imported legacy save.

Current stages persist independently of workers. Each stage has exactly one material reservation, attached to the physical worksite; stopping does not return partially installed material. Explicit accepted takeover changes the worker, never the earlier worker's paid time, practice or effort. An actor's stage-duration basis is retained across stop/resume so restarting cannot refresh skill bonuses. A new worker gets their own basis from their own skill. Skill gains affect later stages. Workbench completion changes future productivity only: historical fraction, body and practice stay paid. One host minute remains one paid minute; its final fraction may be smaller, and exertion is proportional to actual work. Practice remains the runtime's paid activity minute, including rounding at the final minute.

`snapshot` and `prospective` improvement arms isolate the workbench change. `active-idle` and `automatic` recovery arms isolate background rest. Unassigned people receive low-demand rest through existing runtime calls; a stopped simulation advances nothing. No finite rest job is exposed or needs canceling. Next Event stops at an actual completion, recovery floor, or finite six-minute review horizon, whichever comes first. It never waits forever for a nonexistent job. Eating retains Common Ground's explicit actor-specific reservation of one communal portion and eight paid minutes, with relief only on completion; stopping returns that reserved portion without relief.

The continuation supports starting stages, stopping, resuming, accepted takeover, eating, advancing and save/replay. It deliberately has no gathering, accepted-project controller, ferry or full game UI. Those are separate integration work; finishing this experiment cannot justify claiming the public bug is fixed.

## Test-first implementation sequence

1. Retain executable original counterexample and idle/rest characterization.
2. Write failing outcome tests for prospective workbench completion, invariant paid state, and unchanged snapshot control. Implement the minimal continuation.
3. Add discriminating tests for stop/resume, takeover, material conservation, same-minute command neutrality, automatic rest versus active idle, finite Next Event and interrupted consumption.
4. Add source-authoritative save replay with tamper rejection and bounded input. Verify chunk-equivalent continuation and fractional effort conservation.
5. Record exact source hashes and both old/new counterexamples. Run focused tests, repository tests, frozen boundary/build checks and minimum Node 22 checks. Commit private lane only; root owns review, push and any new public host version.
