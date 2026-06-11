import { formatMoney as contractFormatMoney } from '@qa/contracts';
import type { Locale } from '@qa/contracts';

export function formatMoney(priceCents: number, locale: Locale): string {
  return contractFormatMoney(priceCents, locale);
}
