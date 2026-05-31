// Shared product-visual helpers. The storefront renders a category-tinted
// gradient tile with the product's initials in place of a real image; these
// were copy-pasted across ProductCard/QuickViewModal/RecentlyViewed/
// RelatedProducts and drifted once, so they live in one place now.

export const CATEGORY_HUE: Record<string, string> = {
  gadgets: 'from-violet-400 to-fuchsia-400',
  apparel: 'from-pink-400 to-rose-400',
  home: 'from-amber-300 to-orange-400',
  office: 'from-sky-400 to-blue-500',
};

// Gradient classes for a product's category, with a neutral fallback for any
// unknown category.
export function categoryGradient(category: string): string {
  return CATEGORY_HUE[category] ?? 'from-gray-300 to-gray-400';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
