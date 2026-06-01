export default function Hero() {
  return (
    <section
      data-testid="storefront-hero"
      className="animate-fade-in relative overflow-hidden rounded-3xl border border-line bg-card px-7 py-12 sm:px-12 sm:py-16 shadow-card"
    >
      {/* Warm radial atmosphere instead of a flat panel. */}
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-clay-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-sage-100/60 blur-3xl"
      />

      <div className="relative z-10 max-w-2xl space-y-5">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-clay-700">
          <span className="w-6 h-px bg-clay-500" />
          Seasonal release · No.01
        </span>
        <h1 className="font-display text-[2.6rem] sm:text-6xl leading-[0.98] tracking-tight text-ink">
          Objects, <span className="italic text-clay-600">considered</span>.
          <br />A storefront made to be tested.
        </h1>
        <p className="text-ink-soft text-sm sm:text-base max-w-xl leading-relaxed">
          A deliberately small e-commerce surface that exercises every
          Playwright pattern worth showing off — filters, modals, optimistic UI,
          accessibility, visual regression. Wander in.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="#catalog"
            data-testid="hero-shop"
            className="inline-flex items-center gap-2 bg-clay-500 hover:bg-clay-600 text-card text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-200 active:scale-95"
          >
            Browse the collection
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="/wishlist"
            className="inline-flex items-center text-sm text-ink-soft hover:text-ink font-medium px-4 py-2.5 underline decoration-line decoration-1 underline-offset-4 hover:decoration-clay-400 transition-colors"
          >
            View wishlist
          </a>
        </div>
      </div>
    </section>
  );
}
