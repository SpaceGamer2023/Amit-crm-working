export type CurrencyCode = 'ILS' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  hebrewName: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel (₪)', hebrewName: 'שקל ישראלי חדש (₪)' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', hebrewName: 'דולר ארה"ב ($)' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', hebrewName: 'אירו (€)' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)', hebrewName: 'ליש"ט בריטי (£)' },
};

export const CURRENCY_STORAGE_KEY = 'amit_crm_currency';

export function getActiveCurrency(): CurrencyCode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode;
    if (saved && CURRENCIES[saved]) {
      return saved;
    }
  }
  return 'ILS'; // Default to Israeli Shekels as requested
}

export function setActiveCurrency(code: CurrencyCode): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent('amit_crm_currency_change', { detail: code }));
  }
}

export function formatCurrencyAmount(amount: number, code?: CurrencyCode | string): string {
  const currency = (code || getActiveCurrency()) as CurrencyCode;
  const num = Number(amount || 0);

  switch (currency) {
    case 'ILS':
      return `₪${num.toLocaleString('he-IL')}`;
    case 'EUR':
      return `€${num.toLocaleString('de-DE')}`;
    case 'GBP':
      return `£${num.toLocaleString('en-GB')}`;
    case 'USD':
    default:
      return `$${num.toLocaleString('en-US')}`;
  }
}

export function getCurrencySymbol(code?: CurrencyCode | string): string {
  const currency = (code || getActiveCurrency()) as CurrencyCode;
  return CURRENCIES[currency]?.symbol || '₪';
}
