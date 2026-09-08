# What a reusable cooperation component should mean

Research update: 2026-09-07. This targeted pass supports the [MVP evidence lanes](../docs/superpowers/plans/2026-09-07-mvp-evidence-lanes.md). It is a comparison of candidate abstractions and selected evidence, not a systematic review or a calibrated social model. Existing live courtyard and Common Ground rules remain unchanged.

## The distinction that matters

A record that one person accepted a request can help a game preserve who owes what to whom. It does not explain why that person accepted, whether they intend to comply, what they think happened, or whether the request is good. These are separate responsibilities:

| Layer | Example | Owner in the next experiment |
|---|---|---|
| World fact | Two buckets changed hands; a particular roof was completed. | Host resource/object transaction. |
| Communication | A request was delivered to a named recipient; that recipient accepted it. | Candidate protocol, using host-authenticated commands. |
| Social record | A particular obligation remains open, was fulfilled, released or abandoned. | Candidate lifecycle and explicit host evidence. |
| Personal reason | The recipient values the promise but chooses to eat first. | Replaceable host decision policy; future actor reasoning. |
| Evaluation | A refusal was prudent, permissible or blameworthy in its actual context. | Distinct authoring/research interpretation; never inferred from production totals. |

A central simulation can know that a roof exists while an absent actor does not. A future observation channel must preserve that distinction. Making every agent read the authoritative obligation ledger would accidentally grant shared knowledge. For now, use the ledger as host infrastructure and label observed views separately. A receipt identifies the host's assertion; structural validation alone cannot establish that the asserted world event occurred.

## Three architectural lenses

**Joint intention.** Cohen and Levesque distinguish simultaneous coordinated activity from a team acting together, and examine shared mental properties and robustness to failures and misunderstanding. This is a useful counterexample to calling two active workers a complete team model. Their formal account is a candidate explanation/architecture, not human experimental calibration. Access in this pass: the authors' institutional abstract; the linked scanned paper was located but not read as full text. [Cohen & Levesque, *Teamwork* (1991)](https://www.sri.com/publication/teamwork/).

**Communication protocol.** Chopra, Christie and Singh compare protocol languages by explicit operational assumptions, including asynchronous interaction, concurrency and extensibility. Their criteria help ask whether an agreement component unnecessarily dictates agents' internal decisions or forbids unrelated work. Their evaluation concerns decentralized software; our present single-authority game loop is a narrower setting. We should borrow adversarial questions, not claim that our centralized ledger implements their distributed semantics. Access: abstract, introduction, concurrency/extensibility passages and design-principle passages in the author-hosted paper. [*An Evaluation of Communication Protocol Languages for Engineering Multiagent Systems* (2020), sections 4 and 8](https://www.csc2.ncsu.edu/faculty/mpsingh/papers/mas/JAIR-20-Langeval.pdf).

**Achievement versus maintenance.** Telang, Singh and Yorke-Smith distinguish achieving a condition from maintaining one, including restoring it after a permitted lapse. This matters for future defense: completing a repair once differs from keeping a defense operational over an interval. Their paper formalizes relationships among goals and commitments and illustrates an aerospace setting; it does not supply a measured compliance probability. Access: abstract and introduction, including the maintenance examples. [*Maintenance Commitments: Conception, Semantics, and Coherence* (2023), pp. 1–2](https://www.csc2.ncsu.edu/faculty/mpsingh/papers/mas/AIJ-23-goals%2Bcommitments.pdf).

**Engineering inference:** start with a small achievement-contract probe. Defer general maintenance semantics until a host genuinely needs continuing coverage and a recovery condition. Do not make the state machine physically prevent a person from abandoning an obligation. If abandonment is in scope, represent it distinctly from the beneficiary releasing the obligation. Cancellation authority and a limit on simultaneous obligations are declared protocol choices, not universal facts about people.

## Empirical counterpressure against an automatic cooperation bonus

Ostrom, Walker and Gardner's 1992 study investigates communication, sanctions and their combination in common-pool settings. The publisher abstract establishes the experimental comparison, but was not enough to extract task-specific coefficients or reproduce findings. The publisher's 2013 online date is not the study year. [*Covenants with and without a Sword: Self-Governance Is Possible* (1992)](https://www.cambridge.org/core/journals/american-political-science-review/article/covenants-with-and-without-a-sword-selfgovernance-is-possible/2191864CCB589D4B3528090CB596C254).

The follow-on evidence cautions against a single rule. Cason and Gangadharan report that, in their nonlinear common-resource experiment, peer punishment did not improve cooperation or resource yield, while communication was more effective. Access here: the authors' institutional abstract, not underlying data or full experimental methods. [*Swords without Covenants Do Not Lead to Self-Governance* (2016)](https://research.monash.edu/en/publications/swords-without-covenants-do-not-lead-to-self-governance/).

Koch, Nikiforakis and Noussair study heterogeneous returns in a public-goods experiment. They report complementary benefits of communication and punishment, but agreements and earnings remain below maximum aggregate production; equality concerns and the timing of communication matter. Access: publisher-indexed abstract, introduction and selected methods/results passages; direct page retrieval failed, and no data reanalysis was performed. [*Covenants before the Swords* (2021)](https://doi.org/10.1016/j.jebo.2021.05.003).

These are different experimental environments, not a direct replication pair. **Our inference:** preserve circumstances in which talking helps, fails to help, or creates an agreement favoring a person's share over maximum output. Neither study justifies a universal trust increment, an automatic refusal penalty, or forcing characters into the fastest joint plan. In the present deterministic host tests, equality of two implementations is useful portability evidence; it is not an empirical finding about cooperation.

## Revelation-guided constraint, separately attributed

The Qur'an's direction to honor pledges motivates retaining the identity and content of an undertaking. This source does not supply a software state machine, cancellation rule or numeric reward. Arabic source and the displayed Mustafa Khattab translation were checked; no school-specific ruling is being extracted from the site's adjacent tafsir. [Qur'an 17:34](https://quran.com/al-isra/34).

Cooperation is not unconditionally approved: the text distinguishes cooperation in righteousness from cooperation in sin and aggression. **Our design inference** is that higher coordinated output cannot itself be our measure of moral success. The factual result of a joint action and a character's understood reasons should remain distinguishable. [Qur'an 5:2](https://quran.com/al-maidah/2). Exact classifications of particular pledges, duties, excuses and release remain part of the existing [qualified Hanafi–Maturidi review track](islamic-foundations.md), not a general-purpose numeric faculty.

## Tests that can reject the candidate

1. Transfer the same contract lifecycle between a resource obligation and an ongoing project without importing quantities, recipes or body state.
2. Compare its observable outcomes with direct host state rules. If both work equally well, report the candidate's validation/maintenance cost rather than inventing a behavior advantage.
3. Preserve independent response, conflicting obligations, infeasible refusal, a changed plan and recovery during accepted work.
4. Keep preaccept withdrawal, agreed release, factual fulfillment and unilateral abandonment distinct where supported. Report unsupported transitions explicitly.
5. Reject stale/duplicate/unauthorized transitions while retaining bounded active state. Do not mistake this for malicious-save authentication or a distributed consensus protocol.
6. Demand a concrete benefit before adding a package export: shared tested invariants, less repeated host bookkeeping, clearer explanations, or easier extension. An extra layer and a longer vocabulary alone fail this test.

The immediate result should be an inspectable experiment. Shared-belief models, trust updating, testimony, explicit renegotiation and continuing maintenance commitments remain separately testable next candidates.
