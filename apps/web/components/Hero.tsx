export default function Hero() {
  return (
    <section
      data-testid="storefront-hero"
      className="animate-fade-in py-16 sm:py-20 text-center"
    >
      <div className="max-w-2xl mx-auto space-y-5">
        <span className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-ink-faint">
          Seasonal release · No.01
        </span>
        <h1 className="text-[34px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
          Useful objects, plainly made.
          <br />A storefront made to be tested.
        </h1>
        <p className="text-ink-soft text-[15.5px] max-w-xl mx-auto leading-relaxed">
          A deliberately small e-commerce surface that exercises every
          Playwright pattern worth showing off — filters, modals, optimistic UI,
          accessibility, visual regression.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="#catalog"
            data-testid="hero-shop"
            className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-card text-sm font-medium px-5 py-2.5 rounded-lg transition-colors active:scale-95"
          >
            Browse the collection
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="/wishlist"
            className="inline-flex items-center text-sm text-ink font-medium border border-line-strong hover:bg-paper-deep px-5 py-2.5 rounded-lg transition-colors"
          >
            View wishlist
          </a>
        </div>
      </div>
    </section>
  );
}
