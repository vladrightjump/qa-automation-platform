import * as bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

// Deterministic admin used by admin/* e2e and api tests.
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

export async function upsertAdmin(client: PrismaClient): Promise<void> {
  await client.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN', password: ADMIN_HASH },
    create: { email: ADMIN_EMAIL, password: ADMIN_HASH, role: 'ADMIN' },
  });
}

// Deterministic promo codes used by checkout/promo tests.
// `featured` codes surface on the storefront "available deals" panel
// (GET /promo-codes); `minSpendCents`/`maxRedemptions` drive the
// discovery-feature negative paths.
interface SeedPromoCode {
  code: string;
  description: string | null;
  percentOff: number | null;
  flatOffCents: number | null;
  minSpendCents: number;
  featured: boolean;
  maxRedemptions: number | null;
  active: boolean;
  expiresAt: Date | null;
}

export const PROMO_CODES = {
  welcome10: {
    code: 'WELCOME10',
    description: '10% off your order',
    percentOff: 10,
    flatOffCents: null,
    minSpendCents: 0,
    featured: true,
    maxRedemptions: null,
    active: true,
    expiresAt: null,
  },
  freeship: {
    code: 'FREESHIP',
    description: '$5 off shipping',
    percentOff: null,
    flatOffCents: 500,
    minSpendCents: 0,
    featured: true,
    maxRedemptions: null,
    active: true,
    expiresAt: null,
  },
  // Featured but gated behind a $50 minimum spend — drives the
  // "deal locked until you spend more" path.
  big20: {
    code: 'BIG20',
    description: '20% off orders over $50',
    percentOff: 20,
    flatOffCents: null,
    minSpendCents: 5000,
    featured: true,
    maxRedemptions: null,
    active: true,
    expiresAt: null,
  },
  // Single-use code — drives the redemption-limit exhaustion path.
  limited5: {
    code: 'LIMITED5',
    description: '$5 off — limited to the first redemption',
    percentOff: null,
    flatOffCents: 500,
    minSpendCents: 0,
    featured: true,
    maxRedemptions: 1,
    active: true,
    expiresAt: null,
  },
  // Not featured — exists but never appears in discovery.
  hidden15: {
    code: 'HIDDEN15',
    description: null,
    percentOff: 15,
    flatOffCents: null,
    minSpendCents: 0,
    featured: false,
    maxRedemptions: null,
    active: true,
    expiresAt: null,
  },
  expired: {
    code: 'OLDDEAL',
    description: '50% off (expired)',
    percentOff: 50,
    flatOffCents: null,
    minSpendCents: 0,
    featured: false,
    maxRedemptions: null,
    active: true,
    expiresAt: new Date('2024-01-01T00:00:00Z'),
  },
} as const satisfies Record<string, SeedPromoCode>;

export async function upsertPromoCodes(client: PrismaClient): Promise<void> {
  for (const promo of Object.values(PROMO_CODES)) {
    const { code, ...rest } = promo;
    // `timesRedeemed` is intentionally not reset here so re-seeding a
    // live DB preserves usage; tests reset it explicitly when needed.
    await client.promoCode.upsert({
      where: { code },
      update: rest,
      create: { code, ...rest },
    });
  }
}

// Supported regions for geolocation resolution. Deterministic IDs + canonical
// city coordinates so `GET /geo/resolve` and its tests stay stable. locale /
// currency mirror the @qa/contracts LOCALE_CURRENCY map.
interface SeedRegion {
  id: string;
  country: string;
  name: string;
  locale: string;
  currency: string;
  lat: number;
  lng: number;
}

export const REGIONS = {
  us: { id: 'region_us', country: 'US', name: 'United States', locale: 'en-US', currency: 'USD', lat: 40.7128, lng: -74.006 },
  de: { id: 'region_de', country: 'DE', name: 'Germany', locale: 'de-DE', currency: 'EUR', lat: 52.52, lng: 13.405 },
  fr: { id: 'region_fr', country: 'FR', name: 'France', locale: 'fr-FR', currency: 'EUR', lat: 48.8566, lng: 2.3522 },
} as const satisfies Record<string, SeedRegion>;

export async function upsertRegions(client: PrismaClient): Promise<void> {
  for (const region of Object.values(REGIONS)) {
    const { id, ...rest } = region;
    await client.region.upsert({
      where: { id },
      update: rest,
      create: region,
    });
  }
}

// Bulk product seed — drives the perf suite. Deterministic by seed: the same
// `(count, rngSeed)` pair produces the same IDs, names, prices, and tags so
// percentile assertions and relevance assertions stay stable across runs.
//
// IDs are prefixed `bulk_<rngSeed>_<i>` so the bulk set never collides with
// the canonical `prod_widget`/`prod_gizmo` seeded fixtures.
const ADJECTIVES = [
  'compact', 'rugged', 'sleek', 'modular', 'silent', 'bright', 'cosmic',
  'minimal', 'ergonomic', 'durable', 'portable', 'classic', 'modern', 'vibrant',
  'precision', 'urban', 'arctic', 'industrial', 'wireless', 'eco',
];
const NOUNS = [
  'lamp', 'mug', 'speaker', 'chair', 'desk', 'pen', 'notebook', 'backpack',
  'jacket', 'watch', 'kettle', 'planter', 'mat', 'cable', 'mouse', 'keyboard',
  'monitor', 'stand', 'pillow', 'rug',
];
const CATEGORIES = ['gadgets', 'apparel', 'home', 'office'] as const;

// 32-bit Mulberry RNG — tiny, deterministic, no dep. Same seed → same stream.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export interface BulkSeedResult {
  /** Number of rows inserted (excludes ones that already existed). */
  inserted: number;
  /** Total rows now in the DB. */
  total: number;
}

export async function seedBulkProducts(
  client: PrismaClient,
  count: number,
  rngSeed = 42,
): Promise<BulkSeedResult> {
  const rng = mulberry32(rngSeed);
  // createMany skips duplicate primary keys on conflict so the seed is
  // idempotent. Same (count, seed) → same set, no churn on repeated calls.
  const rows = Array.from({ length: count }, (_, i) => {
    const adj = pick(rng, ADJECTIVES);
    const noun = pick(rng, NOUNS);
    const category = pick(rng, CATEGORIES);
    const priceCents = 500 + Math.floor(rng() * 9500); // $5..$100
    const stock = 5 + Math.floor(rng() * 95); // 5..100
    return {
      id: `bulk_${rngSeed}_${i}`,
      name: `${adj[0]!.toUpperCase()}${adj.slice(1)} ${noun}`,
      description: `A ${adj} ${noun} for the discerning shopper.`,
      priceCents,
      stock,
      category,
      tags: [adj, noun, category],
    };
  });
  const result = await client.product.createMany({ data: rows, skipDuplicates: true });
  const total = await client.product.count();
  return { inserted: result.count, total };
}
