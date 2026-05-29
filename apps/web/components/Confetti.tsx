'use client';

// Tiny CSS-only confetti — 24 spans falling with random delays + colors.
// Honors prefers-reduced-motion via the .confetti-piece animation override
// in globals.css.

const COLORS = ['#a855f7', '#f43f5e', '#22d3ee', '#facc15', '#34d399', '#f97316'];

export default function Confetti({ count = 24 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.round((i / count) * 100 + (Math.random() * 6 - 3));
        const delay = (i % 8) * 0.08 + Math.random() * 0.3;
        const color = COLORS[i % COLORS.length];
        const rotate = Math.random() * 360;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              backgroundColor: color,
              transform: `rotate(${rotate}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
