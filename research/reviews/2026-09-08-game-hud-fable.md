Findings below come from reading the five supplied files only. Nothing was executed or rendered, so every claim about announcements, focus or layout is inferred from source, not observed. The Shared Promise HTML, the other adapters and the play-note module are absent, so element locations for that page follow the shell config. This is a targeted review, not an accessibility audit.

## Controls separated from outcomes

- **Dock buttons** lose their consequence text. Withdraw leaves its explanation paragraph in the Plan tab, see `web/service-plan.js:76`. A refusal from Deniz to a stop request renders only in the Deniz card, see `web/service-plan.js:100`, while the button sits in the dock. Before the Rain folds the cancel rule about paid elapsed work into a collapsed disclosure at `web/game-shell.js:104`. Smallest fix: generalise the courtyard-only feedback line at `web/game-shell.js:170` to mirror the newest response node for every game, and point each moved button at its detail with aria-describedby. Simpler alternative: leave withdraw and cancel-discussion out of the stops list so they stay beside their text.
- **Courtyard's proposal reply** is on the Meryem tab while moves are on Actions. The page states any other action lets the proposal pass, and the unread dot fires only when speech text changes, see `web/game-shell.js:185`. A player can decline without knowing. Smallest fix: add the proposal to the Actions selectors and to the watched list.
- **The shell writes** the hidden attribute on game-owned nodes at `web/game-shell.js:171`. A page that hides an enabled cancel button would see it re-shown. Not verifiable without the page scripts.

## Focus, reading and pausing

- **The ferry checkpoint** may be focused off-screen. The Caches config puts it after the destinations, reversing source order, then focuses with scrolling suppressed at `web/game-shell.js:181`. A freshly shown panel starts at the top. Smallest fix: list the checkpoint first, or scroll to nearest as the anchor handler does.
- **Reloading a finished** or checkpointed save steals focus during load. Both transition flags start false at `web/game-shell.js:147`. Seed them from the initial state and only select, never focus, on the first sync.
- **The dock feedback region** is created hidden and first shown with text already set, see `web/game-shell.js:92`. Status regions entering the tree with content are often not announced. Keep it present and empty. The checkpoint's polite region is likewise populated inside a display-none panel, so only the focus call carries it. Give it a name via its title.
- **The adapter re-parents** choice buttons during play when phase or fatigue changes, see `web/service-plan.js:109`. Moving the focused button drops focus to the body. Skip the move for the active element or restore focus by id.
- **Shell-created disclosures** never pause the day. The adapter binds toggle per element at load, see `web/service-plan.js:138`, before the shell adds "About this episode". One capturing toggle listener on main covers both.

## Save, reset and stale mirrors

- **A device-save failure** stays invisible. Its text lives in the last tab, which unread marking skips, see `web/service-plan.js:12`. Also call the notice helper there. The shell keeps that alert above the tabs.
- **Resets strand the player.** Courtyard's "Another afternoon" leaves an empty History panel. Shared Promise's restart scrolls a window that no longer scrolls, see `web/service-plan.js:137`, and "Try again" opens a disclosure that is hidden if it sits in the session tools as the config implies. Shell fix: select the first panel and clear the unread map when ended flips back to false. Page fix: make "Try again" an in-page anchor so the existing handler reveals it.
- **Idle detection** keys on job text beginning Ready, Between or Waiting, see `web/game-shell.js:162`. A job like "Waiting for the ferry" would lose its timing. Drop the regex and show timing whenever it is non-empty.
- **Courtyard's clock label** is static while the page has a live caption, see `web/game-shell.js:24`. Mirror the caption.
- **Unverified layout risks.** HUD and dock text is set at nine to eleven pixels under a pixel root size, see `web/game-shell.css:2`, overriding user font preferences for the very information the HUD surfaces. Fixed chrome plus a two-row dock may leave a small scroll area on phone heights above the fallback breakpoint. The START HERE section moves into a collapsed disclosure on the Save tab at `web/game-shell.js:106`. Only rendering can confirm these.
