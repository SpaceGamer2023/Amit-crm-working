import test from 'node:test';
import assert from 'node:assert/strict';
import { translations, Language } from './i18n.tsx';

test('translations object contains full matching keys for both en and he', () => {
  const enKeys = Object.keys(translations.en).sort();
  const heKeys = Object.keys(translations.he).sort();

  assert.deepEqual(enKeys, heKeys, 'Both English and Hebrew dictionaries must have exact matching keys');

  // Verify key translations
  assert.equal(translations.en.appName, 'Amit CRM');
  assert.equal(translations.he.appName, 'עמית CRM');

  assert.equal(translations.en.deals, 'Deals');
  assert.equal(translations.he.deals, 'עסקאות');

  assert.equal(translations.en.stageWon, 'Won');
  assert.equal(translations.he.stageWon, 'זכייה');

  assert.equal(translations.en.stageProposalSent, 'Proposal Sent');
  assert.equal(translations.he.stageProposalSent, 'הצעה נשלחה');

  assert.equal(translations.en.highPriorityReminders, "Today's High-Priority Reminders");
  assert.equal(translations.he.highPriorityReminders, 'תזכורות דחופות להיום (עדיפות גבוהה)');

  assert.equal(translations.en.settings, 'Settings');
  assert.equal(translations.he.settings, 'הגדרות');

  assert.equal(translations.en.darkMode, 'Dark Mode');
  assert.equal(translations.he.darkMode, 'מצב כהה');

  assert.equal(translations.en.lightMode, 'Light Mode');
  assert.equal(translations.he.lightMode, 'מצב בהיר');
});
