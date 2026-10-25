# First people-centered host starter

Run with Node 24 or newer:

```sh
node packages/human/examples/h3-starter/control.ts
npm test -- packages/human/test/h3-starter.test.ts
```

Copy this directory into a host that explicitly chooses this recipe, then change its source import to the published HF package. The npm package does not ship examples. Call `apply({ until, workAvailable })` with simulated minutes. Serialize `save()` as JSON. Resume with `new Starter(saved.seed, saved)`. Rebuild from seed and the saved input log with `replay(seed, inputs)`. Save format 1 is trusted local state, not an untrusted import validator. No automatic HF opt-in or existing call changes.

This small authored scene offers one repair activity to two residents. The host caps settlement at four steps. The host supplies food and water at input boundaries. It is a one-hour mechanism example, not a sustainable week, realistic motivation or an accepted game. Withholding work is an action-availability control, not a motive ablation. Changing input boundaries changes provisioning, so boundaries are replay inputs.

Every host still needs persistence/storage failure handling, save import validation and migration, input admission, UI and accessibility, clocks/pause policy, content and meaningful choices, resource access and outcomes, interruption rules, idempotent external effects, retention, release stamps, export UX and lab consent/upload. `docs/host-kit.md` explains community write-back and provisioning. Existing lab kit and playtester packages remain separate; this starter neither invokes them nor claims their wiring is complete. A renderer, physics and networking stay outside this template.

No public HF exports are proposed. Copy the host recipe explicitly; coordinator integration should retain the examples and focused test without modifying framework exports or manifests.

`workAvailable: false` withdraws future offers; an already started repair may finish. Provisioning occurs at each admitted input boundary, so changing boundary spacing changes this authored supply policy. Invalid clock inputs leave state unchanged. An unexpected exception during stepping can leave partial state: discard that host instance and restore the last successful save. This small recipe does not implement transactional recovery.
