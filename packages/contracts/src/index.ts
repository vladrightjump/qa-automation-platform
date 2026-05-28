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

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  totalCents: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(OrderItemSchema),
});

export const AuthResultSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
});

export const ProductListSchema = z.array(ProductSchema);
export const OrderListSchema = z.array(OrderSchema);

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductSort = z.infer<typeof ProductSortSchema>;
export type PagedProducts = z.infer<typeof PagedProductsSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type AuthResult = z.infer<typeof AuthResultSchema>;

export { z };
