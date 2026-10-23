# Baseline unit-test phase — 2026-10-09

Command: `npm test -- --runInBand --watchman=false --coverage '--collectCoverageFrom=src/**/*.js' '--collectCoverageFrom=App.js' --coverageDirectory=coverage`

Historical baseline result (before the final phase; current report is `tests/FINAL_TEST_REPORT.md`): 11 suites passed; 46 tests passed, 0 failed, 7 skipped (53 total).
Coverage of all current `src/**/*.js` plus `App.js`: statements 33.77%, branches 18.42%, functions 32.41%, lines 33.02%. These percentages include concurrently added MVP-01 code; they are a snapshot, not a frozen measurement of the pre-change repository.

Tested baseline behavior: event reducer and thunk success/empty/error/optional timestamps/malformed timestamp, user field actions and root-state isolation, PDF417 parsing with synthetic fixtures, camera permission/loading/scan/close behavior, header content, home navigation and reservation label, legacy agenda subscription and cleanup, dinner transaction creation/join/full/duplicate/invalid-user/offline behavior, event loading state, and isolated App route registration.

The App test mocks screens, native gestures, navigation and auth. It proves route registration only; it does not prove native startup, session guard behavior or end-to-end navigation. Firestore transaction tests invoke callback mocks; they do not prove real server contention or security rules. Camera tests mock native permission and scanning. No real personal identity data is used.

Auth/session production was concurrently being replaced by Dev A; its new services, screens and guard tests belong to the final phase. Profile creation/editing, event creation/join, footer behavior and updated canonical activity/agenda integration need final-phase tests after Dev A/B finish their changes. Therefore this is a partial baseline, not full project behavior coverage.

## Skips and reproducible failures

1. Parser malformed input: call `parseCedulaPDF417('')` (null also fails). Current parser dereferences `.index` on a null regex match; expected controlled validation rather than an exception. MVP-12.
2. Parser impossible birth date: parse synthetic `0000000123PEREZ0GOMEZ0JUAN0CARLOS0M19901399O+`. Current parser returns month `13`, day `99`; expected rejection. MVP-12.
3. Camera denied permission: mock permission result `denied`, render CameraScanner. No TouchableOpacity exists, so user cannot close through a screen control. Missing camera follows the same pattern. Expected exit control in every state. MVP-12.
4. Camera invalid scan: make parser throw and invoke `onCodeScanned([{value: ''}])`. Exception propagates without a user-facing error. Expected safe validation with the scanner remaining usable. MVP-12.
5. Dinner no selection: render and press `Reservar` before selecting a card. Access to `dates[''].day` throws. Expected validation. MVP-05.
6. Agenda Redux UID mismatch: provide normal state `{user: {id: 'user-1'}}`, render agenda. `onSnapshot` is never called because screen reads `user.uid`; loading persists. Expected subscription by canonical user ID. MVP-04; replace legacy tests after migration.
7. Events non-loading render: render OtrosEventosScreen with `eventos.loading=false`. ReferenceError for `Platform.OS` because Platform is not imported. Expected successful render. MVP-02; enable after repair.

No production files or global test configuration changed in this phase. All mocks are suite-local. Baseline tests for model-dependent screens must be adapted when MVP-04 replaces collections and schemas.

The baseline initially wrote its generated coverage outside the repository. That exact owned artifact was removed in the final phase, and coverage was regenerated inside `coverage/`. The command above now uses the authorized repository location; consult the final report for current metrics.
