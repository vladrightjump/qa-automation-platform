export default function Hero() {
  return (
    <section
      data-testid="storefront-hero"
      className="animate-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 via-brand-50 to-white border border-brand-100 px-6 py-10 sm:px-10 sm:py-14 shadow-card"
    >
      <div className="relative z-10 max-w-2xl space-y-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-700 bg-brand-100 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          New seasonal drop
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          The QA storefront,{' '}
          <span className="text-brand-600">made to be tested.</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-xl">
          A deliberately small e-commerce surface that exercises every Playwright
          pattern worth showing off — filters, modals, drag-drop, optimistic UI,
          accessibility, visual regression. Click around.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="#catalog"
            data-testid="hero-shop"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-all duration-150 active:scale-95"
          >
            Shop products
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="/wishlist"
            className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900 font-medium px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            View wishlist
          </a>
        </div>
      </div>

      {/* Decorative dots */}
      <div
        aria-hidden="true"
        className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-accent-400/20 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-20 bottom-2 w-32 h-32 rounded-full bg-brand-500/20 blur-2xl"
      />
    </section>
  );
}
