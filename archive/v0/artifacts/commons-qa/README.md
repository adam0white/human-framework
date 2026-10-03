# Common Ground browser evidence

Captured 2026-09-08 03:24–03:31 UTC (2026-09-07 local America/Chicago) against the isolated implementation worktree through `http://127.0.0.1:4187/web/commons.html`, using Playwright Chromium. These are local browser checks, not live deployment or physical-device evidence.

Final screenshots: `mobile-initial.png` at 390×844 and `desktop-initial.png` at 1440×1000. Chromium reserves scrollbar width, so CSS screenshots are 375 and 1425 pixels wide. Neither layout showed horizontal overflow. Both screenshots were visually inspected. `mobile-before-opening-shortcuts.png` preserves the earlier layout that motivated compact opening choices and a jump-to-jobs link. `desktop-active-job.png` shows a paused job at minute21. The earlier screenshots precede the final opening-row/favicon/button-cache changes and must not be treated as pixel-identical captures of the final source.

Interaction checks:

- Click Gather timber and request woodshed help. Advance once: minute16, player job completed, Meryem still building with8minutes remaining and reserved4timber+1salvage. Available timber3.
- Reload: same minute16 and pending neighbor job; Play remains unpressed/paused.
- One running1× tick: clock minute1, unchanged food-job button retains the identical DOM node.
- Load a legal pending timber job with1minute remaining, choose4×, deliberately occupy the browser callback for900ms: exact finish minute16, jobidle, Playpaused. No1–3minute overshoot.
- Visibility handler: a synthetic hidden-state event atminute21 paused playback and minute21 remained after1.3seconds. The headless browser continues to report background pages as visible, so native backgrounding was not verified by this check.
- Application console: zero errors/warnings after adding a data favicon. The initial temporary Python server had only a missing `/favicon.ico` request.

SHA256 of final browser/headless source at capture:

```
b2c6f5e8bd38e84b729d73182170c88034edc3767e00c71cd65784233283aedb  src/games/commons.js
d5700cbe386b91424f1aa4a6059a7cc0868ee920da264a1d12a66bee8979195f  src/games/commons-policy.js
9572de481bd6efb5c73d660220df2c5e393d476f44790abbbf3b38c175faacc1  web/commons.html
75fa4084b90b88838b186b4efb44d5455b877ea68b8178cc9e38568da2767487  web/commons.css
36642aeae757b3e266d49f95241c5447f064e23f0e88200795e3fea019c6bd9d  web/commons.js
```

The private build asset allowlist excludes this artifact directory.
