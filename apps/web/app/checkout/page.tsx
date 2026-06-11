'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useLocale } from '@/lib/i18n';
import { validateAddress, hasErrors, type AddressErrors } from '@/lib/validators';
import Toast from '@/components/Toast';
import { useToast } from '@/components/ui/ToastQueue';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import PageSection from '@/components/ui/PageSection';
import StepChips, {
  type CheckoutStep,
} from '@/components/features/checkout/StepChips';
import AddressPicker from '@/components/features/checkout/AddressPicker';
import PaymentMethods from '@/components/features/checkout/PaymentMethods';
import PromoPanel from '@/components/features/checkout/PromoPanel';
import ReviewPanel from '@/components/features/checkout/ReviewPanel';

type Step = 'address' | 'payment' | 'review';
const STEPS: CheckoutStep<Step>[] = [
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

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { token, isHydrated, refreshCartCount } = useRequireAuth();
  const { t, formatMoney } = useLocale();
  const [step, setStep] = useState<Step>('address');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1 — address
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
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
        message: `Applied ${preview.code} (-${formatMoney(preview.discountCents)})`,
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
        if (hasErrors(errs)) return;
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
      router.push(`/orders/${order.id}?just=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageSection gap={5}>
      <PageHeader title="Checkout" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="space-y-4 min-w-0">
          <StepChips steps={STEPS} currentId={step} />

          {step === 'address' && (
            <AddressPicker
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              onSelect={setSelectedAddressId}
              useNewAddress={useNewAddress}
              onToggleNewAddress={setUseNewAddress}
              newAddress={newAddress}
              onNewAddressChange={setNewAddress}
              errors={addressErrors}
            />
          )}

          {step === 'payment' && (
            <PaymentMethods value={paymentMethod} onChange={setPaymentMethod} />
          )}

          {step === 'review' && (
            <div className="space-y-3" data-testid="checkout-step-review-panel">
              <h2 className="font-medium">Review &amp; place order</h2>
              <ReviewPanel cart={cart} />
              <PromoPanel
                promo={promo}
                promoInput={promoInput}
                promoErr={promoErr}
                deals={deals}
                subtotalCents={subtotalCents}
                onPromoInputChange={setPromoInput}
                onApply={applyPromo}
                onRemove={removePromo}
              />
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
              <button
                type="button"
                onClick={() => void placeOrder()}
                disabled={busy}
                data-testid="checkout-submit"
                className="inline-flex items-center gap-2 bg-ink hover:bg-[#443c34] text-card rounded-lg px-5 py-2 text-sm font-medium active:scale-95 disabled:bg-line-strong disabled:cursor-not-allowed disabled:active:scale-100 transition-colors"
              >
                {busy ? 'Placing…' : `Place order · ${formatMoney(totalCents)}`}
              </button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 self-start">
          <section
            data-testid="checkout-summary"
            aria-label="Order summary"
            className="border border-line bg-card rounded-[10px] p-5 text-sm space-y-3"
          >
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="font-semibold text-ink">Order summary</span>
              <span className="text-xs bg-paper-deep text-ink-soft px-2 py-0.5 rounded-md font-medium">
                Step {STEPS.findIndex((s) => s.id === step) + 1}/{STEPS.length}
              </span>
            </div>
            {cart && cart.items.length > 0 && (
              <ul className="space-y-1.5">
                {cart.items.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between text-xs text-ink-soft"
                  >
                    <span className="truncate pr-2">
                      {i.product.name} × {i.quantity}
                    </span>
                    <span className="font-mono shrink-0">
                      {formatMoney(i.product.priceCents * i.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-line pt-2 text-[13.5px] text-ink-soft">
              <dt>{t('checkout.subtotal')}</dt>
              <dd
                data-testid="checkout-summary-subtotal"
                className="font-mono text-right"
              >
                {formatMoney(subtotalCents)}
              </dd>
              <dt>{t('checkout.discount')}</dt>
              <dd
                data-testid="checkout-summary-discount"
                className="font-mono text-right"
              >
                -{formatMoney(discountCents)}
              </dd>
              {redeemCents > 0 && (
                <>
                  <dt>{t('checkout.loyalty')}</dt>
                  <dd
                    data-testid="checkout-summary-loyalty"
                    className="font-mono text-right text-clay-600"
                  >
                    -{formatMoney(redeemCents)}
                  </dd>
                </>
              )}
              <dt className="col-start-1 border-t border-line pt-1.5 mt-1 font-semibold text-ink">
                {t('checkout.total')}
              </dt>
              <dd
                data-testid="checkout-summary-total"
                className="col-start-2 border-t border-line pt-1.5 mt-1 font-mono font-semibold text-ink text-right"
              >
                {formatMoney(totalCents)}
              </dd>
            </dl>

            {loyaltyBalance > 0 && (
              <label
                data-testid="checkout-loyalty"
                className="flex items-center gap-2 border-t border-line pt-3 text-sm text-ink-soft cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={applyLoyalty}
                  onChange={(e) => setApplyLoyalty(e.target.checked)}
                  data-testid="checkout-loyalty-apply"
                  className="rounded border-line-strong"
                />
                <span>
                  Apply store credit{' '}
                  <span data-testid="checkout-loyalty-balance" className="font-mono">
                    {formatMoney(loyaltyBalance)}
                  </span>
                </span>
              </label>
            )}
          </section>
        </aside>
      </div>
    </PageSection>
  );
}
