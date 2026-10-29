# Voice native run

HF owns all five people. Voice supplies authored openings, world opportunities and actual host receipts through the public run API. Live views read public inspections and admitted events. Faculty magnitudes use words in the UI, including Debug. Cash and clocks remain exact.

The native archive in `VoiceRun.save()` is a complete cold checkpoint. Ordinary game files carry the full player input log, host metadata, world RNG and a native engine/hash commitment. That commitment is not an HF archive. Loading replays every player input and compares the actual native full hash. Cast source checkpoints retain the complete native archive separately.

A received text uses an actual attended event and its admitted source metadata. An emitted communication item is not a receipt. A received text is not a claim that HF stored a remembered episode.

Voice supplies each day's five prayer windows at the crossed public midnight. Isha continues until the next Fajr. HF owns duty status, exemptions, debt and make-ups. The town's daily hook only records host dates and rent accrual.

Current controls:

```sh
pnpm exec vitest run --project site apps/site/src/voice/sim/hf4-run.test.ts apps/site/src/voice/sim/hf4-boundaries.test.ts apps/site/src/voice/sim/hf4-game.test.ts --maxWorkers=1
```

The whole proof has two required sequential tests in one file. Capture plays a real choice through the complete month and report, exports a JSON file, then records the uninterrupted Keep Listening continuation. Replay loads that exact file, executes every input, and compares the native full hash, complete game state and town RNG before and after continuing. Capture retains only serialized evidence for replay. Replay fails if capture is absent. Each phase has a 600,000 ms budget. This replaces the port's original single 600,000 ms aggregate test envelope; it changes test composition and does not establish product performance acceptance. The CI job limit remains 20 minutes.

An earlier whole diagnostic exceeded its original envelope at 608,465 ms. It exposed forecast queries that unnecessarily cold-restored complete history; forecasts now use pure hypothetical IDs and public preview. The corrected run reached the report but failed snapshot decoding at 508,578 ms: JSON had erased host Sets and Maps. File DTOs now normalize every collection to the same complete representation already committed by the game hash. Live game collections remain Sets and Maps. Both failed diagnostics remain retained outside product source; neither is a passing whole proof.

The boundary controls cover pending and active JSON cold saves, compressed and plain file round trips with nonempty host collections, forecasts that leave the run unchanged, midnight opportunities, rent dates, native make-ups, actual receipt attribution, terminal people and named unsupported source refusal.

The `hf49-*.mjs` files are historical 4.9 contract probes. Their fixture is also reused by the small current host-boundary test; `hf49-contract-fixture.d.mts` supplies its public type declarations. The historical probe is not a current gate. Verification-only candidate alias configurations live outside product source.

Older editions receive a start-fresh message. The save key stays `hf-voice-run`.
