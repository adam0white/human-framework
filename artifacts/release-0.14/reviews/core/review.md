# Across 0.2.0 independent core review

One P2 finding was reproduced on the assigned source and then independently verified corrected. No further actionable findings emerged from this bounded review.

## Scope and source identities

Reviewed `src/games/across-cut.js`, `docs/across-player-core-contract.md`, and the 22 supplied core tests. Lens: actor-owned first-hop evidence, complete actor views/actions/errors/local receipt stops, immutable admission, paid time and materials, interruption/endpoints, actual legal histories and restored-state consistency.

- Initial host SHA-256: `788876ecb6b897d30224baa9f09d35996b6652408497d60b6b890a6c1c6ceaf2`.
- Initial contract SHA-256: `216dbe43be13e0ee4910d63f88816a078eb6729b17193cde911dcdff95873f20`.
- Initial supplied tests SHA-256: `f068676157baecb074a8f53fedbe7a2057b94a9a8ed8e712190fb54f4a022330`.
- Corrected host SHA-256: `21475414102a2e4238f639ab5546b2c01fa54586170cd952c397f966d38c60ad`.
- Runtime used for executed probes: Node `v26.8.1`.

Only local source and authored probe histories were used. No user exports, driver review, UI, external review calls, further agents, repository edits, full suite or broad scenario matrix. Project handoff/MVP/roadmap and a lightweight memory registry pass provided orientation. Runtime dependencies were copied for reproducibility, not independently reviewed.

## P2: Prior radio knowledge suppresses a later first-hand observation

Initial host line 48, `observeStation`, deduplicates the current local fact against the latest record without considering whether that record was received remotely. Consequently, learning a fact by radio before visiting its location prevents obtaining one's own record for that fact. This conflicts with the factual first-hop design: the actor is physically present at the dock notice/tally but cannot transmit the visible fact as their own observation.

Legal reproduction:

1. Create the default world. At time 0, receiver transmits its initial dock receipts `[1,2,3,4]` (launch time, departure flag, service tally, repair progress).
2. Advance to time 3, receiving those facts at keeper.
3. Keeper travels to dock; advance to time 9.
4. Keeper is at dock position 6, but all four dock facts still have only `via:'radio'`, `observedAt:0`, `receivedAt:3` records. No first-hand counterpart exists.
5. Selecting that launch notice for a paid contact transmission rejects with `NOT_LOCAL_OBSERVATION`. An additional paid inspection still supplies no local launch-notice record.

The issue is lost actor-owned evidence, not an illicit radio relay being accepted. The relay rejection is correct and should remain. The finding also survives export/restore, so it is not a cache artifact.

Suggested correction: retain remote records and create a new local observation when current visibility is deduplicating against a nonlocal record, even if its value is equal. The release owner applied this correction by adding `old.via!=='local'` to the observation condition and added their own regression test.

### Independent corrective check

On corrected source `21475414...`, the same story was replayed with an intermediate save/restore:

- At time 8, keeper remains at path position 5 and receives no premature local dock facts.
- At arrival time 9, all four facts obtain distinct local receipts with `observedAt:9` and `receivedAt:9`.
- Original radio receipts remain unchanged; selecting one still rejects as a relay.
- Restoring the arrival state, transmitting the new own records by contact, advancing to time 10, and restoring again all succeed. Recipient inbox records exactly preserve the four chosen source observations. Transmission costs one minute and consumes no radio charge.

Source hashes match before and after this narrow recheck. This is correction-specific coverage, not a rerun of all original probes against corrected source.

## Executed evidence and limits

The original 22 supplied tests pass (`supplied-tests.tap`). Eight independently authored focused cases ran on an isolated copy of the original host and its import graph; original host hashes match before/after. One case intentionally asserts the reproduced failure; the other seven verify:

- One pair of distinct remote body/work/departure/cart histories yields equal whole keeper views and outcomes for ten discriminating local commands, then both local receipt-stop advances reach public time 30 despite hidden service results of 1 versus 0.
- Every public state entrypoint rejects a fabricated report origin, and the envelope rejects on restore without mutating the caller.
- Capacity refusal preserves cart supply; an interrupted paid meal restores its owned reservation.
- A cart stopped exactly at delivery owns consumption once, remains at position 11, and pays five minutes to return without redelivery; water conservation is 3.
- A release completing exactly at time 30 preserves two consumed units in transit after the episode, with valid replay and total water conservation.
- Missing contact rejects without caller mutation; same-minute peer departure consumes the transmission minute but produces no delivery or radio consumption.
- Six invalid plain-data state variants reject without invoking supplied accessors.

These are concrete boundary checks, not exhaustive proofs or evidence of general gameplay usefulness. Minimum Node 22, browser behavior, driver policies, comparison results, empirical validity and deployment are outside this review. The release owner reported 23/23 supplied tests after the fix; that larger post-fix suite was not independently rerun here.

A source guard aborted the first attempted eight-case batch when the owner changed the live host from the original to corrected hash. No probe cases ran in that aborted attempt. The batch was then executed against the preserved original source under `source/`, so original and corrected evidence were not mixed.

## Reproduce and inspect

- `node /tmp/across-core-review/probes.mjs` reproduces the eight original-source cases using the preserved import graph under `source/`.
- `node /tmp/across-core-review/corrective-recheck.mjs` rechecks the correction against the live repository source and rejects if its host hash is no longer the corrected hash.
- `probe-results.json` and `corrective-results.json` contain exact evidence and before/after identities.
- `initial-source-manifest.json` records all files needed to import the preserved initial host.
- `across-cut.initial.js`, `across-cut.corrected.js`, `core-contract.initial.md`, and `core-tests.initial.js` preserve the reviewed source documents.
