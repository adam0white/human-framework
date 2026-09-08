**Verdict: negative for proposals and confirmations, positive only for the cheap one-way report.** Across the 80 development runs, the notebook family never beats the one-way-report rival on units served, delivery time, lost water or radio charges. The acknowledgment ablation changes no physical outcome in any case. The protocol's own rejection trigger, "confirmation never changes a consequential local choice", is met by the study's own data.

I read the contract, protocol, amendments, the policy source and the full summary. Nothing was executed. Replay equality and source hashes are self-reported. The bookkeeping verdicts for the stale-response and stale-readiness scripts are not in the summary, so the receipt-metadata claim rests on source inspection only: the notebook lookup sorts by observation time with receipt as tie-break, which is the intended semantics, but no run's physical decision depends on it.

Totals derived from the summary over the eight development cases:

| Arm | Units served | Units lost | Radio charges |
|---|---|---|---|
| cart-only | 8 | 0 | 0 |
| no-radio-earliest | 12 | 8 | 0 |
| fixed-early | 11 | 10 | 0 |
| fixed-conservative | 13 | 6 | 0 |
| contact | 13 | 0 | 0, plus 60 keeper travel minutes |
| one-way-report | 15 | 0 | 8 |
| reactive-radio | 13 | 6 | 16 |
| notebook | 14 | 2 | 22 |
| notebook-no-confirm | 14 | 2 | 20 |

Findings:

- **No physical decision reads a response or confirmation.** The keeper accepts its own proposal immediately and releases at the proposed minute whether or not the receiver's answer arrives, see `policies.js:91`. The receiver attends from its own acceptance. The only reader of a confirmation is the lossy-mode retry, which just sends another message. The proposal path is therefore a keeper-to-receiver schedule announcement with extra charges. That is why S1 and S2 are identical and why notebook and notebook-no-confirm match in all eight cases.

- **The proposal formula is forced waiting.** Release is fixed at now plus twice the maximum delay plus three. In D1 this delays two units from minute 12 to 20 for nothing. In D4 the wait happens to land after the 14-minute inlet repair, but the one-way keeper reaches the same two units at minute 17 by using the inlet fact directly. The D4 success is a coincidence of the wait, not negotiated value.

- **Notebook and reactive keepers discard a fact they hold.** Both receive the inlet time at minute 4, but only the one-way arm applies it to release timing. In D6 this costs the notebook two lost units that the one-way keeper preserves by never releasing.

- **Uninformed keepers use different priors by arm.** No-radio keepers assume launch 30, notebook keepers assume launch 15. The D8 gap between them compares priors, not information. D8's reactive loss turns on the radio minute pushing arrival from 18 to 19, one minute past the fallback window. Several rankings rest on such one-minute boundaries and should not be generalized.

- **Missing cheap rivals.** First, a no-radio receiver that protects the early window when its own inlet is short and the launch is early, and otherwise attends 11 to 18 before carting. That is the union of rules already coded. It reaches 14 units with no radio and loses to one-way only in D4 and D6. The outcome-informed protect rule was granted to one-way-report but not to no-radio-earliest, so the no-radio rival is asymmetrically weak. Second, two one-way reports with no proposal. It is absent.

- **Missing case family.** No case pairs a 12-minute keeper with launch 15. There a keeper report would tell the receiver to cart by minute 10 while the one-way receiver waits for water that legally cannot arrive. That is the one configuration where a keeper-to-receiver report earns a decision. It favors bidirectional reports, still not proposals.

- **Unexercised claims.** Reliable-bound inference is computed and never read. The retry never fired. Passive reception during long jobs is structurally unused because every policy steps repair one minute at a time. Contact visits only when repair is six minutes and only at minute 1, so in D2, D5 and D8 it is identical to no-radio-earliest.

Smallest corrections before freeze:

1. Make one physical keeper decision depend on the received response, for example hold water or revise on refusal. Without this the reserved lossy-confirmation case can only measure charge accounting.
2. Apply the inlet-fact release rule to every arm that receives it.
3. Add the adaptive no-radio arm and the two-report arm.
4. Add 12/2 and 12/14 with launch 15.
5. Report the retry as its own intervention and never credit confirmation with a saved retry.

Strongest counterargument: the development matrix was built to falsify, the one-way rival was added deliberately, and the reserved cases target lossy confirmations and delay bounds where acknowledgment might matter. Fair on intent, but the reserved cases cannot rescue the thesis with these controllers, because nothing physical reads a response. Any confirmation win there would be manufactured by the retry rule. The fix is to the policies, it must land before the freeze, and the current matrix should be retained as the first negative result.
