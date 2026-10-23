# Phase 2 test report — security, reservations and partner plans

Date: 2026-10-09. Scope: MVP-05/06/07, MVP-08/09, MVP-10, Firebase environment guards and regression suite. Native device acceptance is postponed by the user; no real Firebase project, account, data migration or deployment was used.

## Results

| Validation                                              | Result                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| Jest                                                    | 25 suites passed; 325 tests passed, 0 failed, 4 skipped; 329 total |
| Actual Firestore emulator rules                         | 61 tests passed, 0 failed, 0 skipped                               |
| Focused JS/TS test lint                                 | 0 errors, 0 warnings                                               |
| CJS emulator test lint with ecmaVersion 2022 CLI option | 0 errors, 0 warnings                                               |

The four Jest skips remain the documented MVP-12 parser/camera defects. No new production defect was identified by this phase's added tests. Initial test-helper and fake-clock fixture mistakes were corrected in test files only.

All-file coverage includes `src/**/*.js` and `App.js`:

| Metric     | Covered / total | Percentage |
| ---------- | --------------- | ---------- |
| Statements | 1321 / 1468     | 89.98%     |
| Branches   | 825 / 969       | 85.13%     |
| Functions  | 329 / 399       | 82.45%     |
| Lines      | 1279 / 1411     | 90.64%     |

Evidence: `tests/phase2-results.json`, `tests/phase2-jest-final.log`, `tests/emulator-run.log`, and generated `coverage/coverage-final.json` / `coverage/lcov-report/index.html`. Historical first-delivery reports remain unchanged except the previously corrected baseline artifact location.

## Commands and emulator isolation

```sh
npm test -- --runInBand --watchman=false --coverage '--collectCoverageFrom=src/**/*.js' '--collectCoverageFrom=App.js' --coverageDirectory=coverage --json --outputFile=tests/phase2-results.json
./node_modules/.bin/eslint __tests__ tests/partnerFixtures.js --format stylish
./node_modules/.bin/eslint tests/emulator/firestore.test.cjs --parser-options '{"ecmaVersion":2022}' --format stylish
env XDG_CONFIG_HOME="$PWD/.cache/firebase-config" FIREBASE_EMULATORS_PATH="$PWD/.cache/firebase-emulators" CI=1 npm run test:rules
```

Runtime actually used: Node 20.20.1, Java 17.0.10, firebase-tools 14.27.0, Firestore emulator JAR 1.19.8, Firebase SDK 11.10.0 and rules-unit-testing 4.0.1. The CLI warns tools 15 will require Java 21; this run used compatible tools 14/JDK17.

The test suite requires `FIRESTORE_EMULATOR_HOST` to be loopback, refuses non-demo project environment variables, hardcodes `demo-parceapp`, and asserts the finalized `activityCatalog` rules contract before initializing. Synthetic fixtures are seeded only in that demo emulator. It clears Firestore between tests, cleans SDK clients at completion and the CLI stopped its emulator cleanly. Port 8080 is released.

Sandbox startup initially rejected local ports/config-store access. The actual successful run used authorized escalation for local emulator sockets and repository-local caches. The temporary own caches under tests were moved to `.cache/firebase-*`; no cache under tests remains. No unrelated processes or directories were stopped or removed.

Rules/config SHA-256 recorded after development stabilized:

- `firestore.rules`: `425a7708d12bb248295c55b02acd1738672c21b3404d95023d148048920b38d9`
- `firebase.json`: `1395ebc8a321232cb1402692f69e2e7684af13911bf63f989bcf0883e564d73f`

The orchestrator should repeat emulator validation if these files change after this checkpoint. The CLI's default logging also writes its own `firestore-debug.log`/`firebase-debug.log` inside the repository.

## Actual rules and concurrency evidence

61 emulator tests exercise real Firestore authorization without Jest mocks:

- Profiles: owner create/read and mutable display name/preferences; denied anonymous, another user and administrator reads; denied broad profile listing, identity changes, spoofed authenticated email, initial completion, unknown admin/role fields and invalid types.
- Public `activityCatalog` v2: no participant UID list/creator field, authenticated-only reads, administrator custom-claim creation of events/dinners, pilot city/time-zone matching, valid capacity/state/date/schema, and rejected extra identity fields. Ordinary callers cannot synthesize activities, alter metadata/count alone or delete documents. Booked dates/cities/groups remain protected against admin reassignment.
- Private own reservations: valid server timestamp and exact activity identity; counter and membership create/delete must be one atomic operation. Wrong UID, missing/past/closed/full activity, duplicate membership, forged timestamp, count changes of two, membership-only writes, cancellation of another user's reservation and negative-counter replay fail. Published catalogue writes and private memberships are checked after operations to verify rejected writes leave counters intact.
- Creator's first membership requires atomic count one plus private record. Future cancelled activities permit cancelling an existing own reservation; past cancellation is denied.
- Real concurrent client transactions: Alice and Bob competing for the final seat yield exactly one success and one private membership, count equals capacity; two same-UID attempts yield one success and count one; unlimited-capacity sequential joins both succeed.
- Legacy activities/reservas/eventos, private ownership metadata and unknown paths are denied. Questionnaire writes require administrator custom claim.
- Partner plans: administrator-only validated create/update/withdraw/delete; ordinary users and fake role claims cannot write; only published documents and correctly filtered published queries can be read by authenticated users. Draft/withdrawn and broad user queries fail. Published historical plans remain readable by contract; product expiry belongs to the feed filter. Invalid categories/cities/URLs/date ordering/types/unknown fields are rejected.

## Jest behavior and integration evidence

- Migrated v1 membership tests to public v2 catalogue plus private reservation records. Services verify administrator claims, public projection, deterministic dinner city/date/group identity, own membership duplicate detection, count/member atomic writes, cancellation, closed/full/missing errors and auth changes before mutations.
- Live reservation/catalogue joining, count refreshes, watcher cleanup and missing activity errors; agenda city-local dates, next/past grouping, retry and own Redux ID. Actual services over in-memory Firestore validate reserve → agenda same ID → cancel → released count → absent after remount.
- Dinners use scheduled approved entries only, city selection, no-selection disabling, future/open filtering, full-card disabling and retryable service errors. Events expose creation only to administrators; city/date/capacity validation, individual reservation outcomes and retry only failed targets. Existing membership is treated as achieved.
- Activity detail loads own reservation and public live activity independently; reserve/cancel confirmation, closed/past/full disabling, count updates, retryable failures and both listener cleanups.
- Partner model: strict HTTPS host/credential/port/whitespace validation, inherited-key rejection, validated projection, complete timestamps, publication start inclusive / publication end and activity end exclusive, ongoing activities, withdrawal, chronological sorting, city-only filters and pilot offsets.
- Partner services: authenticated UID checks after claims/reads, published query bounds, listener parsing/errors/cleanup, private admin operations and server timestamps, preserve createdAt on update, deny nonadmin saves and missing update targets.
- Explore feed and clock: all/Cali/Formosa filtering, no preference matching, chronological entries, details navigation, loading/empty/retry, 20-second timeout, exact expiry removal, 30-second scheduled-query refresh and foreground refresh.
- Cards/details/editor: explicit sponsorship label, failed-image fallback and new-image retry, HTTPS external action, no opening after expiry between render/press, link failures, unavailable withdrawn plan, admin-only editor, draft/publish/withdraw actions, round-trip city-local dates, impossible-date rejection and repeated-save suppression.
- Home shows at most two preview cards, detail/full-feed destinations, claim-gated admin action and feed retry. All four new routes are protected by exact authenticated UID using the actual Redux store with a mocked navigator.
- Firebase runtime config refuses ambiguous emulator flags, real-project/release emulator use, demo without emulator flag and environment switching without restart. Local demo SDK instances attach once; encrypted native persistence and hot reload regressions remain covered.
- Prior account/profile/Redux/parser/camera regression suites remain included. The complete-profile → reopen splash → display/edit workflow continues using actual services and an in-memory DB; timeout prevents late-success navigation.

## Known skips, gaps and limits

Four existing MVP-12 skips: parser empty/null scan throws; impossible month/day is accepted; camera denied/missing state has no exit control; parser errors propagate from scan callbacks. Detailed reproduction remains in `tests/FINAL_TEST_REPORT.md`. No production fixes were made by Unit Tester.

Lowest line coverage: SplashScreen 70%, RegistrationScreen 74.62%, PlanDetailScreen 82.5%, partnerPlans service 84%. Remaining branches include some native date/scanner/dropdown and back-button interactions, secondary listener errors/unmount transitions, splash logout failures, partner detail load-timeout/retry and some role/error paths. Coverage is not a claim that all product behavior is complete.

Jest mocks native modules, network and Firestore except the separate emulator suite. Emulator transactions validate real rule enforcement and contention locally, not production server timing, deployed rules, index performance, multi-device sessions or real Keychain/Keystore durability. Profile birth/creation dates are validated as bounded strings in the rules contract; these tests do not claim server-authoritative age or identity verification. Published ad history is deliberately nonconfidential. Native device acceptance is explicitly postponed, and no claims of real-device validation are made.

Unit Tester changed only tests/report files and generated local coverage/cache artifacts. Production, tool configuration, package files and native files were not edited; security-review recommendations were not silently implemented by the test agent.
