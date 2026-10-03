# Independent repair consumer: baseline only

Build a small headless repair host using only the supplied frozen paid-work-probe package/API and its Human API, plus Node built-ins. Do not read the Human Framework repository, other hosts, other reviewers or comparison outcomes. Do not edit the kit. Use a different natural world schema and domain names, not a copy of another host's accounting facade.

Initial scope: one repair, two willing possible repairers and a separate tool supplier. Give them clear stable IDs of your choice. The repair consumes one owned seal and produces one functioning pump exactly once. Installed work and its seal survive interruption/handover. A recipient is free to refuse if busy or lacking whole-remaining-work capacity; no assignment, credit or resource changes on refusal. Give the caller actual stop, start, offer-handover and advance controls.

Each actor starts fatigue/hunger .20. Worker A has repair .10 and hauling .10; worker B repair .60 and hauling .10. Supplier has crafting .10. The repair is .20 total effort, base 20-floor(current repair skill*4) minutes latched per worker on first assignment; minimum6. An earned tool subtracts6 from future bases. One paid minute advances the smaller of the remaining fraction and1/effective basis, costing .20 times that fraction and one full paid repair-practice minute. Use the frozen candidate law and real Human attempts, with no inferred/free practice. Check both whole remaining capacity at assignment and actual per-minute capacity. Free actors pay a real rest minute; no meals in these fixtures.

Optional tool scenario: supplier starts at0 with one owned tool blank, pays one crafting minute and .02 effort, then consumes the blank and makes the tool available at1 after all actors pay that minute. Only supplier can use the blank. It stays owned inventory until completion; no automatic gifts from external sources.

Optional busy-worker scenario: B starts a four-minute hauling duty at0 (.01 effort and one hauling practice minute each minute), then becomes free at4. Stop may interrupt that duty without output or refunding already paid cost. Nobody automatically resumes an interrupted task.

Run all people against the same beginning-of-minute world, then settle completions/tools. Clock supports integer minutes0..1,000,000 and at most1440 per advance, but each prescribed history is observed through40. No output/consumable can settle twice. Provide current-state JSON export/restore; preserve raw authoritative state, paid time/effort/practice, assignment/consent results and physical resources. Snapshot validation need not authenticate unavailable past history. State must be bounded without journals or accumulating command/receipt lists.

Implement two equally attended versions of this same host:
- Candidate consumer using paid-work-probe.
- Competent direct implementation of the same prospective work law, without importing or calling the candidate. Keep domain-specific direct rules simple; do not recreate unnecessary general helper abstractions or weaken ownership/validation just to make it smaller.
Shared unchanged host orchestration is allowed if its bytes/dependencies and obligations count in both arms. State/source assurance differences must be explicit; do not call a weaker validator a simplification win.

Exercise these seven scripts at common endpoint40 (derive completion times independently):
H1: A starts repair at0.
H2: Paid tool setup; A starts at0.
H3: A starts0, mandatory stop7, resume10.
H4: Paid tool setup; A starts0, stop/resume at1 after supplier completion.
H5: A starts0, offers remaining repair to B at1.
H6: B starts0, offers to slower A at1.
H7: Busy B setup; A starts0 and offers to B at1, who must refuse.

Test minute, next-event and uneven [3,1,7,2,5] advance drivers, clamping before commands and at1 for an additional active JSON round trip. Preserve intermediate states and per-worker paid accounting; endpoint fatigue alone can hide different costs. Also test unfit starts/recipients, stop/payment atomicity, repeat settlement and actual same-worker basis retention when a later proposed basis differs.

Record actual commands, full snapshots, comparisons and initial failures. Do not manufacture independent sample counts from driver repeats, empirical realism claims or human authoring-time measurements. Keep source/read provenance and record real ambiguities, integration obligations, exceptions requested and inclusive source/validation costs.

Freeze and return this one-repair baseline before adding further requirements. Do not add a UI, migration, generalized planner or public deployment. No package publication, external AI calls, network installs or other agents. Install the local kit offline with scripts disabled if useful. Ensure a test run also works with Node filesystem reads restricted to this independent directory; no repository access should be necessary. Root handles Git snapshots after you return.
