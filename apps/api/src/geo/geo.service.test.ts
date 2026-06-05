// Unit tests for GeoService.resolve — nearest-region by great-circle
// distance. The haversine constant is internal so we don't assert exact
// distances; we assert which region is picked for hand-picked
// coordinates whose nearest neighbour is unambiguous.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@qa/db';

const prismaMock = mockDeep<PrismaClient>();
vi.mock('@qa/db', () => ({ prisma: prismaMock }));

const { GeoService } = await import('./geo.service');
const { ServiceUnavailableException } = await import('@nestjs/common');

type Region = {
  id: string;
  country: string;
  name: string;
  locale: string;
  currency: string;
  lat: number;
  lng: number;
};

const REGIONS: Region[] = [
  { id: 'r_us', country: 'US', name: 'United States', locale: 'en-US', currency: 'USD', lat: 38.0, lng: -97.0 },
  { id: 'r_de', country: 'DE', name: 'Germany', locale: 'de-DE', currency: 'EUR', lat: 51.0, lng: 10.5 },
  { id: 'r_fr', country: 'FR', name: 'France', locale: 'fr-FR', currency: 'EUR', lat: 46.0, lng: 2.0 },
  { id: 'r_jp', country: 'JP', name: 'Japan', locale: 'ja-JP', currency: 'JPY', lat: 36.0, lng: 138.0 },
];

describe('GeoService.resolve', () => {
  let service: InstanceType<typeof GeoService>;

  beforeEach(() => {
    mockReset(prismaMock);
    service = new GeoService();
  });

  it('returns the public RegionResult shape only — never id or lat/lng', async () => {
    (prismaMock.region.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([REGIONS[0]] as never);
    const result = await service.resolve(38, -97);
    expect(result).toEqual({ country: 'US', name: 'United States', locale: 'en-US', currency: 'USD' });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('lat');
  });

  it.each([
    { name: 'NYC coords → US', lat: 40.7, lng: -74.0, expected: 'US' },
    { name: 'Berlin coords → DE', lat: 52.5, lng: 13.4, expected: 'DE' },
    { name: 'Paris coords → FR', lat: 48.85, lng: 2.35, expected: 'FR' },
    { name: 'Tokyo coords → JP', lat: 35.7, lng: 139.7, expected: 'JP' },
  ])('$name picks the geographically nearest seeded region', async ({ lat, lng, expected }) => {
    (prismaMock.region.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(REGIONS as never);
    const result = await service.resolve(lat, lng);
    expect(result.country).toBe(expected);
  });

  it('throws ServiceUnavailable when no regions are configured', async () => {
    (prismaMock.region.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([] as never);
    await expect(service.resolve(0, 0)).rejects.toThrow(ServiceUnavailableException);
  });

  it('listRegions returns all rows sorted by country (the order Prisma is asked for)', async () => {
    (prismaMock.region.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(REGIONS as never);
    const regions = await service.listRegions();
    expect(regions.map((r) => r.country)).toEqual(['US', 'DE', 'FR', 'JP']);
    expect(prismaMock.region.findMany).toHaveBeenCalledWith({ orderBy: { country: 'asc' } });
  });
});
