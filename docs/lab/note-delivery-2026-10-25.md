# Missing Pass feedback, 2026-10-25

Owner, verbatim: "Sent feedback from within the pass."

The coordinator found no note from anyone in the private bucket today despite 272 linked owner records. This establishes absence at the check, not which client failure happened.

Local Pass reproduction found that a GPC request header without a matching JavaScript signal produces HTTP 204 and the old transport deletes the note as if stored. A large snapshot can also put a note behind rate-limited chunks. Offline notes are acknowledged as queued before any request succeeds. The owner browser has not been inspected, so its exact failure remains unknown.

The transport now confirms explicit notes only on stored HTTP 200, sends them independently of a busy background snapshot, and preserves refused notes for retry. Explicit notes carry privacy override. The Worker treats an explicit note as consent even for older queued envelopes; all automatic kinds retain their privacy gates. The dialog retains a local text draft until the receipt and explains failure.

An old note still in IndexedDB can retry after the fixed client loads with the same player identity, recording enabled, before the old client expires it. The fixed client no longer expires pending notes. It gets priority over snapshots. Notes already deleted after 204, another terminal response, opt-out, expiry or five previous failures cannot be recovered from this fix. A saved draft can be reopened in Feedback and retried.

Pass, Murmur, Stairwell and Glance cached /release.json in service workers. Their live HTTP manifests were current while an installed worker could return the old cached manifest. These workers now bypass that path. The remaining games were audited; Small Works and Neighbours also needed canonical app/framework manifest fields.

Delivery and cleanup receipts: ~/code/.lab-scratch/notelost/report.md. Owner acceptance remains a subsequent real feedback attempt; no synthetic production notes are authorized.
