// Hybrid spec: state seeded via API + DB, flow driven through the browser via
// Page Objects, ground truth verified in the DB.
import { test, expect } from '../fixtures';
import { ProductFactory } from '../factories/product.factory';
import { AddressFactory } from '../factories/address.factory';

test.describe('checkout (UI)', () => {
  test('@smoke complete flow: browse → cart → checkout wizard → confirmation + DB row', async ({
    authedPage,
    api,
    db,
    testUser,
    storefront,
    cart,
    checkout,
  }) => {
    // Pre-create a default address so the wizard can advance from step 1
    // without typing a brand-new address each run. (The new-address path
    // gets its own dedicated spec.)
    await api.createAddress(
      testUser.token,
      AddressFactory.build({ isDefault: true }),
    );
    // Seed a fresh product so this test owns its own stock baseline.
    const product = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1200, name: 'Test Widget' }),
    });

    // The home grid paginates by name, so factory products with random
    // names may not land on page 1. Navigate to the detail page to add.
    await authedPage.goto(`/products/${product.id}`);
    await expect(storefront.productCard(product.id)).toBeVisible();
    await storefront.addToCart(product.id);

    // The navbar cart count updates as the AuthProvider re-fetches.
    await expect(storefront.cartCount()).toHaveText('1');

    await cart.goto();
    await expect(cart.item(product.id)).toBeVisible();
    await expect(cart.subtotal()).toHaveText(/\$12\.00/);
    await cart.proceedToCheckout();

    // Walk the 3-step wizard. Wait for saved addresses to load so Next
    // isn't a no-op (no selectedAddressId yet).
    await checkout.waitForAddressReady();
    await checkout.next(); // address → payment
    await checkout.next(); // payment → review
    await checkout.placeOrder();
    await expect(authedPage).toHaveURL(/\/orders\/.+/);
    await expect(checkout.orderStatus()).toHaveText('PAID');

    // Ground truth in the DB — wrapped in `toPass` for the brief window
    // between the API responding and Playwright observing it.
    await expect
      .poll(
        async () =>
          db.auditLog.count({
            where: { userId: testUser.id, action: 'ORDER_PAID' },
          }),
        { timeout: 5_000 },
      )
      .toBe(1);

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.stock).toBe(4);
  });

  test('@regression remove-from-cart updates subtotal and DB', async ({
    authedPage,
    api,
    db,
    testUser,
    cart,
  }) => {
    const a = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 1000 }),
    });
    const b = await db.product.create({
      data: ProductFactory.build({ stock: 5, priceCents: 2000 }),
    });
    await api.addToCart(testUser.token, a.id, 1);
    await api.addToCart(testUser.token, b.id, 1);

    await cart.goto();
    await expect(cart.item(a.id)).toBeVisible();
    await expect(cart.item(b.id)).toBeVisible();
    await expect(cart.subtotal()).toHaveText(/\$30\.00/);

    await cart.removeItem(a.id);
    await expect(cart.item(a.id)).not.toBeVisible();
    await expect(cart.subtotal()).toHaveText(/\$20\.00/);

    // DB confirms only `b` remains in the cart.
    const items = await db.cartItem.findMany({
      where: { cart: { userId: testUser.id } },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.productId).toBe(b.id);
  });
});
