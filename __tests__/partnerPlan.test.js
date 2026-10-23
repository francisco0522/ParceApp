/* eslint-disable no-script-url -- Adversarial URL fixtures must be rejected and never executed. */
import {partnerPlan} from '../tests/partnerFixtures';
import {
  safeHttpsUrl,
  validatePlanInput,
  planFromSnapshot,
  isPlanVisible,
  visiblePlans,
  planDate,
  planError,
} from '../src/models/partnerPlan';
describe('partner plan validation and temporal feed', () => {
  test.each([
    'https://example.test/plan',
    'https://example.test:8443/a?q=1#anchor',
    'https://EXAMPLE.test',
  ])('allows valid HTTPS URL %s', url => expect(safeHttpsUrl(url)).toBe(true));
  test.each([
    'http://example.test',
    'javascript:alert(1)',
    'https://user:password@example.test',
    'https://example.test:0',
    'https://example.test:65536',
    'https://example.test:abc',
    'https://exa mple.test',
    'https://example.test\\evil',
    'https://-bad.test',
    'https://example..test',
    null,
    '',
  ])('rejects unsafe/malformed URL', url =>
    expect(safeHttpsUrl(url)).toBe(false),
  );
  test('normalizes projection without leaking extra fields', () => {
    const result = validatePlanInput(
      partnerPlan({title: ' Arte ', role: 'admin'}),
    );
    expect(result.title).toBe('Arte');
    expect(result.role).toBeUndefined();
    expect(result.schemaVersion).toBe(1);
  });
  test.each([
    {city: 'constructor'},
    {city: '__proto__'},
    {category: 'constructor'},
    {status: 'unknown'},
    {sponsored: 'yes'},
    {title: ''},
    {address: ''},
    {ally: 'x'.repeat(161)},
    {imageUrl: 'http://example.test'},
    {externalUrl: 'javascript:alert(1)'},
    {endsAt: '2000-01-01'},
    {publishUntil: '2000-01-01'},
  ])('rejects malformed plan', override =>
    expect(() => validatePlanInput(partnerPlan(override))).toThrow(),
  );
  test('snapshot serializes dates and rejects wrong version', () => {
    expect(
      planFromSnapshot({id: 'plan-1', data: () => partnerPlan()}),
    ).toMatchObject({id: 'plan-1', createdAt: '2026-01-01T00:00:00.000Z'});
    expect(() =>
      planFromSnapshot({
        id: 'plan-1',
        data: () => partnerPlan({schemaVersion: 0}),
      }),
    ).toThrow('INVALID_PLAN');
  });
  test('publication start inclusive, end exclusive and activity end exclusive', () => {
    const now = Date.parse('2099-01-01');
    expect(isPlanVisible(partnerPlan({publishFrom: '2099-01-01'}), now)).toBe(
      true,
    );
    expect(isPlanVisible(partnerPlan({publishUntil: '2099-01-01'}), now)).toBe(
      false,
    );
    expect(isPlanVisible(partnerPlan({endsAt: '2099-01-01'}), now)).toBe(false);
    expect(isPlanVisible(partnerPlan({publishFrom: '2099-01-02'}), now)).toBe(
      false,
    );
  });
  test('published future and ongoing activities visible; draft/withdrawn excluded', () => {
    const now = Date.parse('2099-01-01');
    expect(isPlanVisible(partnerPlan({startsAt: '2098-12-31'}), now)).toBe(
      true,
    );
    expect(isPlanVisible(partnerPlan({status: 'draft'}), now)).toBe(false);
    expect(isPlanVisible(partnerPlan({status: 'withdrawn'}), now)).toBe(false);
  });
  test('city only filter and chronological order do not use preferences', () => {
    const all = [
      partnerPlan({id: 'later', startsAt: '2099-01-01T04:00:00Z'}),
      partnerPlan({id: 'formosa', city: 'formosa'}),
      partnerPlan({id: 'draft', status: 'draft'}),
    ];
    expect(
      visiblePlans(all, null, Date.parse('2026-01-01')).map(plan => plan.id),
    ).toEqual(['formosa', 'later']);
    expect(
      visiblePlans(all, 'cali', Date.parse('2026-01-01')).map(plan => plan.id),
    ).toEqual(['later']);
  });
  test('Cali and Formosa display local date/hour offsets', () => {
    expect(planDate(partnerPlan())).toBe('31/12/2098 19:00 (UTC-05:00)');
    expect(planDate(partnerPlan({city: 'formosa'}))).toBe(
      '31/12/2098 21:00 (UTC-03:00)',
    );
  });
  test.each([
    'UNAUTHENTICATED',
    'ADMIN_REQUIRED',
    'INVALID_PLAN',
    'INVALID_PLAN_URL',
    'INVALID_DATE',
    'INVALID_PLAN_DATES',
    'PLAN_NOT_FOUND',
    'offline',
  ])('describes errors %s', message =>
    expect(planError({message})).toEqual(expect.any(String)),
  );
});
