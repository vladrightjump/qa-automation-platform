// Unit tests for the GeoBanner state machine. Mocks navigator.geolocation
// + fetch and asserts the four user-visible branches:
//   1. dismissed (sessionStorage flag) → nothing rendered.
//   2. permission granted + suggestion → suggestion aside with accept/dismiss.
//   3. permission denied → fallback aside with region picker.
//   4. geolocation unavailable → fallback aside.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import GeoBanner from './GeoBanner';

vi.mock('@/lib/api', () => ({
  api: { getCart: vi.fn().mockResolvedValue({ items: [] }) },
}));

const REGION = {
  country: 'DE',
  name: 'Germany',
  locale: 'de-DE',
  currency: 'EUR',
};

const REGION_LIST = [
  REGION,
  { country: 'US', name: 'United States', locale: 'en-US', currency: 'USD' },
];

const DISMISSED_KEY = 'qa_geo_dismissed';

const stubGeolocation = (
  behaviour: 'success' | 'denied',
) => {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (
        ok: PositionCallback,
        err: PositionErrorCallback,
      ) => {
        if (behaviour === 'success') {
          ok({
            coords: {
              latitude: 52,
              longitude: 13,
              accuracy: 1,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        } else {
          err({ code: 1, message: 'denied' } as GeolocationPositionError);
        }
      },
    },
  });
};

const removeGeolocation = () => {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LocaleProvider>{children}</LocaleProvider>
  </AuthProvider>
);

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('GeoBanner', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('renders nothing when the dismissed flag is set in sessionStorage', async () => {
    window.sessionStorage.setItem(DISMISSED_KEY, '1');
    stubGeolocation('success');
    const { container } = render(<GeoBanner />, { wrapper });
    // Give effects a microtask to fire — nothing should appear.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[data-testid^="geo-"]')).toBeNull();
  });

  it('renders the suggestion aside after a successful geolocation + /geo/resolve fetch', async () => {
    stubGeolocation('success');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => REGION });
    render(<GeoBanner />, { wrapper });

    expect(await screen.findByTestId('geo-banner')).toBeInTheDocument();
    expect(screen.getByTestId('geo-accept')).toBeInTheDocument();
    expect(screen.getByTestId('geo-dismiss')).toBeInTheDocument();
    expect(screen.getByTestId('geo-suggestion').textContent).toMatch(/Germany/);
  });

  it('dismiss button sets the dismissed flag and unmounts the banner', async () => {
    stubGeolocation('success');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => REGION });
    render(<GeoBanner />, { wrapper });
    const dismiss = await screen.findByTestId('geo-dismiss');

    await userEvent.click(dismiss);

    expect(window.sessionStorage.getItem(DISMISSED_KEY)).toBe('1');
    expect(screen.queryByTestId('geo-banner')).toBeNull();
  });

  it('accept button switches the locale to the suggestion and dismisses', async () => {
    stubGeolocation('success');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => REGION });
    render(
      <AuthProvider>
        <LocaleProvider>
          <GeoBanner />
        </LocaleProvider>
      </AuthProvider>,
    );
    const accept = await screen.findByTestId('geo-accept');

    await act(async () => {
      await userEvent.click(accept);
    });

    expect(window.localStorage.getItem('qa_locale')).toBe('de-DE');
    expect(window.sessionStorage.getItem(DISMISSED_KEY)).toBe('1');
    expect(screen.queryByTestId('geo-banner')).toBeNull();
  });

  it('falls back to a region picker when permission is denied', async () => {
    stubGeolocation('denied');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => REGION_LIST });
    render(<GeoBanner />, { wrapper });

    expect(await screen.findByTestId('geo-fallback')).toBeInTheDocument();
    expect(await screen.findByTestId('geo-region-option-DE')).toBeInTheDocument();
    expect(screen.getByTestId('geo-region-option-US')).toBeInTheDocument();
  });

  it('falls back to a region picker when navigator.geolocation is missing', async () => {
    removeGeolocation();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => REGION_LIST });
    render(<GeoBanner />, { wrapper });

    expect(await screen.findByTestId('geo-fallback')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('geo-region-option-DE')).toBeInTheDocument());
  });

  it('renders the fallback (no banner) when /geo/resolve responds non-OK', async () => {
    stubGeolocation('success');
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => REGION_LIST });
    render(<GeoBanner />, { wrapper });

    expect(await screen.findByTestId('geo-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('geo-banner')).toBeNull();
  });
});
