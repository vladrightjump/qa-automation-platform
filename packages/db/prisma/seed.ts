// Idempotent seed: deterministic product IDs/stock so tests have a stable baseline.
// Re-running is safe — every row uses upsert.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  {
    id: 'prod_widget',
    name: 'Widget',
    description: 'A basic widget. The default happy-path product.',
    priceCents: 1999,
    stock: 50,
  },
  {
    id: 'prod_gizmo',
    name: 'Gizmo',
    description: 'A fancy gizmo.',
    priceCents: 2999,
    stock: 20,
  },
  {
    id: 'prod_thingamajig',
    name: 'Thingamajig',
    description: 'A low-cost bulk item.',
    priceCents: 999,
    stock: 100,
  },
  {
    id: 'prod_oos',
    name: 'Out-of-stock Sample',
    description: 'Always zero stock — drives the out-of-stock negative path.',
    priceCents: 1499,
    stock: 0,
  },
];

async function main(): Promise<void> {
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        stock: p.stock,
      },
      create: p,
    });
  }
  console.log(`[seed] upserted ${PRODUCTS.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
