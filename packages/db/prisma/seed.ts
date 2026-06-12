// Idempotent seed: deterministic product IDs/stock so tests have a stable
// baseline. Re-running is safe — every row uses upsert.
import { PrismaClient } from '@prisma/client';
import { upsertAdmin } from '../src/seed-helpers';

const prisma = new PrismaClient();

interface SeedProduct {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  category: 'gadgets' | 'apparel' | 'home' | 'office';
  tags: string[];
}

const PRODUCTS: SeedProduct[] = [
  { id: 'prod_widget', name: 'Widget', description: 'A basic widget. The default happy-path product.', priceCents: 1999, stock: 50, category: 'gadgets', tags: ['featured'] },
  { id: 'prod_gizmo', name: 'Gizmo', description: 'A fancy gizmo.', priceCents: 2999, stock: 20, category: 'gadgets', tags: ['new'] },
  { id: 'prod_thingamajig', name: 'Thingamajig', description: 'A low-cost bulk item.', priceCents: 999, stock: 100, category: 'gadgets', tags: ['bulk'] },
  { id: 'prod_oos', name: 'Out-of-stock Sample', description: 'Always zero stock — drives the out-of-stock negative path.', priceCents: 1499, stock: 0, category: 'gadgets', tags: [] },
  { id: 'prod_tee_basic', name: 'Basic Tee', description: 'Soft cotton, unisex sizing.', priceCents: 1999, stock: 80, category: 'apparel', tags: ['cotton'] },
  { id: 'prod_hoodie_classic', name: 'Classic Hoodie', description: 'Heavyweight fleece with kangaroo pocket.', priceCents: 4999, stock: 40, category: 'apparel', tags: ['fleece'] },
  { id: 'prod_mug_ceramic', name: 'Ceramic Mug', description: '12oz, dishwasher-safe.', priceCents: 1199, stock: 120, category: 'home', tags: ['dishwasher-safe'] },
  { id: 'prod_lamp_desk', name: 'Desk Lamp', description: 'LED, adjustable arm, USB charging port.', priceCents: 3999, stock: 30, category: 'home', tags: ['led'] },
  { id: 'prod_notebook_a5', name: 'A5 Notebook', description: 'Dot-grid, 192 pages.', priceCents: 1299, stock: 100, category: 'office', tags: [] },
  { id: 'prod_mouse_wireless', name: 'Wireless Mouse', description: '2.4GHz, ergonomic, AA battery.', priceCents: 2299, stock: 35, category: 'office', tags: ['wireless'] },
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
        category: p.category,
        tags: p.tags,
      },
      create: p,
    });
  }
  await upsertAdmin(prisma);
  console.log(`[seed] upserted ${PRODUCTS.length} products + admin user`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
