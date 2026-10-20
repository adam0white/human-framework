# Adversarial methodology review: playtester calibration, 2026-10-20

Read-only review. Only this output file was written. References beginning `docs/` are relative to `../../../../`. `calibration` below means `docs/lab/playtester-calibration-2026-10-20.md`; report filenames mean files in `docs/lab/reviews/calibration-2026-10-20/`.

The blockers concern the central conclusion and adopting protocol 2 as a validated replacement. They do not prevent fixing the driver or reducing checkpoint overhead. I read every supplied report and the prompt diff, checked the raw calibration diaries, reproduced the corpus timing script, and used two independent reviewers for methodology and evidence accuracy.

## Blocker

### 1. “Mostly the instrument” is an attribution the experiment cannot estimate

**Evidence:** Calibration:3 attributes most early quits to the instrument. Calibration:25 says the single sessions show “direction and size”; :33 says a short allowance “roughly halves the stay”; :34 calls the committed package a confirmed effect. But persona context, explicit patience, dislike clauses, floor, ceiling and reporting instructions change together. Access also differs. The document acknowledges n=1 per cell and confounding at :34,40–45 without limiting its headline accordingly. The 55 earlier sessions span different games, builds and targeted personas; they are not 55 replications of this intervention.

The controls show that early stopping also happens in two successful games under these conditions. They do not establish a false-negative rate, the expected verdict of these personas, or the fraction of HF quits caused by the instrument. A successful game can have a weak opening or be a poor fit for attentive lunch-break play. The instruction “stop when you would naturally leave” permits a quit; it does not itself require one. The older prompt also disclaims owing a favourable verdict or completed run.

**Concrete fix:** Replace the conclusion with: “These sessions expose access failures and suggest sensitivity to persona and session instructions. They do not estimate how much early stopping comes from the instrument versus the games.” Rename the causal entries under “Confirmed” as hypotheses consistent with these runs. Replace “direction and size” with “observed differences; repeatability and effect size are unknown.” Revise L22’s title and its claim of an instrument “floor” (`docs/lab/lessons.md:89–90`). Keep L21’s specific reproduced findings, but remove the implication that every subsequent quit must be a predictable measurement artifact.

### 2. Protocol 2 measures instructed persistence, and its positive verdicts may reflect that instruction

**Evidence:** `docs/lab/playtester-prompt.md:65–69` requires continued play after wanting to leave. n2, n3 and n4 stop at 15:05, 15:17 and 15:09 in the synthesis. n2’s stop explicitly says “I have played the fifteen minutes I set aside” (`n2-clips-v2.md:48`). n3 says “I am preserving the dawn page until the session floor” (:108), after its TOOL wish at 442.2 seconds (:102). Its report explicitly says this was a wall-clock floor, not 15 minutes of uninterrupted gameplay (:67). n4 likewise stops “after the committed floor” with its original TOOL wish unresolved (:134).

There is direct evidence that compliance extends these sessions. There is no independent evidence that the floor leaves first-wish reporting or return statements unbiased. Calling someone patient, giving them an evening, and ordering persistence can encourage explanations that justify staying. It can also expose genuinely rewarding later content. These data cannot distinguish those mechanisms. All four committed runs express some willingness to return, but two are qualified, tool-blocked tests; this is not validation of improved human enjoyment or retention.

**Concrete fix:** Label protocol 2 a provisional **continued-exposure test**. Call later recovery “recovery during instructed continued play.” Preserve a free-stop condition for voluntary persistence. State explicitly that the floor may affect reported wishes and return intentions. Report playable exposure separately from wall time, and mark the long TOOL stretches as censored access evidence. Apply the existing permission to stop promptly on a driver block. Do not interpret floor-bound stops as engagement gains. Yes, protocol 2 could make the games look better than they are if these qualifications are omitted; actual inflation has not been demonstrated.

### 3. The main comparison changes endpoints and incorrectly reports an ADR return conversion

**Evidence:** Calibration:34 compares old **actual stops** (ADR 4:13, Paperclips 2:00) with new **first tagged wishes** (13:32, 7:07). Old “first wish” entries in the table are not equivalent measurements: Paperclips’ 0:36 is irritation about button pressing (`c2-clips-old.md:81–85,143`); ADR’s 2:01 is wanting a second job (:47 in `c1c-adr-old.md`). That ADR report identifies its first thought of going back to work at 210.2 seconds (:95). Neither old run collected prospective `want_quit` events under the new rule.

Even the committed ADR diary contains an earlier possible departure signal: at 700.5 seconds, “I would happily leave this running while I made tea” (`n1-adr-v2.md:211`; raw `runs/n1-adr-v2-shots/wall-clock.jsonl:62` under the calibration scratch directory). The formal tag arrives at 811.7 seconds. Thus 13:32 is the first **tagged** wish, not an unambiguous first desire to stop attending.

Calibration:3,16,34 says old ADR was “no return” and turned to “would return.” The old report actually says: “I would consider returning voluntarily when I could leave an idle game open while doing something else” (`c1c-adr-old.md:97`). Its rejection is specifically another short attentive lunch session. That conditional interest resembles the committed run’s wish to make tea and let workers run (`n1-adr-v2.md:133–135`).

**Concrete fix:** Separate first negative reaction, first explicit departure thought, first tagged wish, and actual stop. Mark old first-wish measurements “not collected comparably.” Show the old and new conditional return statements side by side; remove the categorical no→yes claim everywhere. Report ADR’s earlier 11:40.5 candidate signal and label 13:31.7 as the first formal tag. Define a common coding rule before comparing further sessions.

## Should-fix

### 4. The timing arithmetic reproduces, but the statistic is not model inactivity during play

**Evidence:** Calibration:32 says commands return in milliseconds, waiting is model generation, and about 40% of wall time consists of silent gaps. `(driver scratch)/gaps2.py:2–12,19–29` selects heterogeneous timestamp fields, sorts every parseable event, and uses the first-to-last file span. It does not restrict events to actionable opening through stop, distinguish input/observation/note/completion records, or separate deliberate waits from inference and tool latency. Its parser also lacks the new `t` timestamp key, though `elapsed_s` can serve as a fallback.

I reproduced 43 files, median span 273.846 seconds, median event rate 11.932/minute and median fraction 0.408984. Those are reproducible file-log summaries. They include post-session time: `scratch/design-round/retest/warren-shots/wall-clock.jsonl` ends in a “post-session access-error clarification,” giving a 492.98-second span against the coded 357-second stop. Followups Stairwell spans 368.65 seconds against its 295-second stop. These examples alone invalidate calling every full file span a session span. Reaction timestamps can also follow the input they describe (`n2-clips-v2.md:14`; `n4-valley-v2.md:100`).

Native `command_execution` JSONL records do not establish operation duration. The n1 execution log contains both a 3-second locator timeout and an explicit `sleep 4` (`(driver scratch)/logs/n1-adr-v2.jsonl:26,30`). Gaps therefore cannot all be attributed to generation. No matched human clicking or reading speed was measured.

**Concrete fix:** Describe the existing result as exploratory “gaps between recorded events over complete log-file spans.” Remove the 0-ms operation-latency inference and the quantified inactivity interpretation from calibration and L22. Before using a corrected estimate, normalize each schema, identify play-window endpoints, separate event types and failed operations, and document exclusions. Measure input start/end and screenshot observation times separately. Report unclassified gaps without assigning their cause. The 55-report stop-time summary is a different calculation and should remain separate.

### 5. The desktop idle controls are diagnostic examples, not a fair benchmark or a deterministic drift alarm

**Evidence:** Calibration:42–43 acknowledges desktop layouts and model familiarity. The original HF sample uses phone input and includes real-time threats; the controls include idle accumulation and legitimate reasons to leave a tab running (:56). The control personas specifically dislike the controls’ central opening activities: repeated clicking and waiting (`c2-clips-old.md:3`; `c1c-adr-old.md:5`). Removing those dislikes in the committed runs improves persona fit as well as changing the protocol.

Calibration:69 nevertheless says a falling control first-wish time means “the instrument has changed, not the games.” One run can move through gameplay randomness, model variation, context or external-game changes. A stable desktop idle control also cannot clear a phone-specific driver regression. The canonical prompt mixes temperaments but does not specify a fixed control persona or repeated baseline (`playtester-prompt.md:10–13`).

**Concrete fix:** State exactly what these controls establish: the old procedure can produce an early stop outside HF. Do not infer a human enjoyment threshold from their reputation. Keep dislikes identical across compared arms, or change them as a separate intervention. Add a matched HF desktop comparison and a phone access check when testing phone games. Change the control rule to “a repeated shift warrants investigation.” Pin persona, model, effort, driver, viewport and available game version; establish ordinary variation before defining an alarm. Familiarity’s direction remains unknown.

### 6. The owner comparison overstates disagreement and attributes motives that were not measured

**Evidence:** Calibration:36 calls Warren a game every LLM quit. Its sources say quit **or mixed** (`owner-calibration.md:28,130–132`); the corpus codes Kofi mixed and Teodor a natural stop with conditional larger-screen return (`report-coding.md:46,57`). The source comparison calls the Warren verdicts “roughly agree.” Calibration:57 says the instrument “always produces a quit,” contradicting its own 37 quit / 9 natural stop / 6 keep / 3 mixed counts (:29).

“Good start” and “potential to become a deep, fun game” express development potential; they are weaker than a present-tense enjoyment verdict (`owner-calibration.md:124–144`). The synthesis turns this into an account in which the owner treats confusion as work and personas leave because of their brief (:36,55). Owner investment, familiarity, unmatched builds, device differences and unknown real minutes offer alternative explanations. Game days do not establish longer real sessions. The source even infers that Pass dead time did not bother the owner from absent inputs (`owner-calibration.md:163`), which does not establish his feelings. Rope supplies a counterexample to uniformly negative LLM taste (:106–118), although its builds also do not match.

**Concrete fix:** Correct Warren and remove “always.” Separate current enjoyment, development potential, satisfaction at a stopping point and conditional return. Say shared symptoms and differing expressed verdicts were observed on unmatched sessions; their cause is unknown. Retain the owner's acceptance authority from L16, while keeping that distinct from evidence about cold-player enjoyment. Preserve the Rope counterexample. Replace “cannot be compared” with “cannot be treated as matched quantitative comparisons.”

### 7. The driver count is wrong, and these sessions did not test the final canonical package

**Evidence:** Calibration:35 says “Three of the eight new sessions” lost play to the driver. The table lists ten attempts: c1, c1b, c1c, c2, a1, a2 and n1–n4. Four end with driver blocks: c1, c1b, n3, n4. n1 also loses its opening to a locator and first lights the fire at 101.9 seconds (`n1-adr-v2.md:18`). If the two aborted attempts are excluded, the denominator is eight and the terminal-block count is two.

Calibration:11 says “same … harness,” but reports describe independently written controllers, with repairs during n1 and prohibited debug attempts in n3/n4 (`n3-watch-v2.md:15`; `n4-valley-v2.md:3`). The canonical protocol now requires a standard driver; these reports used their own servers. The standard driver's operation may have separate evidence, but these runs are not complete-session validation of it.

**Concrete fix:** Report ten attempts, including two aborted ADR attempts, and four terminal driver blocks; separately note transient failures. Replace “same harness” with the shared automation approach and disclose controller differences. Label n3/n4 as protocol deviations in the synthesis table. Describe the standard driver as an operational remedy requiring a compliant full-session check before claiming protocol 2 has been validated.

### 8. Reasons are candidate findings; neither a reason word nor a replay citation proves a game fault

**Evidence:** Calibration:3,50 says named reasons are real and replay, yet :44 says individual scroll-artifact attribution is unknown. n3 carefully distinguishes visible occlusion from controller failure; n4 excludes grain gifting from game findings. L17 requires checking a report before changing a game (`lessons.md:69–71`); it is a rule, not proof that every new complaint was reproduced. Calibration:64 also declares TOOL and BUDGET “not the game's fault,” while the prompt explicitly assigns TOOL to a broken game (`playtester-prompt.md:68`). This combines game failure with access failure and can excuse a genuine game bug by definition.

**Concrete fix:** Write “reported reasons identify problems to reproduce; only independently reproduced game behavior is confirmed.” Keep observed screen behavior, interpretation, access limitation and reproduction status separate. Split broken-game stops from driver failures. Describe BUDGET as an administrative endpoint, not an explanation of the session's quality. Do not imply that the examples in a general lesson verify every current report.

### 9. The universal persona claim is stronger than the coding supports

**Evidence:** Calibration:30 says all 12 patterns personas are on a break and each carries a dislike clause. The coding describes Nadia on the sofa, Ingrid in an evening setting and Hatice after closing the shop. It explicitly distinguishes Yusra's and Teodor's affirmative wants from dislikes (`report-coding.md:53–57`). The table supports widespread targeted framing, not those universal statements.

**Concrete fix:** Say all 12 had an eight-minute ceiling, while persona contexts varied. Quote exact persona wording when asserting a personal time limit or dislike. Keep the 29-of-36 targeted-dislike count qualified as coder judgment. Do not convert an affirmative interest into an aversion. The eight readers do not by themselves establish agreement on these subjective classifications; mark borderline rows and avoid treating their totals as objective causal measurements.

## Nit

### 10. Several displayed times attach ratings to actions or mix timing origins

**Evidence:** Calibration:20 attaches 5/5 to the cart purchase at 5:52; the pulse is 5:57.8 (`n1-adr-v2.md:44,61`). :21 attaches 4/5 to the 2:24 AutoClipper purchase; the pulse is 2:57 (`n2-clips-v2.md:38,54`). :23 associates the newborn with 2:54, the pulse time; the visit occurred at 2:23–2:35 (`n4-valley-v2.md:38`). n3 uses navigation elapsed: its report gives usable-screen stop 15:13.7, first TOOL wish 7:19.0 and peak pulse 3:00.8 after subtracting 3.2 seconds (:67,83). a2 likewise uses navigation time with opening first captured at +4 seconds (:7). Calibration:31’s 10–17-second checkpoint delay is not a corpus range: Pass was 40.925 seconds late (`report-coding.md:11`). Paperclips’ 2:00 also lies outside a literal 3–5-minute band.

**Concrete fix:** Separate highest sampled engagement and its timestamp from the reported best action and its timestamp. Label timing origin per row and normalize only where measured. Say checkpoints were sometimes more than 40 seconds late unless giving a computed distribution. Use “early stops” rather than treating 3–5 minutes as a demonstrated boundary. Retain c1c's reported best moment at 217 seconds even though a numeric engagement pulse was not requested (:91).

## Falsification and the cheapest next experiment

The claim currently lacks a defined “mostly” quantity. First narrow it to two testable questions: does the floor change departure reporting, and does neutral persona framing change free stopping? Do not change both in the same comparison.

The cheapest useful screening experiment is four independent fresh sessions on one frozen HF build: two with free stopping and two with a 15-minute floor, assigned in random order. Use the same tested driver, viewport, neutral persona, model, effort, 25-minute ceiling and prospective diary in both arms. Keep dislikes, checkpoint instructions, pulse schedule and allowed speed controls identical. Do not tell testers which outcome is expected. Stop and censor access failures immediately. Have a reader unaware of assignment code the earliest explicit departure desire from the complete diary, separately from formal tags, actual stop, progress, ratings and conditional return. Record continuation beyond that desire as instructed exposure, not voluntary retention.

Four sessions can expose a large floor artifact; they cannot estimate a stable effect. If useful, extend to three sessions per arm on both that HF build and ADR (12 sessions total). Test persona context later with the floor absent and everything else held fixed; test dislike wording separately. Define decision rules before seeing results. Overlapping free-stop and floor first-wish times would weaken the claim that the floor reveals a later departure point. Floor-bound stopping or more positive return language without a corresponding shift in the independently coded departure desire would undermine treating protocol 2's positive outcomes as voluntary engagement. HF continuing to produce early, game-specific departure desires while the control holds interest would favor game-specific explanations. Failure to reproduce a neutral-framing effect would weaken the priming explanation. Any claim about human enjoyment or actual return still needs observed human sessions or return behavior; another model's stated intention cannot establish it.

## Verdict

The calibration establishes useful access failures and a reason to distrust raw stop time as a standalone enjoyment score. Its 55-report descriptive totals reproduce: median 257 seconds, range 150–395, 45 stops before five minutes, outcomes 37/9/6/3 and the stated primary-reason counts. It does not establish that the instrument causes most quits, that ADR converted from no return to return, or that compulsory continued play is a better measure of voluntary engagement. Correct the endpoint and quote errors, narrow the timing interpretation, preserve the owner's actual distinctions, and present protocol 2 as a provisional continued-exposure procedure alongside free-stop testing. The operational changes are reasonable; the causal conclusion and validation claim need the controlled follow-up above.

## Second pass (conclusion and "Floor against free stop", after the experiment)

Codex, read-only, blockers only. Three blockers, all applied: the opening no longer assigns cause ("at least partly the game") or says the comparison "separated" the games; the comparison bullet now states only that both A Dark Room sessions outlasted both Night Watch sessions, with n=2 and the device and genre confound; the floor bullet now records that both floor sessions reported a temporary recovery and that the floor's effect cannot be separated from delayed reporting. L22 was softened to match.
