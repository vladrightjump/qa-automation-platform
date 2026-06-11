'use client';

import { SUPPORTED_LOCALES, type Locale } from '@qa/contracts';
import { useLocale } from '@/lib/i18n';

export default function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
      <span className="sr-only">{t('locale.label')}</span>
      <select
        data-testid="locale-switcher"
        aria-label={t('locale.label')}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-card text-ink-soft border border-line-strong rounded-md px-2 py-1 text-xs focus:outline-none focus:border-clay-500 transition-colors"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l} data-testid={`locale-option-${l}`}>
            {t(`locale.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
