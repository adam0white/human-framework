# Camp story slots

`web/camp-slots.js` is a pure synchronous adapter over the actual `camp-story` save API. It reads no DOM, storage, wall clock or network. The renderer supplies an ID and timestamp and owns persistence, user-visible quota/corruption errors, downloads and deliberate removal confirmation.

The fixed storage key is `human-camp-story-slots-v1`. A book is `{format:'human-camp-book', version:1, nextOrdinal:1, activeId:null, slots:[]}` at creation. It holds at most five separate slots, each `{id,label,createdAt,updatedAt,save}`. A newly added story selects its unique ID and receives the next `Camp N` label; ordinals are never reused after removal. Adding never overwrites a saved story. Every stored save validates through the selected story host, including inactive slots.

- `createBook()` makes an empty book. `addStory(book,game,{id,at})` validates and adds a separate exported story. `updateActive(book,game,at)` replaces only the active slot's save and update timestamp.
- `selectStory(book,id)` selects an existing slot without changing any story or timestamp. `removeStory(book,id)` is the caller's explicit deletion operation; if active, it selects the first remaining slot or null. Unknown/duplicate IDs and a sixth slot reject.
- `getActiveGame(book)` restores the active real story or returns null only for an empty book. `serializeBook(book)` validates the entire book before returning JSON. `restoreBook(rawString)` bounds the raw string before parsing, then validates all metadata and story saves. Corruption throws; it never resets, replaces or writes the caller's raw storage.

All calls leave caller inputs unchanged and return detached, deeply frozen book/save state. Only these fully frozen returned books receive an internal identity validation cache; external objects and parsed loads still validate every slot. IDs are 1–128 ASCII letters/digits or `._:-`, beginning with a letter/digit; UUIDs fit. Timestamps are caller-supplied nonnegative safe integers. An update cannot predate its slot's creation; the adapter neither reads time nor claims authenticated clock history. Metadata keys, version, label ordinals and active references are exact. Empty books require a null active ID; nonempty books require an existing active ID. At ordinal exhaustion, existing stories remain selectable, exportable and removable.

The raw book limit is **6 MiB of UTF-8**, inclusive and checked before `JSON.parse`; serialized book trees obey the same limit. Each story save separately obeys **1 MiB of UTF-8** and the host's stricter nested validation. Before serialization or cloning, traversal rejects repeated references/alias expansion, cycles, accessors, hidden/symbol properties, sparse/custom arrays, non-JSON values, nonfinite numbers and negative zero. Additional limits are 64 levels, 1,250,128 nodes and 10,000 UTF-16 code units per string. Byte counting avoids allocating an encoded copy of oversized input. These are bounded JavaScript/JSON inputs, not a guarantee about an arbitrary Proxy's user-defined traps.

The adapter does not catch provider quota failures or silently drop an old slot. The renderer must retain its current in-memory story on persistence failure and offer a visible warning/download. Browser storage access and deletion confirmation are separate UI responsibilities.

Seven focused tests pass on Node 26.8.1 and minimum Node 22.0.0. They exercise real three-/five-minute pending gathering, exact continuation after book reload, inactive save isolation/corruption, all five slots, explicit removal, ordinal exhaustion and hostile JSON/object inputs. The exact-byte boundary test initially padded by UTF-16 string length; real host text contains non-ASCII characters, so the fixture correctly failed the byte limit and was corrected to use UTF-8 byte length. The adapter's byte-bound behavior did not change to accommodate that test. Storage quota handling and browser interaction remain renderer verification work.


## Measured validation correction

The original adapter is preserved at `8eae7fe`. A bounded benchmark uses actual story states with 100 or 500 saved commands, 20 or 100 paid supply-window minutes, and one or five slots. Repeated public requests deliberately stress journal validation; they are synthetic reprioritization loads, not measured human command frequencies. Each case measures three `updateActive` + `serializeBook` trials with Node 26.8.1 on the same machine. No host source changes occur between the before/after measurements.

| Journal commands | Slots | Original median save time | Corrected median save time |
|---:|---:|---:|---:|
| 100 | 1 | 109.8 ms | 0.9 ms |
| 100 | 5 | 422.5 ms | 1.9 ms |
| 500 | 1 | 466.8 ms | 1.8 ms |
| 500 | 5 | 1,880.0 ms | 3.9 ms |

The correction avoids revalidating immutable books already proved valid and removes a redundant restore of a just-validated host export. Every returned book is recursively frozen **before** its identity enters the private cache. Derived books still check tree/byte bounds; callers cannot change a trusted inactive save, slot array or active ID. External copies receive full validation and are not frozen or mutated by validation alone. Raw `restoreBook` still restores and validates every inactive story: the observed five-slot/500-command load remains about 627 ms, so this is an ordinary-save improvement, not a claim that initial loading is fast.

All twelve serialized outputs have the exact baseline byte count and SHA256. [Original measurements](../artifacts/camp-slots/performance-before.json), [corrected measurements](../artifacts/camp-slots/performance-after.json), [benchmark source](../artifacts/camp-slots/performance.mjs) and [source/byte verification](../artifacts/camp-slots/performance-verification.json) are retained. The two first measurement reports' `sourceCommit` records their working-tree base HEAD (`8eae7fe`); their per-file hashes identify the actually executed bytes, including the then-uncommitted corrected adapter. This follow-up commit preserves those corrected bytes without overwriting either measurement. Timings are local samples, not browser-device guarantees.

Eight corrective tests pass on Node 26.8.1 and minimum Node 22.0.0, including rejected mutation of every frozen layer, rejected corrupt inactive saves in external copies and exact paid-state continuation. The new freeze tests failed against the original adapter before the correction. No clocks, timing code, dependencies or storage access were added to the pure adapter; the benchmark uses Node timing outside it.
