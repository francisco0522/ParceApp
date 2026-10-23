# Phase 2 test plan — security, reservations and partner plans

Scope approved in `docs/NEXT_DELIVERY_PLAN.md`. Tests remain in `__tests__/`, `tests/` and generated `coverage/`; Unit Tester does not modify production, dependencies or global configuration. Native device acceptance is postponed by the user. No real Firebase test environment or real data will be used.

## Contract checkpoint

The orchestrator approved this direction; assertions will follow the final documented schema and rules:

- Activity v2 is a public catalogue with `participantCount`; it must not reveal `participantIds` or `createdBy`. Creation of dinners/events requires administrator custom claims. Clients do not synthesize dinner activities.
- `users/{uid}/reservations/{activityId}` is private to its owner. Reservation creation/deletion and corresponding activity count changes are atomic, verified by `getAfter` in rules.
- Profile identity fields `emailText`, `birthDate`, `createdAt` become immutable after create. Owner updates can change fullName, phone, answers, completion and update time. The public collection is `activityCatalog`; legacy `activities` is denied.
- Pilot cities are Cali and Formosa. Assertions verify the city's actual IANA timezone and local calendar/wall-clock conversion.
- Partner plans use schema v1 with ally/address/title/description/image/category/city, activity start/end, publication start/end, external URL, sponsored flag, draft/published/withdrawn status and created/updated times. Admin writes only. Authenticated users can read published documents; expiry is enforced by feed filtering. Published historical plans are not confidential, so rules tests will not incorrectly expect expired published reads to fail.

Dependencies installed by Dev B: rules-unit-testing 4.0.1 and firebase-tools 14.27.0, with JDK17 and Node20. Confirm exact runtime and emulator startup before recording validation.

## Emulator suite — actual Firestore rules, no Jest mocks

Use `tests/emulator/*.test.cjs` with Node's test runner and `@firebase/rules-unit-testing`. Run through the repository's `test:rules` script after production rules/config are ready. The test process must fail closed if the Firestore emulator environment is missing, the host is not loopback, or the project ID is not the hardcoded `demo-parceapp` identifier. Seed only synthetic fixtures with rules disabled in that same demo emulator. Clean the demo database between tests and dispose clients/listeners at the end.

Contexts: unauthenticated; Alice; Bob; administrator custom claim; ordinary user with forged admin/profile fields. Test both document gets and collection queries. Verify denied writes leave the database unchanged via privileged reads limited to the demo emulator.

| Area                     | Allowed evidence                                                                                             | Adversarial evidence                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profiles                 | Own validated create/read and mutable-field updates                                                          | Anonymous access, reading/listing others, modifying identity, self-granted admin role, unknown fields/type attacks                                                           |
| Activity catalogue       | Authenticated safe catalogue read/query; admin validated create/update                                       | UID list/owner exposure, anonymous access per final rules, user creation or forged count/status/capacity/date updates                                                        |
| Reservations             | Own future/open activity reservation plus count increment in one atomic transaction                          | Wrong path UID, nonexistent/past/closed activity, duplicate ID, non-atomic reservation or count writes, invalid count increments, over-capacity                              |
| Cancellation             | Own cancellation plus decrement in one transaction                                                           | Other-user cancellation, count-only decrement, mismatched activity, repeated cancellation/count drift, negative count                                                        |
| Concurrent reservations  | Two clients compete for last place; exactly one successful membership and count stays at capacity            | Duplicate same-UID attempts, capacity races, retry followed by closed/full state, cancellation/rebooking races                                                               |
| Partner plans            | Admin writes valid draft/published/withdrawn data; user published-document and properly filtered query reads | User write/delete, spoofed admin, draft/withdrawn reads, collection query without required status constraint, invalid schema/date/URL/location fields as final rules require |
| Legacy and unknown paths | Explicitly supported access only                                                                             | Old reservation/member collections, private ownership metadata, unexpected collections and wildcard escalation                                                               |

Concurrency tests use real client transactions against the emulator and check final documents/counts. They do not claim production-server timing or deployment validation.

## Jest behavior suite

Update prior activity v1 fixtures to v2 once stable. Keep session, encrypted adapter, profile and parser/camera regressions. Add event/admin access behavior, reservation/cancellation/retry/partial multi-reservation results, next/past agenda grouping and details; the same reservation ID must remain visible after remount.

Partner-plan services/models and UI: chronological next-date order, published and publication/activity date boundaries, Cali/Formosa timezone behavior, no taste filtering, sponsored label, details, valid external URL opening and invalid URL rejection, loading/empty/error/retry, bad image fallback, withdrawing/expiry exclusion and listener cleanup. Use actual services over an in-memory fake DB for cross-screen workflows where practical.

Use meaningful validation/error assertions. Native modules and network can be mocked in Jest; emulator rules must never be replaced by mocked permission responses. Leave existing MVP-12 defects explicitly skipped with reproduction instructions; report any newly discovered production defects without fixing production.

## Closing evidence

Run the complete Jest suite, all-file source coverage, emulator suite and focused test lint after integration. Record exact pass/fail/skip counts, coverage metrics and gaps, emulator project/runtime versions, command/log locations, known defects and limits in a new phase report. Preserve the earlier security/unit-test reports as historical evidence. Native device flows remain explicitly unvalidated.
