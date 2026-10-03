# Three moments: focused public simulation

Approved task: the user requested a tiny focused game or simulation showcasing progress, following the connected-person delivery. This authorizes the showcase and its normal push/deployment workflow. The paused schedule stays paused. Routine interface decisions remain with the lead.

## Outcome and scope

Build /person/ as a two-minute interactive simulation with three decisions: learn a work method, meet an accepted household responsibility, and coordinate after a previous missed supply commitment. A completed run shows actual carried state and how one changed earlier experience affects the baseline choice. Reuse situated-person 0.1.0 and Human 0.1.1 unchanged. No new cognitive theory or daily physiology.

Design choice: a small interactive simulation on the existing site gives direct inspection of the candidate now. A new game campaign or continuous-days mechanism would delay delivery and is outside this task. The user has authorized proceeding; no additional design checkpoint.

## Frozen host/view contract

New host `src/games/three-moments.js` exports:

- `createShowcase({instruction=true,accepted=true,observedBreach=true}={})` -> detached session with `version:'0.1.0'`, `step:0`, explicit person(s)/world/history.
- `chooseShowcase(session, actionId)` -> next detached session. Throws on invalid action or completed run; consumes one of three decisions, records actual actor choice and consequences. Use real Human attempt lifecycle, and real situated-person records/decide; no UI simulation duplication.
- `getShowcaseView(session)` -> safe detached display view:
  `{step,complete,day,title,situation,known:[{label,text}],choices:[{id,label,detail,recommended:boolean}],lastOutcome:null|{title,text},carry:[{label,text}],summary:[{label,text}],comparison:null|{title,text},progressLabel}`.
- `replayWithout(session, factor)` -> fresh session resetting choices for one removed experience, factor one of `instruction`, `accepted`, `observedBreach`. Retain the other two original setup options. UI labels factors as knowledge/promise/observed history, not raw field names.

Stage 0 day1: guided-practice (only visible if instruction received), basic-practice. Same ten-minute practice exposure; guided method produces two items, basic one.
Stage 1 day7: deliver or paid-work. Show known commitment and items, 15-minute opportunity cost; accepted duty + care purpose gives baseline deliver, otherwise paid-work. User overrides allowed. Commitments use full attributed details; host-only fulfillment receipt. Housemate reacts to actual delivery/missed deadline.
Stage 2 day13: confirm or coordinate. Relevant observed supply breach yields baseline confirm; otherwise coordinate. Five-minute attempt; colleague responds from an explicitly delivered request. No omniscient prior history in actor view when observedBreach=false.
Finish day14: show actual outputs and carry (knowledge, purpose/commitment, interaction evidence) with one context-sensitive counterfactual derived by running the SAME shared decide function on changed initial experience and the same scene options. Label it as baseline comparison, not a claim the user's choice would necessarily change.

Chronology moves across dated episodes; there is no overnight body updating. No persistent saves necessary, restart and fresh replay are available. Do not expose future outcomes before the corresponding choice. The renderer must only consume getShowcaseView, never full internal state.

## File ownership and verification

1. Host agent: `src/games/three-moments.js`, `tests/three-moments.test.js`. Test before implementation: invalid commands, truthful history with withheld observations, all 2x2x2 initial factors and valid choice paths, immutable state, carried consequences, shared body/knowledge unchanged across inappropriate gaps, restart/replay. No edits to frozen candidate core.
2. UI agent: `web/person.html`, `web/person.css`, `web/person.js`. Read the contract only; accessible keyboard buttons, compact mobile layout, explicit restart, three factor replay buttons at completion. Quiet cream/green editorial appearance; each stage shows current choices, their costs and known consequences. Ordinary use stays concise. One collapsed Model notes section contains limits: authored deterministic rules, dated episodes, no physiological/psychological calibration or spiritual-worth scoring. Render dynamic text safely; DOM uses textContent.
3. Lead: public allowlists, home entry, app version 0.15.0, browser QA, release docs, integration and deployment. Run test suite, public build, mobile/desktop/browser interaction and private-path checks; verify deployed /release.json against pushed app commit.
4. Independent reviewers: correctness/information and focused product usability/goal alignment. One consolidated correction round, no unrelated polish.

## Acceptance

Three choices playable end-to-end on mobile and desktop; knowledge, responsibility and observed history visibly affect the shared baseline and actual consequences. A changed earlier experience can be replayed. Final explanation accurately separates player choice from baseline and world outcomes. Public source allowlist includes only required runtime, host and UI modules; research and artifacts stay private. Existing public examples continue loading. No scheduled work resumes.

## Ledger

- Design and interfaces frozen before independent host/UI assignments.
- Integration and normal deployment are authorized by the user request and repository workflow.
