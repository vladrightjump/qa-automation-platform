// Idempotent seed: deterministic product IDs/stock so tests have a stable baseline.
// Re-running is safe — every row uses upsert.
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
  // gadgets — happy-path defaults
  { id: 'prod_widget', name: 'Widget', description: 'A basic widget. The default happy-path product.', priceCents: 1999, stock: 50, category: 'gadgets', tags: ['featured', 'bestseller'] },
  { id: 'prod_gizmo', name: 'Gizmo', description: 'A fancy gizmo.', priceCents: 2999, stock: 20, category: 'gadgets', tags: ['new'] },
  { id: 'prod_thingamajig', name: 'Thingamajig', description: 'A low-cost bulk item.', priceCents: 999, stock: 100, category: 'gadgets', tags: ['bulk'] },
  { id: 'prod_oos', name: 'Out-of-stock Sample', description: 'Always zero stock — drives the out-of-stock negative path.', priceCents: 1499, stock: 0, category: 'gadgets', tags: [] },
  { id: 'prod_doohickey', name: 'Doohickey', description: 'Compact, no batteries required.', priceCents: 1299, stock: 35, category: 'gadgets', tags: ['compact'] },
  { id: 'prod_whatsit', name: 'Whatsit', description: 'For the curious tinkerer.', priceCents: 3499, stock: 12, category: 'gadgets', tags: ['premium'] },

  // apparel
  { id: 'prod_tee_basic', name: 'Basic Tee', description: 'Soft cotton, unisex sizing.', priceCents: 1999, stock: 80, category: 'apparel', tags: ['cotton', 'unisex'] },
  { id: 'prod_hoodie_classic', name: 'Classic Hoodie', description: 'Heavyweight fleece with kangaroo pocket.', priceCents: 4999, stock: 40, category: 'apparel', tags: ['fleece', 'bestseller'] },
  { id: 'prod_cap_canvas', name: 'Canvas Cap', description: 'Adjustable strap, low profile.', priceCents: 1599, stock: 60, category: 'apparel', tags: ['adjustable'] },
  { id: 'prod_socks_pair', name: 'Crew Socks', description: 'Cushioned, mid-calf, ribbed.', priceCents: 899, stock: 200, category: 'apparel', tags: ['cushioned'] },
  { id: 'prod_jacket_rain', name: 'Rain Jacket', description: 'Waterproof shell with taped seams.', priceCents: 8999, stock: 15, category: 'apparel', tags: ['waterproof', 'premium'] },
  { id: 'prod_jeans_slim', name: 'Slim Jeans', description: 'Stretch denim with mid-rise fit.', priceCents: 5999, stock: 25, category: 'apparel', tags: ['stretch'] },

  // home
  { id: 'prod_mug_ceramic', name: 'Ceramic Mug', description: '12oz, dishwasher-safe.', priceCents: 1199, stock: 120, category: 'home', tags: ['dishwasher-safe'] },
  { id: 'prod_lamp_desk', name: 'Desk Lamp', description: 'LED, adjustable arm, USB charging port.', priceCents: 3999, stock: 30, category: 'home', tags: ['led', 'usb'] },
  { id: 'prod_candle_soy', name: 'Soy Candle', description: '8oz, 40-hour burn, lavender scent.', priceCents: 1999, stock: 50, category: 'home', tags: ['scented'] },
  { id: 'prod_blanket_throw', name: 'Throw Blanket', description: 'Knit, machine washable.', priceCents: 4499, stock: 22, category: 'home', tags: ['washable'] },
  { id: 'prod_clock_wall', name: 'Wall Clock', description: 'Silent sweep, 10" diameter.', priceCents: 2799, stock: 18, category: 'home', tags: ['silent'] },
  { id: 'prod_frame_8x10', name: 'Picture Frame 8x10', description: 'Matte black wood with glass front.', priceCents: 1499, stock: 45, category: 'home', tags: ['wood'] },

  // office
  { id: 'prod_notebook_a5', name: 'A5 Notebook', description: 'Dot-grid, 192 pages.', priceCents: 1299, stock: 100, category: 'office', tags: ['dot-grid'] },
  { id: 'prod_pen_gel', name: 'Gel Pen 3-pack', description: '0.5mm, black ink, smooth flow.', priceCents: 599, stock: 250, category: 'office', tags: ['bulk'] },
  { id: 'prod_stapler', name: 'Heavy-duty Stapler', description: 'Up to 25 sheets, all-metal.', priceCents: 1899, stock: 28, category: 'office', tags: ['metal'] },
  { id: 'prod_desk_pad', name: 'Desk Pad', description: 'Leatherette, 24x14", non-slip backing.', priceCents: 2499, stock: 40, category: 'office', tags: ['leather'] },
  { id: 'prod_mouse_wireless', name: 'Wireless Mouse', description: '2.4GHz, ergonomic, AA battery.', priceCents: 2299, stock: 35, category: 'office', tags: ['wireless', 'ergonomic'] },
  { id: 'prod_keyboard_mech', name: 'Mechanical Keyboard', description: '87 keys, blue switches, RGB.', priceCents: 7999, stock: 10, category: 'office', tags: ['premium', 'rgb'] },
  { id: 'prod_monitor_arm', name: 'Monitor Arm', description: 'VESA mount, supports up to 32".', priceCents: 5499, stock: 14, category: 'office', tags: ['mount'] },
  { id: 'prod_chair_oos', name: 'Ergonomic Chair (OOS)', description: 'Premium chair, currently out of stock.', priceCents: 29999, stock: 0, category: 'office', tags: ['premium', 'oos'] },
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
