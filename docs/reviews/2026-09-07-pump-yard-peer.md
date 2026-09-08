# Pump Yard read-only peer review

Reviewed integrated main at 93a893cb1fd676b5a4a03a32c1d07a696c93048d, including f06d68f lane. No game files were edited.

No P1/P2 finding was verified in the requested repair/score farming, partial clock/rest, learning or controller-information areas.

## P3: Depot guidance continues requesting equipment already carried

Location: web/shift.js:29. Reproducer: fresh shift, click Take the toolkit. The inventory and latest event confirm collection, but the depot description still says “Pick up your toolkit and decide whether to carry the one spare.” Taking the seal also leaves the same request. On a subsequent depot visit this instruction remains stale even though neither equipment action is available. Make depot copy depend on current tools/seal stock and carried inventory; when equipped, direct the player to the job board or available meals. This is a small clarity fix, not a broken prerequisite.

## P3: Collapsed mobile control headings have very small tap boxes

Location: web/shift.css:1, summary styling. At 390 x 844, actual summary rectangles measure 13 px high for Controller suggestion and 15 px high for New shift & play controls, Researcher view & replay, and Model notes. Parent padding does not enlarge the summary click target. Inline save/help buttons and the file label declare 40 px minimum height. Main work controls are larger. Giving summary elements vertical padding/min-height and making the optional buttons at least 44 px would improve the mobile controls through which interval mode and saved games are reached. No horizontal overflow or JavaScript error occurred in the review browser path.

## Verified mechanics

- node --test tests/shift*.test.js: 22/22 pass.
- /tmp/pump-peer-probe.mjs: 150 seeded randomized legal-action sequences; 3,045 fractional pending export/import/resume comparisons identical; 231 rests after verified service did not change earned score.
- Verified jobs cannot be repaired or verified again through available actions. Score derives from immutable values and first verification timestamps, not an incrementing click counter.
- Fully paid target/route repair resolutions alone consume their own random counter. Zero-time starts/cancellations and other targets cannot reroll a pending repair trial. Equal-duration paid work has identical body/practice irrespective of success status; no failure bonus or extra completion XP was found.
- The player/controller projection excludes hidden condition and completed repair counters. Forecasts use public perceived body and observed/midpoint difficulty; the controller reads only the projected view.
- Exact-deadline verification and fractionally late verification are covered separately; a partial deadline action does not commit its unfinished world effect.
- Selecting another pump changes planning selection, not actual location; the only rendered action becomes travel to that pump and the route note explains this. I did not classify that flow as a verified confusion bug.

## Limits

This review does not demonstrate human enjoyment, comprehension or optimal controller play. The reported interrupted-work exceptions remain real fixed-heuristic trajectories, not free XP exploits. Inspection has no demonstrated strategy advantage in the current controller comparison; the documentation already states this correctly.

Browser probe: /tmp/pump-peer-browser.mjs. Screenshot: /tmp/pump-peer-selected-depot.png. Isolated server port 4187 and separate headless Chrome context; no shared user browser was changed.
