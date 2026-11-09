import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrencyAmount,
  getCurrencySymbol,
  CURRENCIES,
  CurrencyCode,
} from './currency.ts';

test('formatCurrencyAmount formats Israeli Shekels (₪) properly', () => {
  const formatted = formatCurrencyAmount(25000, 'ILS');
  assert.ok(formatted.includes('₪'), `Expected shekel symbol, got: ${formatted}`);
  assert.ok(formatted.includes('25,000') || formatted.includes('25000'), `Expected formatted number, got: ${formatted}`);
});

test('formatCurrencyAmount formats US Dollars ($)', () => {
  const formatted = formatCurrencyAmount(50000, 'USD');
  assert.ok(formatted.includes('$'), `Expected dollar symbol, got: ${formatted}`);
  assert.ok(formatted.includes('50,000'), `Expected formatted 50,000, got: ${formatted}`);
});

test('formatCurrencyAmount formats Euro (€) and British Pound (£)', () => {
  const euro = formatCurrencyAmount(12000, 'EUR');
  assert.ok(euro.includes('€'));
  const pound = formatCurrencyAmount(8500, 'GBP');
  assert.ok(pound.includes('£'));
});

test('getCurrencySymbol returns proper symbols for all supported codes', () => {
  assert.equal(getCurrencySymbol('ILS'), '₪');
  assert.equal(getCurrencySymbol('USD'), '$');
  assert.equal(getCurrencySymbol('EUR'), '€');
  assert.equal(getCurrencySymbol('GBP'), '£');
});

test('CURRENCIES definition contains all 4 currencies with Hebrew and English names', () => {
  const keys: CurrencyCode[] = ['ILS', 'USD', 'EUR', 'GBP'];
  for (const k of keys) {
    assert.ok(CURRENCIES[k]);
    assert.ok(CURRENCIES[k].symbol);
    assert.ok(CURRENCIES[k].hebrewName);
    assert.ok(CURRENCIES[k].name);
  }
});
