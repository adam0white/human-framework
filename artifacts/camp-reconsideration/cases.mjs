// Prespecified before any baseline/candidate comparison output is evaluated.
// Administrative prefix verification may run only these four timings.
export const BASE_SOURCE='905d6ce03365fc0e801993ae80cfd258bce21725';
export const BASE_ENTRY='src/games/camp-current.js';
export const BASE_FILES=['src/core/model.js','src/games/camp-current.js','src/human/v0.1.1.js','src/runtime/clock.js','src/runtime/index.js'];
export const C1_PREFIX={path:'artifacts/practice-incentive/construction/prefix-corrected.json',sha256:'031eb135d8f135fbe589decb970406a15b9ceda8e2cedc584d4ea7034713d852'};
export const CANDIDATE_ENTRY='src/experiments/camp-reconsideration/host.js';
export const CANDIDATE_VERSION='0.3.1-reconsideration.0';
export const HORIZON=240;
export const TIMINGS=[
 {id:'R0-known-zero',paidTripMinutes:0,cancelAt:85,role:'Known C1 development boundary; not independent confirmation.'},
 {id:'R1-paid-one',paidTripMinutes:1,cancelAt:86,role:'First positive sunk gathering minute.'},
 {id:'R8-paid-eight',paidTripMinutes:8,cancelAt:93,role:'Interior positive-payment timing.'},
 {id:'R15-paid-fifteen',paidTripMinutes:15,cancelAt:100,role:'Prespecified substantive negative hypothesis: finishing the six remaining trip minutes may protect useful salvage and roof timing.'}
];
export const ARMS=['finish-current','release-and-rerequest','automatic-reconsideration'];
export const PROTOCOL='docs/camp-reconsideration-protocol.md';
export const HARNESS=['artifacts/camp-reconsideration/cases.mjs','artifacts/camp-reconsideration/runner.mjs'];
