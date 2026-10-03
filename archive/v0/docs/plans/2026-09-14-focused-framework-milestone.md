# Focused progress toward the fuller human framework

Status: approved for manual implementation on 2026-09-14; see [direct approval](../direction-2026-09-14.md). The proposal below preserves the reviewed design. The user requested focused effort with targeted subagents after identifying drift into small tasks. The user subsequently approved proceeding with the proposed milestone; population, situations and model below are the selected implementation defaults. Scheduled execution remains paused.

## Outcome

Deliver a headless, reusable person model that carries acquired knowledge, continuing purposes and relationship history through three connected situations through dated episodes spanning a proposed fourteen days. Later choices must respond to relevant earlier experience through shared person mechanisms. The existing body/action/time kit remains a reusable foundation.

This is one step toward the full goal in ../roadmap.md: situated human action and development, grounded in Islam and informed by empirical research. Aging, emotion, character development and broader social structures remain explicit subsequent responsibilities. This milestone does not establish a validated model of human behavior.

## Proposed selection

The concrete default for review is three authored adults, three connected situations and dated episodes spanning fourteen days. Deliver persistence and consequential choice across episodes; do not claim continuous multi-day development. The user approved these defaults and the time limitation on 2026-09-14.

## Proposed situations

1. Learning: a person receives instruction, attempts a task and encounters feedback. What they were told and what they experienced remain distinguishable.
2. Household responsibility: a previously accepted responsibility conflicts with an opportunity to pursue another purpose. Choice can honor, renegotiate or neglect it; the outcome persists.
3. Collaboration: the person must decide how to coordinate with someone encountered earlier, using only information available to that person. Another participant has a separate information history and responds through its own choice boundary.

These situations must connect. For example, an earlier instruction changes an available work method, work competes with a household commitment, and a communicated failure or repair affects a later coordination decision. They are reference cases with authored circumstances, not a new game or a claim about typical people.

## Approach and alternatives

Recommended: implement one integrated sequence with explicit ownership of persistent person state, with at least two of the three situations independently consuming the same mechanisms. Add only mechanisms needed for the declared sequence and transfer check.

A faculty-by-faculty program would support deeper individual models but risks delaying integration indefinitely. A broad whole-person prototype could expose coverage quickly but risks superficial variables and unexplained rules. The integrated sequence makes missing connections visible while retaining a bounded delivery.

## Proposed architecture

- Hosts own world facts, opportunities, resources, scheduling and authoritative outcomes.
- The person owns attributed observations/knowledge, explicit purposes, their understanding of commitments and actor-specific interaction evidence. Hosts or a shared social record own authoritative commitment terms, acceptance, revisions and outcomes. Changes reach each person through observation or communication; actual and understood status may differ. These records must have operational consequences, not merely accumulate as a journal.
- A replaceable choice provider receives only actor-accessible information and supplies an attempted choice. External choice remains possible, including choices contrary to a declared purpose or obligation. There is no LLM dependency.
- Existing body/action components own their current quantities. New mechanisms must not duplicate fatigue, practice or time updates.
- World outcomes enter a person's understanding only through declared observation or communication. A developer trace may show hidden truth separately.
- Use a strict versioned wrapper around the unchanged Human 0.1.1 component: knowledge, purposes, commitment views, interaction evidence and replay metadata have explicit schemas and stable references. Reject unknown fields and identifiers. Knowledge includes source, channel and received time; it must not silently increase procedural skill. Explicit snapshots preserve person identity and history across context changes.

Use explicit, inspectable baseline rules initially. Relationship history is not a universal trust score; recorded knowledge is not yet a theory of memory or forgetting. The model must distinguish a person's stated understanding of an obligation from a sourced normative judgment and from their actual action. No automated fiqh judgments or moral-worth scores are required for this milestone.

## Bounded implementation sequence

The lead freezes interfaces and expected causal outcomes before parallel implementation. Three sequential increments feed one integrated result; they are not independent research programs:

| Increment | Controlled intervention | Required operational result |
|---|---|---|
| Attributed knowledge | Deliver or withhold an earlier instruction, holding current observations and procedural skill fixed | A declared rule selects a different executable method with a recorded consequence |
| Purposes and commitment views | Accept a responsibility or leave it unaccepted with the same current opportunities | A baseline choice changes according to a declared priority rule; an external contrary choice remains valid and produces its own outcome |
| Interaction evidence | Deliver or withhold an earlier observed interaction, holding actual present opportunities fixed | The baseline requests confirmation or chooses a coordination method differently, affecting an attempt and the other actor response |

For each increment, remove only the new information or rule and check that the corresponding outcome difference disappears. Hold body, practice, current observations, opportunities and random seed equal where they are not the intervention. Record the executed chain from intervention to state, accessible input, policy rule, attempt and consequence. If a direct record/lookup rule suffices, use it. No general memory, motivation or trust theory is implied by these examples.

Commitment transitions must define authority: proposal, acceptance, revision, withdrawal, fulfillment and breach each have an explicit initiating actor or world event, counterpart effects and delivered observations. Authored scenario responsibilities are not automatically fiqh judgments. The host applies dated deadlines, including across gaps, without directly updating an uninformed person.

## Delivery and acceptance

1. Specify the person/host/choice interfaces and the expected causal differences in the three situations. Identify each rule as existing behavior, an engineering convention or a sourced model; do not invent empirical coefficients.
2. Implement and integrate the connected sequence. Save and restore the same person between contexts. Exercise another actor's independent information and response.
3. Run bounded comparisons and an independent integration check. Report demonstrated capabilities, limitations and the next substantive gap.

Acceptance requires all of the following:

- Each increment produces its specified attempted-choice or outcome difference and passes its intervention/removal check. Changed labels, inert metadata or explanations alone do not pass.
- Changing hidden world truth while holding observations fixed preserves actor knowledge, accessible views, noticed options and choice output before observation. Hidden checks must not leak through preflight feedback, derived fields or policy randomness. World outcomes may legitimately differ and be observed afterward; developer diagnostics remain separate. Irrelevant history cannot change unrelated decisions.
- Accepted commitments persist until explicitly fulfilled, revised, withdrawn or failed. Fulfillment requires a confirmed world outcome; an intention or request is insufficient. Undelivered changes to canonical commitment status cannot alter actor inputs. Conflicting purposes remain visible, and externally supplied contrary choices are not silently overwritten.
- At least two structurally different adapters among the three situations use the same person mechanisms. After the candidate interface is frozen, a separate implementer builds one adapter as an external consumer importing only that interface, with zero core edits. It must pass the same persistence and information checks. Context-specific content and world resolution remain in adapters; no fourth situation is required.
- Replay and save/restore preserve outcomes and information boundaries. Time handling across the proposed fourteen days is declared; existing short-duration body coefficients are not silently treated as validated multi-day physiology.
- A simple authored baseline receives equivalent information and opportunities. If direct rules suffice, retain them; added abstraction must demonstrate shared implementation or another declared benefit. Software reuse is not evidence of measured human authoring savings.
- A readable causal report identifies which prior event, current purpose or known obligation affected a choice. Explanations come from executed rules, not generated retrospective stories.

The proposed fourteen days describe dated episodes, not continuous physiological simulation. A host chronology timestamps episodes; Human 0.1.1 minutes represent modeled activity only. Physiology during unmodeled gaps is unspecified and stored body state remains unchanged. This limitation prevents claims about daily recovery. Reject future-dated observations, order simultaneous events deterministically, and verify segmented versus direct jumps between events. If continuous daily condition is required, select that larger scope explicitly rather than imply it has been delivered.

## Targeted delegation and control of scope

The lead agent owns the integrated result, interfaces, scope decisions and final verification. Subagents receive one bounded deliverable, necessary context, file ownership where editing, and a stopping condition. Use at most three concurrent supporting roles:

- Architecture/implementation: one shared capability with an agreed interface and integration example.
- Evidence: one decision-relevant question about a selected rule, with sources, limitations and a recommendation. Search ends when it can support a decision or clearly identifies the missing evidence.
- Independent review: challenge causal validity, information boundaries, reuse and alignment with the larger goal. Review findings are checked against the deliverable; one correction round is the default.

Do not delegate separate games or open-ended faculty inventories. Parallelize independent work only; dependent implementation follows the agreed interfaces. Select model and effort for the actual assignment and increase effort only for a specific unresolved problem.

Every substantial task must name the missing capability it advances and the acceptance check it serves. Work without that connection is deferred. No unrelated UI polish, legacy route maintenance, routine tooling upgrades, repeated completed studies or speculative feature additions.

Stop the milestone when the acceptance conditions are met, or report a specific failed condition and its consequence. Do not extend it automatically with refinements. Progress reports state capabilities gained, evidence, remaining gaps and the next decision; test counts and subtask counts are not measures of progress toward the vision.

## Delivery boundary

This document records the approved design, not implementation evidence or a restart of automation. Implementation includes appropriate verification and a remotely preserved handoff. Public deployment is needed only if the delivered app changes. Private framework work can be delivered without another game or a public release.

## Review disposition

One architecture assessment and two independent reviews informed this proposal. Corrections made: separate canonical commitments from actor understanding; use a versioned wrapper; define dated-episode time; require consequential interventions and removal checks; strengthen hidden-information and independent-consumer checks. No implementation, empirical validation or scholarly review has occurred in this preparation step.
