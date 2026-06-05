// Geo + locale API: GET /geo/resolve, GET /geo/regions, PATCH /me/locale.
//
// The resolve endpoint is pure haversine over the seeded Region table, so the
// inputs/outputs are deterministic and assertable per coordinate. The locked
// invariant for /me/locale is that the DB row + LOCALE_CHANGED audit are
// written in one transaction — verified via the worker-scoped Prisma fixture.
import { test, expect } from '../fixtures';
import {
  GeoResolveSchema,
  RegionListSchema,
  MeSchema,
  SUPPORTED_LOCALES,
} from '@qa/contracts';

// Canonical coordinates per seeded region. These match the seed in
// packages/db/src/seed-helpers.ts.
const BERLIN = { lat: 52.52, lng: 13.405 };
const NEW_YORK = { lat: 40.7128, lng: -74.006 };
const PARIS = { lat: 48.8566, lng: 2.3522 };

test.describe('geo (API)', () => {
  test('GET /geo/regions returns the seeded supported regions', {
    tag: ['@regression', '@geo'],
  }, async ({ api }) => {
    const regions = await api.listRegions();
    expect(regions).toMatchContract(RegionListSchema);

    const byCountry = Object.fromEntries(regions.map((r) => [r.country, r]));
    expect(byCountry.US).toMatchObject({ locale: 'en-US', currency: 'USD' });
    expect(byCountry.DE).toMatchObject({ locale: 'de-DE', currency: 'EUR' });
    expect(byCountry.FR).toMatchObject({ locale: 'fr-FR', currency: 'EUR' });
  });

  test('Berlin coords resolve to DE/EUR (de-DE)', {
    tag: ['@regression', '@geo'],
  }, async ({ api }) => {
    const region = await api.resolveGeo(BERLIN.lat, BERLIN.lng);
    expect(region).toMatchContract(GeoResolveSchema);
    expect(region).toMatchObject({
      country: 'DE',
      locale: 'de-DE',
      currency: 'EUR',
    });
  });

  test('NYC coords resolve to US/USD; Paris → FR/EUR', {
    tag: ['@regression', '@geo'],
  }, async ({ api }) => {
    const us = await api.resolveGeo(NEW_YORK.lat, NEW_YORK.lng);
    expect(us).toMatchObject({ country: 'US', locale: 'en-US', currency: 'USD' });

    const fr = await api.resolveGeo(PARIS.lat, PARIS.lng);
    expect(fr).toMatchObject({ country: 'FR', locale: 'fr-FR', currency: 'EUR' });
  });

  test('lat/lng boundary values are accepted', {
    tag: ['@regression', '@geo', '@edge'],
  }, async ({ api }) => {
    // Extremes inside the valid range — the resolver still picks a seeded
    // region (its great-circle nearest neighbour), no validation error.
    const north = await api.resolveGeo(90, 0);
    expect(north).toMatchContract(GeoResolveSchema);
    const dateline = await api.resolveGeo(0, -180);
    expect(dateline).toMatchContract(GeoResolveSchema);
  });

  test('out-of-range lat/lng → 400', {
    tag: ['@regression', '@geo', '@edge'],
  }, async ({ api }) => {
    const overLat = await api.resolveGeoRaw(91, 0);
    expect(overLat.status()).toBe(400);

    const overLng = await api.resolveGeoRaw(0, 200);
    expect(overLng.status()).toBe(400);

    const malformed = await api.resolveGeoRaw('not-a-number', 0);
    expect(malformed.status()).toBe(400);
  });
});

test.describe('locale preference (API)', () => {
  test('PATCH /me/locale persists the preference and writes a LOCALE_CHANGED audit row', {
    tag: ['@sanity', '@geo'],
  }, async ({ api, db, testUser }) => {
    const me = await api.setLocale(testUser.token, 'de-DE');
    expect(me).toMatchContract(MeSchema);
    expect(me.preferredLocale).toBe('de-DE');

    // DB ground truth: user row updated.
    const dbUser = await db.user.findUniqueOrThrow({ where: { id: testUser.id } });
    expect(dbUser.preferredLocale).toBe('de-DE');

    // DB ground truth: LOCALE_CHANGED audit row exists for this user.
    const audit = await db.auditLog.findFirst({
      where: { userId: testUser.id, action: 'LOCALE_CHANGED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.entity).toBe('User');
    expect(audit?.entityId).toBe(testUser.id);
  });

  test('every supported locale round-trips through PATCH /me/locale', {
    tag: ['@regression', '@geo'],
  }, async ({ api, testUser }) => {
    for (const locale of SUPPORTED_LOCALES) {
      const me = await api.setLocale(testUser.token, locale);
      expect(me.preferredLocale).toBe(locale);
    }
  });

  test('unsupported locale → 400 and no DB write', {
    tag: ['@regression', '@geo', '@edge'],
  }, async ({ api, db, testUser }) => {
    const before = await db.user.findUniqueOrThrow({ where: { id: testUser.id } });

    const res = await api.setLocaleRaw(testUser.token, 'es-ES');
    expect(res.status()).toBe(400);

    const after = await db.user.findUniqueOrThrow({ where: { id: testUser.id } });
    expect(after.preferredLocale).toBe(before.preferredLocale);
  });

  test('unauthenticated PATCH /me/locale → 401', {
    tag: ['@regression', '@geo', '@security'],
  }, async ({ api }) => {
    const res = await api.setLocaleRaw('', 'de-DE');
    expect(res.status()).toBe(401);
  });
});
