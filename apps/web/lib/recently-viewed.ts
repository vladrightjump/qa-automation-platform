// localStorage-backed "recently viewed" list, FIFO-capped at 8 entries.
// Used by the storefront + cart + wishlist strips and the recently-viewed
// e2e spec.

const KEY = 'qa_recently_viewed';
const MAX = 8;

function readSafely(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

export function getRecent(): string[] {
  return readSafely();
}

export function pushRecent(id: string): void {
  if (typeof window === 'undefined') return;
  const current = readSafely().filter((x) => x !== id);
  current.unshift(id);
  if (current.length > MAX) current.length = MAX;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage full / blocked — silently drop.
  }
}

export function clearRecent(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

export const RECENTLY_VIEWED_KEY = KEY;
