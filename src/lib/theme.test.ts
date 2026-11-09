import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveInitialTheme,
  toggleThemeMode,
  applyThemeClass,
  THEME_STORAGE_KEY,
} from './theme.ts';

test('resolveInitialTheme resolves stored values and system fallbacks', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
  assert.equal(resolveInitialTheme('invalid', false), 'light');
  assert.equal(resolveInitialTheme('invalid', true), 'dark');
});

test('toggleThemeMode alternates between light and dark', () => {
  assert.equal(toggleThemeMode('light'), 'dark');
  assert.equal(toggleThemeMode('dark'), 'light');
});

test('applyThemeClass toggles dark class on element', () => {
  const classes = new Set<string>();
  const mockElement = {
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      toggle: (c: string, force?: boolean) => {
        if (force === true) {
          classes.add(c);
          return true;
        } else if (force === false) {
          classes.delete(c);
          return false;
        }
        if (classes.has(c)) {
          classes.delete(c);
          return false;
        }
        classes.add(c);
        return true;
      },
    },
  };

  applyThemeClass(mockElement, 'dark');
  assert.equal(classes.has('dark'), true);

  applyThemeClass(mockElement, 'light');
  assert.equal(classes.has('dark'), false);
});

test('THEME_STORAGE_KEY is consistent', () => {
  assert.equal(THEME_STORAGE_KEY, 'amit_crm_theme');
});
