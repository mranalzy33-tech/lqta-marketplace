// Single source of truth for the platform's currency and locale-aware
// formatting. Change CURRENCY_CODE (and, if ever needed, the locale map)
// here — never hardcode a currency string or a bare "ar-SA"/"en-SA" locale
// tag in a page or component.
export const CURRENCY_CODE = "YER" as const;

// Locale tags used for both currency formatting and generic number/date
// formatting so the digit grouping and calendar conventions match the
// platform's actual market (Yemen) rather than a leftover default.
export const NUMBER_LOCALE = { ar: "ar-YE", en: "en-YE" } as const;

export function getNumberLocale(language: "ar" | "en") {
  return NUMBER_LOCALE[language];
}

export function formatCurrency(amount: number, language: "ar" | "en", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(getNumberLocale(language), { style: "currency", currency: CURRENCY_CODE, maximumFractionDigits: 0, ...options }).format(amount);
}
