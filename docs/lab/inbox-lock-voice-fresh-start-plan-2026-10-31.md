# Inbox lock and Voice fresh start: current fixes (2026-10-31)

Two post-merge review findings at `c4a84b7` (C0-CODE-1 lock P2, C0-O1 stale init P2). Both are source-only fixes. No framework package, simulation, clock, persona, admission or API change; the existing HF v3 increment is unchanged. Nothing here publishes, deploys or accepts anything.

## 1. `scripts/lab-inbox.ts` cache lock (C0-CODE-1)

**Bug.** On an existing lock the script checks the holder's PID, removes the lock and retries. Two contenders can both pass the dead-PID check; one then removes the other's fresh lock, and both write the cache. The exit handler also removes whatever lock sits at the path, so a finished writer can delete a successor's lock.

**Fix: fail closed.**

- Acquire with an exclusive create (`wx`). The body is `{"pid", "nonce"}`; the creator also records the file's device and inode.
- Any existing lock (live, dead, empty or malformed) stops the run and is preserved. No automatic stale removal, reclaimer or force flag.
- If the body write fails, the original error surfaces, the descriptor is closed best-effort and any lock is left for manual recovery; nothing unlinks the pathname on that path.
- Only `EEXIST` means "locked". Any other error (`EACCES`, `ENOSPC`, …) surfaces as itself.
- Exit removes the lock only if the file still has this process's body and file identity. Cooperating writers never remove an existing lock.
- A killed writer leaves its lock. Recovery is manual: confirm the owner has stopped, then delete `.lab-inbox/.download-lock`. The header comment and error message say so.

**Controls** (`scripts/lab-inbox-lock.test.ts`, real script behind the stubbed Wrangler and temp root; no R2, cache or network). Written RED first against the current script:

1. A dead-PID lock is refused and preserved byte for byte.
2. A live and a malformed lock are refused and preserved.
3. Two contenders on one dead lock are both blocked. A hook parks the old reclaim path at its stale-removal step; both are released and must exit non-zero with the lock unchanged.
4. A lock replaced during a run survives the owner's exit, and a foreign replacement survives an injected body-write failure with the original error reported.
5. Ordinary single-writer run: the lock holds this PID while running and is gone after exit.
6. A non-`EEXIST` error is reported as itself, not as a lock.

## 2. Voice refused-restore fresh start (C0-O1)

**Bug.** `startCastFresh` (`apps/site/src/shared/cast-runtime.ts`) tests `pendingInit` before the refused-restore branch. After an ordinary (non-preview) init, then Continue whose receipts are refused, the stale init restarts the worker on the old generation and the page drops its frames. Voice freezes with no gate.

**Fix.** Put the refused-restore branch first, guarded by `localLoad` (a refused local Continue), so `requestFreshStart` gets the load generation. The `pendingInit` branch still serves the startup-queue overflow block, preview inits and new starts. No shelf write; the refused save's bytes stay.

**Control** (`cast-runtime.test.ts`): the existing C88-2 setup with an ordinary init instead of `castPreview`. It asserts `requestFreshStart` receives the load generation, the next init carries the newer page generation, the old init is not rerun, and nothing reaches the shelf. Written RED first.

## Done

Both controls green with the prior controls kept; focused lint and typecheck clean. Root runs the full lane and the reviews. Nothing is committed from this session.
