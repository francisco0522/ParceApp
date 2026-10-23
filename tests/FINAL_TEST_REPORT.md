# Final unit-test report — MVP-01 through MVP-04

Date: 2026-10-09. No production code, package files, global Jest setup, native files or lint configuration were changed by Unit Tester.

## Results and reproducible commands

```sh
npm test -- --runInBand --watchman=false --coverage '--collectCoverageFrom=src/**/*.js' '--collectCoverageFrom=App.js' --coverageDirectory=coverage --json --outputFile=tests/final-results.json
./node_modules/.bin/eslint __tests__ --format stylish
```

Final run: **21 suites passed; 210 tests passed, 0 failed, 4 skipped; 214 total.** No snapshots. Focused lint of all test code: **0 errors, 0 warnings**. Prettier was applied to test files. This does not represent a full-project lint or native build run; the orchestrator owns those checks.

Coverage explicitly includes every current `src/**/*.js` file and `App.js`, rather than only loaded files:

| Metric     | Covered / total | Percentage |
| ---------- | --------------- | ---------- |
| Statements | 751 / 831       | 90.37%     |
| Branches   | 467 / 543       | 86.00%     |
| Functions  | 189 / 221       | 85.52%     |
| Lines      | 726 / 805       | 90.18%     |

Generated artifacts are inside the repository: `coverage/coverage-final.json`, `coverage/lcov-report/index.html` and `tests/final-results.json`. The exact earlier owned `/private/tmp/parceapp-existing-coverage` directory was removed; the baseline report now references the repository location and distinguishes its historical metrics.

## What was exercised

- Session services: authenticated UID document lookup, missing/stale profile, serializable dates, completed/incomplete routing, login errors, both legacy storage cleanup paths, signout, retry of registration after a profile-write failure without recreating the auth account, and useful error mapping.
- Encrypted persistence adapter: get/set/remove delegation, absent keys, iOS `-25300` missing-key errors and genuine failures. Firebase configuration: encrypted persistence initialization, app/auth hot reload reuse, and propagation of unexpected initialization errors.
- Login, registration and splash screens: required inputs, password rules, invalid email and underage/invalid dates, manual registration, duplicate login suppression, service failures and retries, restored completed/incomplete profiles, no-session state clearing, and ignoring restore completion after unmount.
- App guard with actual Redux store: UID mismatch denies protected screens, matching UID renders home, the auth signout listener clears both user and events state and prevents protected rendering, public login remains available, and the listener unsubscribes. The navigator and screen bodies are mocks; this does not claim native navigation coverage.
- Footer: actual destinations, signout resets both slices and navigation, post-signout storage failure still resets UI, failed signout retains the session, and repeated presses submit only once.
- Profile services: valid/invalid form structure, duplicate/protected question keys, options and multi limits, required/optional answers, explicit boolean `false`, stale options, unknown-key preservation, missing documents, session changes during reads/writes, save timeout and date formats.
- Questionnaire UI: prefill, last single answer and last boolean `false`, optional omission affecting only its own key, required validation, multi-choice limits, save/load failures and retry, duplicate submission suppression, ignoring completion after unmount, and reopen/edit preservation.
- Profile screen: real values, false/list formatting, neutral avatar, edit destination, missing/denied profile, loading timeout/retry, UID mismatch, listener cleanup and ignored snapshots after unmount.
- Activity model/services: schema/version/time-zone validation, complete date serialization, deterministic normalized event identity, capacity and duplicate rules, creator membership, future-date restrictions, missing/closed/full activities, unlimited capacity, transaction-time auth checks, deterministic dinner creation and canonical watcher error handling.
- Integrated workflows using actual services and an in-memory Firestore mock: completing the questionnaire, reopening through splash, displaying and editing persisted answers without losing unknown keys; save timeout cannot trigger late-success navigation; reservation membership appears in agenda under the same activity ID. The source of truth is `activities.participantIds`, with no divergent user-reservation copy.
- Dinner UI: deterministic full-date candidates, disabled reserve button before selection, service delegation and full/duplicate/error messages. Events UI: loading, canonical listing, create validation, selected Colombia datetime/capacity, duplicate creation, canonical reservation IDs and service errors. Home and agenda use canonical activity subscriptions and real Redux ID.
- Existing reducers, root-state isolation, event thunk success/error and empty data, header, synthetic PDF417 parsing, and camera permission/scan/close branches remain covered.

The old skips for agenda `uid`, unimported `Platform`, and booking without a selected date were removed and replaced with passing regression tests.

## Known defects still skipped

All four remaining skips are explicitly assigned to MVP-12. They expose existing defects, rather than claiming those cases work:

1. `parseCedulaPDF417('')` and `parseCedulaPDF417(null)` throw. Expected: controlled validation. Empty input currently dereferences `.index` on a null regex match.
2. Synthetic `0000000123PEREZ0GOMEZ0JUAN0CARLOS0M19901399O+` returns month `13`, day `99`. Expected: rejection of impossible dates.
3. Rendering CameraScanner with native permission result `denied` produces no close control. Missing camera has the same behavior. Expected: an exit control in every state.
4. Making the parser throw and invoking `onCodeScanned([{value: ''}])` propagates the exception. Expected: a handled validation error that leaves scanning usable.

No new reproducible production defect was identified by these added tests. No recommendations from the security review were applied.

## Coverage gaps and practical limitations

The lowest line coverage is SplashScreen 70%, OtrosEventosScreen 72.72%, RegistrationScreen 74.62%, and HomeScreen 78.94%. Remaining gaps include scanner-to-registration callbacks and dropdown/date-modal transitions, some splash logout failure paths, event calendar/detail modal interactions and some load/error paths. Other modules also retain uncovered branches; consult the HTML report. Coverage is not completeness.

Firestore, network, camera, storage and native navigation are mocked. One transaction test explicitly reruns the callback against changed capacity; it proves the callback rechecks state but does not simulate real Firebase contention, retries or server rules. The integrated workflows use actual app services over an in-memory fake database; they do not prove real persistence across process death. Keychain/Keystore behavior, permissions on devices, native startup, real Firebase security rules, production migrations and physical Android/iOS user journeys remain outside this unit-test validation.
