import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@qa/db';
import type { Region as RegionRow } from '@qa/db';

// Public shape of a region — never leaks the DB id or raw lat/lng.
export interface RegionResult {
  country: string;
  name: string;
  locale: string;
  currency: string;
}

// Mean Earth radius (km). Distance units cancel out for nearest-neighbour, so
// the constant only needs to be consistent, not exact.
const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle (haversine) distance in km between two lat/lng points.
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toResult(region: RegionRow): RegionResult {
  return {
    country: region.country,
    name: region.name,
    locale: region.locale,
    currency: region.currency,
  };
}

@Injectable()
export class GeoService {
  /** All supported regions (for the manual override dropdown). */
  async listRegions(): Promise<RegionResult[]> {
    const regions = await prisma.region.findMany({ orderBy: { country: 'asc' } });
    return regions.map(toResult);
  }

  /**
   * Resolve a coordinate to the nearest seeded region by great-circle
   * distance. Pure given the seeded region set, so assertions are stable.
   */
  async resolve(lat: number, lng: number): Promise<RegionResult> {
    const regions = await prisma.region.findMany();
    if (regions.length === 0) {
      throw new ServiceUnavailableException('No regions configured');
    }
    let nearest = regions[0]!;
    let best = Infinity;
    for (const region of regions) {
      const d = haversineKm(lat, lng, region.lat, region.lng);
      if (d < best) {
        best = d;
        nearest = region;
      }
    }
    return toResult(nearest);
  }
}
