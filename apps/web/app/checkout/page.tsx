'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  api,
  type Address,
  type AddressInput,
  type Cart,
  type PaymentMethod,
  type PromoCode,
  type PromoPreview,
} from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import Toast from '@/components/Toast';
import { useToast } from '@/components/ui/ToastQueue';
import Button from '@/components/ui/Button';

type Step = 'address' | 'payment' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'address', label: '1. Address' },
  { id: 'payment', label: '2. Payment' },
  { id: 'review', label: '3. Review' },
];

const EMPTY_ADDRESS: AddressInput = {
  label: 'Home',
  name: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: 'US',
};

interface AddressErrors {
  name?: string;
  line1?: string;
  city?: string;
  postalCode?: string;
}

function validateAddress(input: AddressInput): AddressErrors {
  const errs: AddressErrors = {};
  if (!input.name.trim()) errs.name = 'Name is required';
  if (!input.line1.trim()) errs.line1 = 'Address line 1 is required';
  if (!input.city.trim()) errs.city = 'City is required';
  if (input.postalCode.trim().length < 3)
    errs.postalCode = 'Postal code must be at least 3 chars';
  return errs;
}

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { token, isHydrated, refreshCartCount } = useRequireAuth();
  const [step, setStep] = useState<Step>('address');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1 — address
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [useNewAddress, setUseNewAddress] = useState(false);

  // Step 2 — payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

  // Step 3 — review
  const [cart, setCart] = useState<Cart | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const [promoErr, setPromoErr] = useState<string | null>(null);
  const [deals, setDeals] = useState<PromoCode[] | null>(null);

  // Loyalty / store credit
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [applyLoyalty, setApplyLoyalty] = useState(false);

  useEffect(() => {
    if (!isHydrated || !token) return;
    void api.listAddresses(token).then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setSelectedAddressId(def.id);
      else setUseNewAddress(true);
    });
    void api.getCart(token).then(setCart);
    void api.listPromoCodes().then(setDeals);
    void api.getLoyalty(token).then((l) => setLoyaltyBalance(l.balancePoints));
  }, [isHydrated, token]);

  const subtotalCents =
    cart?.items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0) ?? 0;
  const discountCents = promo?.discountCents ?? 0;
  const afterPromoCents = Math.max(0, subtotalCents - discountCents);
  // Store credit redeems 1¢ per point, capped at the post-promo total.
  const redeemCents =
    applyLoyalty && loyaltyBalance > 0
      ? Math.min(loyaltyBalance, afterPromoCents)
      : 0;
  const totalCents = Math.max(0, afterPromoCents - redeemCents);

  async function applyPromo(code?: string) {
    if (!token) return;
    const codeToApply = (code ?? promoInput).trim();
    if (!codeToApply) return;
    setPromoErr(null);
    try {
      const preview = await api.applyPromo(token, codeToApply);
      setPromo(preview);
      toast.push({
        variant: 'success',
        message: `Applied ${preview.code} (-$${(preview.discountCents / 100).toFixed(2)})`,
      });
    } catch (e) {
      setPromo(null);
      setPromoErr(e instanceof Error ? e.message : String(e));
    }
  }

  function removePromo() {
    setPromo(null);
    setPromoInput('');
  }

  async function next() {
    if (step === 'address') {
      if (useNewAddress) {
        const errs = validateAddress(newAddress);
        setAddressErrors(errs);
        if (Object.keys(errs).length > 0) return;
        if (!token) return;
        try {
          const created = await api.createAddress(token, newAddress);
          setAddresses((current) => [created, ...(current ?? [])]);
          setSelectedAddressId(created.id);
          setUseNewAddress(false);
        } catch (e) {
          toast.push({
            variant: 'error',
            message: e instanceof Error ? e.message : String(e),
          });
          return;
        }
      } else if (!selectedAddressId) {
        toast.push({ variant: 'warning', message: 'Pick an address first.' });
        return;
      }
      setStep('payment');
      return;
    }
    if (step === 'payment') {
      setStep('review');
      return;
    }
  }

  function back() {
    if (step === 'review') setStep('payment');
    else if (step === 'payment') setStep('address');
  }

  async function placeOrder() {
    if (!token || !selectedAddressId) return;
    setBusy(true);
    setErr(null);
    try {
      const order = await api.checkout(token, {
        addressId: selectedAddressId,
        paymentMethod,
        promoCode: promo?.code,
        redeemPoints: redeemCents > 0 ? redeemCents : undefined,
      });
      await refreshCartCount();
      // Pass ?just=1 so the order detail page renders the celebratory
      // confirmation treatment (confetti + check-pop).
      router.push(`/orders/${order.id}?just=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Checkout
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
      <div className="space-y-4 min-w-0">
      <ol
        data-testid="checkout-steps"
        className="flex items-center gap-2 text-sm"
      >
        {STEPS.map((s) => (
          <li
            key={s.id}
            data-testid={`checkout-step-${s.id}`}
            data-active={s.id === step}
            className={`px-3 py-1 rounded-full transition-all duration-150 ${
              s.id === step
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {s.label}
          </li>
        ))}
      </ol>

      {step === 'address' && (
        <div className="space-y-4" data-testid="checkout-step-address-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Shipping address</h2>
            <Link
              href="/account/addresses"
              data-testid="checkout-manage-addresses"
              className="text-sm text-blue-600 hover:underline"
            >
              Manage addresses
            </Link>
          </div>
          {addresses === null && <p className="text-gray-500">Loading…</p>}
          {addresses !== null && addresses.length > 0 && !useNewAddress && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start gap-3 border rounded p-3 cursor-pointer hover:bg-gray-50"
                  data-testid={`checkout-address-${a.id}`}
                >
                  <input
                    type="radio"
                    name="checkout-address"
                    checked={selectedAddressId === a.id}
                    onChange={() => setSelectedAddressId(a.id)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <div className="font-medium">
                      {a.label}
                      {a.isDefault && (
                        <span className="ml-2 text-xs text-gray-500">
                          (default)
                        </span>
                      )}
                    </div>
                    <div>{a.name}</div>
                    <div className="text-gray-600">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}{' '}
                      {a.country}
                    </div>
                  </div>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setUseNewAddress(true)}
                data-testid="checkout-add-new-address"
                className="text-sm text-blue-600 hover:underline"
              >
                + Use a new address
              </button>
            </div>
          )}

          {(useNewAddress || (addresses !== null && addresses.length === 0)) && (
            <form className="space-y-2 border rounded p-3 bg-gray-50">
              <h3 className="text-sm font-medium">New address</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">
                  <span className="text-gray-700">Label</span>
                  <input
                    value={newAddress.label}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, label: e.target.value })
                    }
                    data-testid="checkout-new-label"
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-700">Full name</span>
                  <input
                    value={newAddress.name}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, name: e.target.value })
                    }
                    data-testid="checkout-new-name"
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                  {addressErrors.name && (
                    <span
                      data-testid="checkout-new-name-error"
                      className="text-xs text-red-600"
                    >
                      {addressErrors.name}
                    </span>
                  )}
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-gray-700">Line 1</span>
                <input
                  value={newAddress.line1}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, line1: e.target.value })
                  }
                  data-testid="checkout-new-line1"
                  className="mt-1 w-full border rounded px-2 py-1"
                />
                {addressErrors.line1 && (
                  <span
                    data-testid="checkout-new-line1-error"
                    className="text-xs text-red-600"
                  >
                    {addressErrors.line1}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-sm col-span-2">
                  <span className="text-gray-700">City</span>
                  <input
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                    data-testid="checkout-new-city"
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                  {addressErrors.city && (
                    <span
                      data-testid="checkout-new-city-error"
                      className="text-xs text-red-600"
                    >
                      {addressErrors.city}
                    </span>
                  )}
                </label>
                <label className="block text-sm">
                  <span className="text-gray-700">Postal code</span>
                  <input
                    value={newAddress.postalCode}
                    onChange={(e) =>
                      setNewAddress({
                        ...newAddress,
                        postalCode: e.target.value,
                      })
                    }
                    data-testid="checkout-new-postal"
                    className="mt-1 w-full border rounded px-2 py-1"
                  />
                  {addressErrors.postalCode && (
                    <span
                      data-testid="checkout-new-postal-error"
                      className="text-xs text-red-600"
                    >
                      {addressErrors.postalCode}
                    </span>
                  )}
                </label>
              </div>
              {addresses !== null && addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseNewAddress(false)}
                  data-testid="checkout-cancel-new-address"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Cancel — pick saved
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {step === 'payment' && (
        <div className="space-y-3" data-testid="checkout-step-payment-panel">
          <h2 className="font-medium">Payment method</h2>
          {(['CARD', 'PAYPAL', 'COD'] as PaymentMethod[]).map((m) => (
            <label
              key={m}
              className="flex items-center gap-2 border rounded p-2"
              data-testid={`checkout-payment-${m}`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === m}
                onChange={() => setPaymentMethod(m)}
              />
              <span>{m === 'COD' ? 'Cash on delivery' : m}</span>
            </label>
          ))}
          {paymentMethod === 'CARD' && (
            <div
              data-testid="checkout-card-fields"
              className="border rounded p-3 bg-gray-50 text-sm space-y-2"
            >
              <p className="text-gray-500">Card details (not stored)</p>
              <input
                placeholder="Card number"
                data-testid="checkout-card-number"
                className="w-full border rounded px-2 py-1"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="MM/YY"
                  data-testid="checkout-card-expiry"
                  className="border rounded px-2 py-1"
                />
                <input
                  placeholder="CVC"
                  data-testid="checkout-card-cvc"
                  className="border rounded px-2 py-1"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-3" data-testid="checkout-step-review-panel">
          <h2 className="font-medium">Review &amp; place order</h2>
          {cart && (
            <ul className="border rounded divide-y bg-white">
              {cart.items.map((i) => (
                <li
                  key={i.id}
                  className="p-2 flex justify-between text-sm"
                  data-testid={`review-line-${i.productId}`}
                >
                  <span>
                    {i.product.name} × {i.quantity}
                  </span>
                  <span className="font-mono">
                    ${((i.product.priceCents * i.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!promo && deals && deals.length > 0 && (
            <div
              className="border rounded p-3 bg-amber-50"
              data-testid="promo-deals"
            >
              <p className="text-sm font-medium">🎁 Available deals</p>
              <ul className="mt-2 space-y-2">
                {deals.map((d) => {
                  const locked = subtotalCents < d.minSpendCents;
                  return (
                    <li
                      key={d.code}
                      data-testid={`promo-deal-${d.code}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        <span className="font-mono font-medium">{d.code}</span>
                        {d.description ? ` — ${d.description}` : ''}
                      </span>
                      {locked ? (
                        <span
                          data-testid={`promo-deal-locked-${d.code}`}
                          className="text-xs text-gray-500"
                        >
                          Spend ${(d.minSpendCents / 100).toFixed(2)} to unlock
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void applyPromo(d.code)}
                          data-testid={`promo-deal-apply-${d.code}`}
                          className="px-2 py-0.5 border rounded text-xs hover:bg-amber-100"
                        >
                          Apply
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="border rounded p-3 bg-gray-50">
            <label className="text-sm font-medium">Promo code</label>
            {promo ? (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span
                  data-testid="checkout-promo-applied"
                  className="text-green-700 font-mono"
                >
                  {promo.code} (-${(promo.discountCents / 100).toFixed(2)})
                </span>
                <button
                  type="button"
                  onClick={removePromo}
                  data-testid="checkout-promo-remove"
                  className="text-blue-600 hover:underline"
                >
                  remove
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  data-testid="checkout-promo-input"
                  placeholder="WELCOME10"
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void applyPromo()}
                  data-testid="checkout-promo-apply"
                  className="px-3 py-1 border rounded text-sm"
                >
                  Apply
                </button>
              </div>
            )}
            {promoErr && (
              <span
                data-testid="checkout-promo-error"
                className="block mt-1 text-xs text-red-600"
              >
                {promoErr}
              </span>
            )}
          </div>

          {err && <Toast message={err} />}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={back}
          disabled={step === 'address'}
          data-testid="checkout-back"
        >
          ← Back
        </Button>
        {step !== 'review' ? (
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => void next()}
            data-testid="checkout-next"
          >
            Next <span aria-hidden="true">→</span>
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => void placeOrder()}
            disabled={busy}
            data-testid="checkout-submit"
          >
            {busy ? 'Placing…' : 'Place order'}
          </Button>
        )}
      </div>
      </div>

      {/* Sticky order summary — visible on every step on md+ screens. */}
      <aside className="lg:sticky lg:top-20 self-start">
        <section
          data-testid="checkout-summary"
          aria-label="Order summary"
          className="border border-gray-100 bg-white rounded-2xl p-4 shadow-card text-sm space-y-3"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-semibold text-gray-900">Order summary</span>
            <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
              Step {STEPS.findIndex((s) => s.id === step) + 1}/{STEPS.length}
            </span>
          </div>
          {cart && cart.items.length > 0 && (
            <ul className="space-y-1.5">
              {cart.items.map((i) => (
                <li
                  key={i.id}
                  className="flex justify-between text-xs text-gray-700"
                >
                  <span className="truncate pr-2">
                    {i.product.name} × {i.quantity}
                  </span>
                  <span className="font-mono shrink-0">
                    ${((i.product.priceCents * i.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t pt-2 text-gray-600">
            <dt>Subtotal</dt>
            <dd
              data-testid="checkout-summary-subtotal"
              className="font-mono text-right"
            >
              ${(subtotalCents / 100).toFixed(2)}
            </dd>
            <dt>Discount</dt>
            <dd
              data-testid="checkout-summary-discount"
              className="font-mono text-right"
            >
              -${(discountCents / 100).toFixed(2)}
            </dd>
            {redeemCents > 0 && (
              <>
                <dt>Store credit</dt>
                <dd
                  data-testid="checkout-summary-loyalty"
                  className="font-mono text-right text-amber-700"
                >
                  -${(redeemCents / 100).toFixed(2)}
                </dd>
              </>
            )}
            <dt className="col-start-1 border-t pt-1.5 mt-1 font-semibold text-gray-900">
              Total
            </dt>
            <dd
              data-testid="checkout-summary-total"
              className="col-start-2 border-t pt-1.5 mt-1 font-mono font-semibold text-gray-900 text-right"
            >
              ${(totalCents / 100).toFixed(2)}
            </dd>
          </dl>

          {loyaltyBalance > 0 && (
            <label
              data-testid="checkout-loyalty"
              className="flex items-center gap-2 border-t pt-3 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={applyLoyalty}
                onChange={(e) => setApplyLoyalty(e.target.checked)}
                data-testid="checkout-loyalty-apply"
                className="rounded border-gray-300"
              />
              <span>
                Apply store credit{' '}
                <span data-testid="checkout-loyalty-balance" className="font-mono">
                  ${(loyaltyBalance / 100).toFixed(2)}
                </span>
              </span>
            </label>
          )}
        </section>
      </aside>
      </div>
    </section>
  );
}
