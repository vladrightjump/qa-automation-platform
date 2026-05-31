// Shared Zod schemas for the SUT API. Tests parse responses through these so
// any structural drift in the API surface fails fast and at the right layer.
// All TS types are inferred from schemas — single source of truth.
import { z } from 'zod';

export const UserRoleSchema = z.enum(['USER', 'ADMIN']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
});

export const ProductCategorySchema = z.enum(['gadgets', 'apparel', 'home', 'office']);

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  category: ProductCategorySchema,
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProductSortSchema = z.enum([
  'name_asc',
  'name_desc',
  'price_asc',
  'price_desc',
  'newest',
]);

export const PagedProductsSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export const CartItemSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  product: ProductSchema,
});

export const CartSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(CartItemSchema),
});

export const OrderStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'FULFILLED',
  'CANCELLED',
]);

export const PaymentMethodSchema = z.enum(['CARD', 'PAYPAL', 'COD']);

export const AddressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: z.string(),
  name: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PromoPreviewSchema = z.object({
  code: z.string(),
  discountCents: z.number().int().nonnegative(),
  promoCodeId: z.string(),
});

// Public-facing promo code as surfaced by GET /promo-codes (discovery).
// Never exposes internal fields like timesRedeemed/maxRedemptions.
export const PromoCodeSchema = z.object({
  code: z.string(),
  description: z.string().nullable(),
  percentOff: z.number().int().nullable(),
  flatOffCents: z.number().int().nullable(),
  minSpendCents: z.number().int().nonnegative(),
});

export const PromoCodeListSchema = z.array(PromoCodeSchema);

export const WishlistItemSchema = z.object({
  id: z.string(),
  wishlistId: z.string(),
  productId: z.string(),
  product: ProductSchema,
  createdAt: z.string(),
});

export const WishlistSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(WishlistItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ReviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PagedReviewsSchema = z.object({
  items: z.array(ReviewSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  averageRating: z.number(),
});

export const ReviewSummarySchema = z.object({
  reviewCount: z.number().int().nonnegative(),
  averageRating: z.number(),
});

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const ReturnStatusSchema = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'REFUNDED',
]);

export const ReturnSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  userId: z.string(),
  reason: z.string(),
  status: ReturnStatusSchema,
  refundCents: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  totalCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional().default(0),
  paymentMethod: PaymentMethodSchema.nullable().optional(),
  shippingAddressId: z.string().nullable().optional(),
  promoCodeId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(OrderItemSchema),
  // Present on GET /orders/:id; absent on checkout/list responses.
  returns: z.array(ReturnSchema).optional().default([]),
});

export const StockAlertSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  notified: z.boolean(),
  createdAt: z.string(),
});

export const StockAlertListSchema = z.array(StockAlertSchema);

export const LoyaltyTypeSchema = z.enum(['EARN', 'REDEEM']);

export const LoyaltyTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  orderId: z.string().nullable(),
  points: z.number().int(),
  type: LoyaltyTypeSchema,
  createdAt: z.string(),
});

// GET /loyalty — balance is the signed sum of the ledger (1 point = 1¢).
export const LoyaltyBalanceSchema = z.object({
  balancePoints: z.number().int(),
  transactions: z.array(LoyaltyTransactionSchema),
});

export const AuthResultSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
});

export const ProductListSchema = z.array(ProductSchema);
export const OrderListSchema = z.array(OrderSchema);

export const PagedOrdersSchema = z.object({
  items: z.array(OrderSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductSort = z.infer<typeof ProductSortSchema>;
export type PagedProducts = z.infer<typeof PagedProductsSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PromoPreview = z.infer<typeof PromoPreviewSchema>;
export type PromoCode = z.infer<typeof PromoCodeSchema>;
export type Wishlist = z.infer<typeof WishlistSchema>;
export type WishlistItem = z.infer<typeof WishlistItemSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type PagedReviews = z.infer<typeof PagedReviewsSchema>;
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type ReturnStatus = z.infer<typeof ReturnStatusSchema>;
export type Return = z.infer<typeof ReturnSchema>;
export type PagedOrders = z.infer<typeof PagedOrdersSchema>;
export type StockAlert = z.infer<typeof StockAlertSchema>;
export type LoyaltyType = z.infer<typeof LoyaltyTypeSchema>;
export type LoyaltyTransaction = z.infer<typeof LoyaltyTransactionSchema>;
export type LoyaltyBalance = z.infer<typeof LoyaltyBalanceSchema>;
export type AuthResult = z.infer<typeof AuthResultSchema>;

export { z };
