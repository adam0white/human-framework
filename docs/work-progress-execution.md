# Paid-work experiment: concrete execution contract

Concrete scripts declared before comparison execution on 2026-09-08; candidate/rival development was dispatched from the earlier proposal. Source baseline add156c80fdaa546738a0f3cf677648d016e5174. This implements the [proposal](work-progress-proposal.md); it is neither results nor a candidate-interface freeze. Root specifies scripts; separate agents build candidate/adapter and direct/fixed hosts without reading each other's new source. A later fresh repair author receives only the frozen package/API and requirements.

## Camp-shaped host boundary

Both candidate adapter and D/F rivals export these immutable operations (world schema may differ internally):
- createWorld({toolArrival: null | 1, busyB: boolean, items: 1 | 2}); defaults null/false/1.
- command(world, {type: 'start', actor: 'A'|'B', item: 'work-1'|'work-2'}), {type:'stop',actor}, or {type:'handover',from,to,item}. Unknown/impossible starts and stops reject without mutation. A legal handover request records acceptance or refusal without charging time; the requesting worker consents to offer, while the recipient accepts only if free and capable. Refusal leaves current work intact.
- advanceTo(world, absoluteIntegerMinute), processing all actors' actual paid minutes before same-minute completion/tool effects.
- nextEvent(world): next meaningful completion minute, or null if none. The runner clamps to the next intervention/budget; an event query does not advance or mutate state.
- observe(world): the complete normalized accounting record below, separate from the actual authoritative snapshot.
- exportWorld(world) / restoreWorld(snapshot): JSON round trip with structural and cross-field checks appropriate to this bounded snapshot contract; no new history journal or authentication claim.

All worlds start at minute 0. A has construction .10, B .60; both have hauling .10, fatigue .20, hunger .20 and observationBias 0. Supplier C has crafting .10, fatigue .20, hunger .20, observationBias 0. Everybody uses unmodified Human 0.1.1. Free A/B/C automatically pay one rest minute per world minute; no food is consumed during these 40-minute fixtures. Use one-minute completed Human attempts for all activity so unequal outer drivers cannot change practice curves.

Each owned work item reserves 5 timber and 1 salvage on first start, retains that installed material on stop/transfer, and produces one completed stage once only. Initial free stock is 5 timber/1 salvage per configured item; no spare materials enter. A/B first basis is 20 minus floor(current construction*4), latched separately for each item/worker; never refresh after stop/resume. Actual duration basis is max(6, latched basis minus 6 when the paid tool is available), and one minute pays min(remainingFraction, 1/durationBasis), .20 times that fraction in effort, and one minute of construction practice. Use the existing Camp EPS=1e-12 completion rule. In D/candidate, tool availability changes future fractions without cancelling work.

A tool fixture gives C one owned tool blank at setup. C starts a one-minute crafting assignment at 0, effort .02, consuming that blank and making the tool available after all actors pay minute 1. Before completion there is no tool. C then rests. This is an explicit synthetic supplier task; no player tool, past work or historical source is invented. All arms use identical paid supply setup.

When busyB=true, B starts an owned four-minute hauling duty at 0 with total effort .04, paid as .01 per minute; no construction practice or material output. B cannot accept another task until that duty completes at minute 4. All arms share this setup.

F snapshots duration when an assignment first begins and finishes before optional tool adoption or optional handover; it may refuse that optional handover as its stated contract. Mandatory stop always stops. On resuming an interrupted item F retains progress and original worker basis; it must disclose whether it preserves or refreshes assignment tool state. Predeclare that choice before execution. Its physical/accounting differences from D are contract differences, never abstraction performance.

## Normalized complete accounting

observe(world) returns:
    {now, stock:{timber,salvage,toolBlank}, toolAvailable, outputs,
     actors:{A:{person,paid},B:{person,paid},C:{person,paid}},
     items:[{id,progress,completedAt,settled,reserved:{timber,salvage},
             contributions:{A?:{basis,minutes,fraction,effort},B?:{basis,minutes,fraction,effort}}}],
     assignments:{A:null|itemId|'hauling',B:null|itemId|'hauling',C:null|'crafting'},
     lastResponse:null|{at,item,from,to,accepted,reason}}

person is the full exported Human person record, not its rounded player view. paid is {work,recovery,effort,construction,hauling,crafting}; totals cover every minute. Items are sorted by ID; settled reservations report zero after transferring them to spent stock. To make conservation explicit include spent:{timber,salvage,toolBlank} at the top level. outputs is a count of completed stages. Completed items retain their bounded contribution record; at most two items exist. Use canonical sorted-key comparison of this complete record for D/candidate, with action IDs 'construct', 'haul', 'craft', 'recover' and targetId equal to work item ID for construction, null otherwise. Equivalent numeric zero is allowed, but differing physics must not be normalized away. Full authoritative exports are also retained.

## Eight scripts and advance-independent expected times

| ID | Setup and actual commands | Expected D/candidate first completion |
|---|---|---:|
| H1 | Default; start A/work-1 at 0 | 20 |
| H2 | toolArrival=1; start A/work-1 at 0 | 15 |
| H3 | Default; start A at 0; mandatory stop A at 7; resume A at 10 | 23 |
| H4 | H2 plus zero-time stop/resume A at 1, after tool completion | 15 |
| H5 | Default; start A at 0; request A→B/work-1 at 1 | 19 |
| H6 | Default; start B at 0; request B→A/work-1 at 1 | 20 |
| H7 | busyB=true; start A at 0; request A→B/work-1 at 1 (must refuse) | 20 |
| H8 | items=2; start A/work-1 at 0 and B/work-2 at 2 | both 20 |

Every script ends at minute 40; report completion separately from recovery/body/stock at that shared endpoint. Derivations: H2/H4 are 1+ceil(.95*14)=15; H5 1+ceil(.95*18)=19; H6 1+ceil((17/18)*20)=20; H3 7+3+13=23. H8 B rests before first assignment, so its skill basis is still 18. No comparison matrix has been executed.

Drivers: one minute; nextEvent clamped to next intervention; repeated uneven chunks [3,1,7,2,5], also clamped. Advance never skips or reorders intervening commands. Each driver has an additional JSON export/restore at minute 1 before same-minute scripted commands. These are repeated execution checks of eight histories, not extra independent conditions. Store each actual command, normalized observation and raw snapshot; outer chunk records may differ, while synchronized checkpoints/endpoints must agree.

Separately exercise duplicate component settlement and host completion processing, immutable rejection, same-worker basis retention, mismatched per-worker credit, and bounded active state. No more than 500 real work transitions per implementation for size/latency checks. Do not re-run old full game matrices. These scripts and expectations must be committed before experiment execution; candidate interface is frozen separately before the repair author begins.

## Second repair consumer

Use the same eight intervention histories with independent repair-world names/schema. Keep owned seal consumption, refusal, actual Human payment and exactly-once repaired-output effects in that host. It may adapt observations for comparisons but must retain complete original exports. Two predeclared repair-only changes after first integration are: use one owned gasket instead of one seal, and support a second separately owned repair. Neither may require shared candidate edits. Initial variant and changes, direct rival and candidate adapters all count toward inclusive cost. No public UI, journal or old-save migration is required.
