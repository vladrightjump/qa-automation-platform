'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  type Address,
  type AddressInput,
  type Cart,
  type PaymentMethod,
} from '@/lib/api';
import { useRequireAuth } from '@/lib/use-require-auth';
import { useLocale } from '@/lib/i18n';
import { validateAddress, hasErrors, type AddressErrors } from '@/lib/validators';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/components/ui/ToastQueue';
import PageHeader from '@/components/ui/PageHeader';
import PageSection from '@/components/ui/PageSection';
import AddressPicker from '@/components/features/checkout/AddressPicker';
import PaymentMethods from '@/components/features/checkout/PaymentMethods';

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
  const { formatMoney } = useLocale();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [useNewAddress, setUseNewAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    if (!isHydrated || !token) return;
    void api.listAddresses(token).then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setSelectedAddressId(def.id);
      else setUseNewAddress(true);
    });
    void api.getCart(token).then(setCart);
  }, [isHydrated, token]);

  const totalCents =
    cart?.items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0) ?? 0;

  async function placeOrder() {
    if (!token) return;
    let addressId = selectedAddressId;
    if (useNewAddress) {
      const errs = validateAddress(newAddress);
      setAddressErrors(errs);
      if (hasErrors(errs)) return;
      try {
        const created = await api.createAddress(token, newAddress);
        setAddresses((current) => [created, ...(current ?? [])]);
        addressId = created.id;
        setSelectedAddressId(created.id);
        setUseNewAddress(false);
      } catch (e) {
        toast.push({
          variant: 'error',
          message: e instanceof Error ? e.message : String(e),
        });
        return;
      }
    }
    if (!addressId) {
      toast.push({ variant: 'warning', message: 'Pick an address first.' });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const order = await api.checkout(token, {
        addressId,
        paymentMethod,
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
        <div className="space-y-5 min-w-0">
          <section data-testid="checkout-address">
            <h2 className="text-sm font-semibold text-ink mb-2">Address</h2>
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
          </section>

          <section data-testid="checkout-payment">
            <h2 className="text-sm font-semibold text-ink mb-2">Payment</h2>
            <PaymentMethods value={paymentMethod} onChange={setPaymentMethod} />
          </section>

          {err && <Toast message={err} />}

          <button
            type="button"
            onClick={() => void placeOrder()}
            disabled={busy}
            data-testid="checkout-submit"
            className="inline-flex items-center gap-2 bg-ink hover:bg-[#443c34] text-card rounded-lg px-5 py-2 text-sm font-medium active:scale-95 disabled:bg-line-strong disabled:cursor-not-allowed disabled:active:scale-100 transition-colors"
          >
            {busy ? 'Placing…' : `Place order · ${formatMoney(totalCents)}`}
          </button>
        </div>

        <aside className="lg:sticky lg:top-20 self-start">
          <section
            data-testid="checkout-summary"
            aria-label="Order summary"
            className="border border-line bg-card rounded-[10px] p-5 text-sm space-y-3"
          >
            <div className="border-b border-line pb-2 font-semibold text-ink">
              Order summary
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
              <dt className="border-t border-line pt-1.5 mt-1 font-semibold text-ink">
                Total
              </dt>
              <dd
                data-testid="checkout-summary-total"
                className="border-t border-line pt-1.5 mt-1 font-mono font-semibold text-ink text-right"
              >
                {formatMoney(totalCents)}
              </dd>
            </dl>
          </section>
        </aside>
      </div>
    </PageSection>
  );
}
