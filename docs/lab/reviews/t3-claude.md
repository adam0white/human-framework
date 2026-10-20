I found one blocker and four should-fix defects; three of them I reproduced. The existing tests pass (18/18 in `apps/site/src/lab`). The worker tests are in that same file, since `apps/site/worker` has no tests of its own. The probes are in `scratch-claude/probe.test.ts`. I added and then removed a `node_modules` symlink to run them, so the only untracked item left is `scratch-claude/`. I edited, committed and deployed nothing.

## Blocker

**1. A day's stored totals keep only its first 600 batches, and the first dashboard visit after midnight freezes them.** `apps/site/worker/lab.ts:278-290`
- **What happens:** `dayAggregate` lists the day's raw batches in key order (`ev/<day>/00/…`, then `01/`, …) and reads only the first 600. For any day other than today it then saves the result to `agg/<day>.json` for good.
- **When it happens:** the first `/lab/data.json` request after 00:00 UTC saves yesterday that way. The 04:17 cron later finds the saved file and never recounts the day.
- **Probe:** 24 hours × 40 batches gives `sessions 600, sampled true`, and the quit points cover only `hour 00`…`hour 05`.
- **How soon it bites:** 600 batches is roughly 60–200 sessions, because a session sends about 3–10 batches. One modest spike in traffic is enough.
- **Fix:** only the cron saves a day's totals, and it reads every batch with no cap. The request path computes days that aren't saved yet, capped, and never writes them. Better still, have the cron (or an hourly cron) save per-hour totals such as `agg/<day>/<hh>.json`, so today needs at most 24 small reads plus the current hour's raw batches.

## Should-fix

**2. A 7.6 KB gzip upload can crash the Worker by running out of memory.** `lab.ts:169-178` → `core.ts:156`
- **What happens:** the body `{"v":1,"game":"pass","run":[{},{},…]}` is 7.8 MB uncompressed, which is under the 8 MB cap, and 7,642 bytes gzipped. `JSON.parse` of it grew Node's heap by **160 MB**.
- **Why that matters:** a Workers isolate has 128 MB. On top of the parse, the Worker holds the 7.8 MB string and then stringifies and recompresses the whole object.
- **Status:** reproduced in Node. The crash inside Workers is reasoned from that, not observed.
- **Blast radius:** one request is enough, so the per-address limit of 3 a minute doesn't help. Every lab request in flight on that isolate fails, and its cached `data.json` is lost.
- **Fix:** before `JSON.parse`, count `{` and `[` in the inflated bytes, reject past a few tens of thousands, and cap the nesting depth. Also lower `runInflatedBytes` to what real playtest exports need.

**3. Anyone can write arbitrary words onto the public dashboard, and the game id is never checked.** `core.ts:108-113`, `core.ts:133`, `lab.ts:136-147`
- **The `Origin` check isn't a barrier:** `curl` can send any `Origin`, so nothing after that check comes from a verified source.
- **Words pass the name filter:** `label()` lets through any letters and spaces. The probe passed `'visit evil dot example for free stuff'` and `'adam is a fraud'`, and both would be published in the top milestones and quit points of a real game.
- **Unknown game ids are accepted:** `parseBatch` and `parseRun` take any id that matches the pattern. Batches for a made-up game such as `zzz` still use up the 600-batch day cap from finding 1, which pushes out real games. Runs for unknown games count toward the 200-a-day limit and are kept forever.
- **How cheap the takeover is:** 20 addresses at the 30-a-minute limit take a whole day's 600 slots in the first minute after midnight.
- **Status:** reproduced.
- **Fix:** reject any game id not in `LAB_GAMES`; the Worker already imports that list. Publish milestone and screen names only if they are on a per-game list of declared names (for example in `curated.json` or `games.ts`). If an allow-list is too strict, show only names seen in at least N sessions.

**4. The rate limits fail against IPv6, and the run endpoint has no shared ceiling.** `lab.ts:131-132`, `lab.ts:156-162`; reasoned
- **IPv6:** the limit key is the full client address. An IPv6 client normally controls a whole /64 block, so it can use a fresh address for every request and is never limited.
- **No shared ceiling on runs:** events have `EVENTS_ALL`, but runs have nothing like it. Each run request that passes its limit runs an R2 `list`, a Class A operation, before the body is read. That still happens after the day's limit is reached.
- **Locking out real players:** 200 tiny junk runs reach "the notebook is full for today". That takes 67 address-minutes at 3 a minute, or a few seconds with /64 rotation. The junk is kept indefinitely, because nothing ever deletes old runs.
- **Fix:**
  - Key IPv6 clients on their /64.
  - Add a `RUNS_ALL` shared-key limit and check it before the `list`.
  - Check that `run` has the shape of a real export (a seed and an input log).
  - Consider a per-game daily limit.

**5. When `data.json` is rebuilt in the background, the 30-second limit can cut the rebuild off.** `lab.ts:402-419`; reasoned, not reproduced
- **What happens:** when an isolate already holds an older copy, the rebuild runs under `waitUntil`. On an HTTP request, `waitUntil` gets at most 30 seconds after the response (I confirmed this in the Cloudflare docs).
- **Why it can run long:** today's batches are read one at a time, up to 600 R2 GETs. At about 50–150 ms each, that's 30–90 seconds.
- **What I don't know:** if the cut-off leaves those reads pending forever, `finally` never clears `building`. That isolate would then serve the old copy until Cloudflare recycles it. I haven't checked how workerd treats pending reads when it ends the request.
- **Cost:** R2 reads grow with today's batches × rebuilds × isolates, not with the number of players.
- **Fix:** read the batches in parallel chunks, add a timeout that clears `building`, and use the per-hour totals from finding 1.

## Nits

- **The privacy page promises more than storage does.** It says "Nothing finer" than the hour, but every R2 object records its exact upload time to the millisecond. For event batches that lasts about 2 days; for runs it lasts indefinitely. Reword the page to say so. (`lab/privacy/index.html`)
- **The client can lose a session's `end` event.** `flush()` sends nothing until `/release.json` has answered. If the page closes before then, the queued events, including `end`, are lost. (`packages/lab-client/src/index.ts:161`)
- **Large batches fail silently.** A batch can hold 50 events of up to 80 characters. In Turkish or Arabic, UTF-8 multiplies those bytes and the batch can pass the 8 KB limit. The server answers 413 and the client ignores it.
- **Non-ASCII `who` labels may fail to store (needs a check).** `who` is free text that ends up in R2 custom metadata. If the R2 binding rejects non-ASCII metadata, the run fails with a 500 and is lost. Test it against miniflare or the real binding.
- **Missing tests for the risky paths:**
  - The test R2 mock ignores `limit` and `cursor`, so `listAll` and the paging in `cleanup` are untested.
  - Nothing tests the run 429 or the daily-limit 503, `scheduled`, the 600-batch cap, or the background rebuild path.

## Checked and fine

- Using `waitUntil` inside `scheduled` is fine: a cron invocation gets 15 minutes, and the 30-second limit applies only to HTTP requests (confirmed in the docs).
- Bulk deletes stay within R2's 1000-key limit. `cleanup` catches up after a long outage and stops; the existing test covers this.
- `listAll` and `rebuildRunIndex` follow `truncated`/`cursor`, so they handle pages that come back shorter when custom metadata is included.
- Names like `__proto__` and `constructor` are ordinary keys: the totals use dictionaries without a prototype, and the label filter strips `_`.
- `readCapped` limits both the compressed and the decompressed size. A gzip bomb gets a 413, and the existing test covers this.
- Run ids carry 50 random bits with no bias (256 is a multiple of 32).
- `data.json` contains no note, `who` label or session id; the test covers this. The dashboard uses no `innerHTML`.
- The fetch of each live game's `release.json` works in production; the live `data.json` shows commits for the external games.
- Sec-GPC and DNT are checked on the server before rate limiting or storage. Observability is off, and no address is stored.
- The send dialog doesn't remember `who`, and its events checkbox calls `setEventsOff`, which keeps the privacy page's promises.
