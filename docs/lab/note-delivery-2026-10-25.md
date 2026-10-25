# Missing Pass feedback, 2026-10-25

Owner, verbatim: "Sent feedback from within the pass."

At 12:55 UTC on 2026-10-25, the coordinator found no note from anyone in the private bucket despite 272 linked owner records. This establishes absence at the check, not which client failure happened.

Local Chromium Pass reproduction found that a GPC request header without a matching JavaScript signal produces HTTP 204 and the old transport deletes the note as if stored. A large snapshot can also put a note behind rate-limited chunks. Offline notes are acknowledged as queued before any request succeeds. The owner browser has not been inspected, so its exact failure remains unknown.

The transport now confirms explicit notes only on stored HTTP 200, sends them independently of a busy background snapshot, and preserves refused notes for retry. Explicit notes carry privacy override. The Worker treats an explicit note as consent even for older queued envelopes; all automatic kinds retain their privacy gates. The shared SDK dialog retains a local text draft until the receipt and explains failure. Custom game forms retain editable text after a refusal, and linked notes also remain in IndexedDB. A failed unlinked custom-form submission has no background outbox after the page closes.

An old note still in IndexedDB can retry after the fixed client loads with the same player identity, recording enabled, before the old client expires it. The fixed client no longer expires pending notes. It gets priority over snapshots. Notes already deleted after 204, another terminal response, opt-out, expiry or five previous failures cannot be recovered from this fix. A saved shared-dialog draft can be reopened in Feedback and retried. Keep a failed unlinked custom form open to retry or copy its text.

Pass, Murmur, Stairwell and Glance cached /release.json in service workers. Their live HTTP manifests were current while an installed worker could return the old cached manifest. These workers now bypass that path. The remaining games were audited; Small Works and Neighbours also needed canonical app/framework manifest fields.

Client 0.4.7 and kit 0.5.8 are signed, versioned GitHub tarball releases from `4c444da`, with exact green CI40197533896 and downloaded artifact bytes verified. GitHub reports `immutable:false` for both releases. Platform-enforced release immutability is off; game integrity pins identify the verified bytes. Firefox could not start on this host using two supported builds; retry target 2026-10-26. The historical owner-note failure remains unknown. New records use a fresh stamp; historical records retain the captured stamp.

Delivery and cleanup receipts: ~/code/.lab-scratch/notelost/report.md. Owner acceptance remains a subsequent real feedback attempt, target 2026-11-03; no synthetic production notes are authorized.
