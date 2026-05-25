# Phase 3 — Frontend Storefront (SUT)

**Objective:** A minimal Next.js storefront covering the user-facing flows.

**Build:**
- `apps/web` (Next.js 15, App Router) talking to the API via a typed fetch wrapper (`apps/web/lib/api.ts`).
- **Styling:** Tailwind CSS 4 — utility classes only, no component library. One shared layout, neutral palette, responsive grid. Function over polish.
- **State:** auth token + cart count in a lightweight React context, hydrated from `localStorage`; cart/order data fetched from the API (no client-side cache lib needed). Tests inject the token into `localStorage` to skip the login UI walk.
- Stable, test-friendly selectors (`data-testid`) on every key interactive element (see map below).

**Routes (App Router):**

| Route | Page | Purpose |
|---|---|---|
| `/` | Product list | grid of products, add-to-cart |
| `/products/[id]` | Product detail | single product, stock, add-to-cart |
| `/cart` | Cart | line items, quantities, subtotal, go-to-checkout |
| `/checkout` | Checkout | confirm + place order |
| `/orders` | Order history | list of the user's orders + status |
| `/orders/[id]` | Order confirmation/detail | order id, items, status badge |
| `/login` | Auth | register / login, persists token |

**Components:** `Navbar` (nav links + cart count), `ProductCard`, `ProductGrid`, `CartTable`, `CheckoutForm`, `OrderSummary`, `OrderStatusBadge`, `AuthForm`, `Toast` (errors).

**`data-testid` map (key elements):**

| Element | `data-testid` |
|---|---|
| Product card | `product-card-{id}` |
| Add-to-cart button | `add-to-cart-{id}` |
| Cart count badge | `cart-count` |
| Cart line item | `cart-item-{id}` |
| Remove-from-cart button | `cart-remove-{id}` |
| Cart subtotal | `cart-subtotal` |
| Proceed-to-checkout button | `cart-checkout` |
| Place-order button | `checkout-submit` |
| Order id (confirmation) | `order-id` |
| Order status badge | `order-status` |
| Nav links | `nav-products`, `nav-cart`, `nav-orders` |
| Auth fields / submit | `auth-email`, `auth-password`, `auth-submit` |
| Error toast | `toast-error` |

**Definition of Done:** A human can complete browse → cart → checkout → confirmation in the browser end to end.

**Checkpoint:** Report routes + the `data-testid` map for key elements. Stop.
