// Shared product-visual helpers. The storefront renders a category-tinted
// gradient tile with the product's initials in place of a real image; these
// were copy-pasted across ProductCard/QuickViewModal/RecentlyViewed/
// RelatedProducts and drifted once, so they live in one place now.

// Warm duotone washes — each category gets a tone from the boutique family
// (clay, rosewood, sage, ochre) rather than candy gradients.
export const CATEGORY_HUE: Record<string, string> = {
  gadgets: 'from-[#e3c0aa] to-[#b25c3c]',
  apparel: 'from-[#e8c8bf] to-[#b56a59]',
  home: 'from-[#d9dcc4] to-[#6e7256]',
  office: 'from-[#e9d7a6] to-[#b8862f]',
};

// Gradient classes for a product's category, with a neutral clay fallback for
// any unknown category.
export function categoryGradient(category: string): string {
  return CATEGORY_HUE[category] ?? 'from-clay-200 to-clay-500';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
