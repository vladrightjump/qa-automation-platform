'use client';

import type { PromoCode, PromoPreview } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import TextInput from '@/components/ui/TextInput';

interface PromoPanelProps {
  promo: PromoPreview | null;
  promoInput: string;
  promoErr: string | null;
  deals: PromoCode[] | null;
  subtotalCents: number;
  onPromoInputChange: (next: string) => void;
  onApply: (code?: string) => void;
  onRemove: () => void;
}

export default function PromoPanel({
  promo,
  promoInput,
  promoErr,
  deals,
  subtotalCents,
  onPromoInputChange,
  onApply,
  onRemove,
}: PromoPanelProps) {
  const { formatMoney } = useLocale();

  return (
    <>
      {!promo && deals && deals.length > 0 && (
        <div
          className="border border-line rounded-lg p-4 bg-paper-deep"
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
                      className="text-xs text-ink-faint"
                    >
                      Spend {formatMoney(d.minSpendCents)} to unlock
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApply(d.code)}
                      data-testid={`promo-deal-apply-${d.code}`}
                      className="px-2 py-0.5 border border-line-strong rounded-md text-xs text-ink hover:bg-card"
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

      <div className="border border-line rounded-lg p-4 bg-paper-deep">
        <label className="text-sm font-medium">Promo code</label>
        {promo ? (
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span
              data-testid="checkout-promo-applied"
              className="text-sage-500 font-mono"
            >
              {promo.code} (-{formatMoney(promo.discountCents)})
            </span>
            <button
              type="button"
              onClick={onRemove}
              data-testid="checkout-promo-remove"
              className="text-clay-600 hover:underline"
            >
              remove
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <TextInput
              value={promoInput}
              onChange={(e) => onPromoInputChange(e.target.value.toUpperCase())}
              data-testid="checkout-promo-input"
              placeholder="WELCOME10"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => onApply()}
              data-testid="checkout-promo-apply"
              className="px-3 py-2 border border-line-strong rounded-lg text-sm text-ink hover:bg-paper-deep"
            >
              Apply
            </button>
          </div>
        )}
        {promoErr && (
          <span
            data-testid="checkout-promo-error"
            className="block mt-1 text-[13px] text-danger-500"
          >
            {promoErr}
          </span>
        )}
      </div>
    </>
  );
}
