import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  Languages,
  Bell,
  Sliders,
  Check,
  Trash2,
  Sun,
  Moon,
  DollarSign,
  Clock,
} from 'lucide-react';
import { crmDb } from '../../db/crmDatabase.ts';
import { useTranslation } from '../../lib/i18n.tsx';
import { useTheme } from '../../lib/theme.tsx';
import {
  CurrencyCode,
  CURRENCIES,
  getActiveCurrency,
  setActiveCurrency,
} from '../../lib/currency.ts';
import {
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  sendDesktopAlert,
} from '../../lib/notificationService.ts';

interface SettingsViewProps {
  counts: {
    companies: number;
    contacts: number;
    deals: number;
    reminders: number;
    complaints: number;
    activities: number;
  };
  onDataChanged: () => void;
  notificationPermission?: NotificationPermission | 'default';
  onRequestPermission?: () => void;
}

type SettingsTab = 'general' | 'notifications' | 'database';

export const SettingsView: React.FC<SettingsViewProps> = ({
  counts,
  onDataChanged,
  notificationPermission = 'default',
  onRequestPermission,
}) => {
  const { t, isRTL, language, setLanguage } = useTranslation();
  const { isDark, setTheme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Currency State
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(getActiveCurrency());

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings());

  useEffect(() => {
    setSelectedCurrency(getActiveCurrency());
    setNotifSettings(getNotificationSettings());
  }, []);

  const handleCurrencyChange = (c: CurrencyCode) => {
    setSelectedCurrency(c);
    setActiveCurrency(c);
    showStatus(language === 'he' ? `מטבע ברירת המחדל עודכן ל-${CURRENCIES[c].hebrewName}` : `Default currency updated to ${CURRENCIES[c].name}`);
    onDataChanged();
  };

  const handleUpdateNotifSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...notifSettings, ...newSettings };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleExportBackup = async () => {
    try {
      const db = await crmDb.getDb();
      const companies = await db.select('SELECT * FROM companies');
      const contacts = await db.select('SELECT * FROM contacts');
      const deals = await db.select('SELECT * FROM deals');
      const reminders = await db.select('SELECT * FROM reminders');
      const complaints = await db.select('SELECT * FROM complaints');
      const activities = await db.select('SELECT * FROM activities');

      const backup = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: { companies, contacts, deals, reminders, complaints, activities },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amit_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showStatus(isRTL ? 'הגיבוי הורד בהצלחה.' : 'Backup downloaded successfully.');
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);

        if (!backup.data) {
          throw new Error('Invalid backup file format');
        }

        const db = await crmDb.getDb();
        await db.execute('DELETE FROM deals');
        await db.execute('DELETE FROM reminders');
        await db.execute('DELETE FROM complaints');
        await db.execute('DELETE FROM activities');
        await db.execute('DELETE FROM contacts');
        await db.execute('DELETE FROM companies');

        for (const c of backup.data.companies || []) {
          await db.execute(
            'INSERT INTO companies (id, name, industry, website, phone) VALUES (?, ?, ?, ?, ?)',
            [c.id, c.name, c.industry || '', c.website || '', c.phone || '']
          );
        }
        for (const ct of backup.data.contacts || []) {
          await db.execute(
            'INSERT INTO contacts (id, company_id, name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
            [ct.id, ct.company_id || '', ct.name, ct.email || '', ct.phone || '', ct.role || '']
          );
        }
        for (const d of backup.data.deals || []) {
          await db.execute(
            'INSERT INTO deals (id, contact_id, company_id, title, value, stage, close_date, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [d.id, d.contact_id || '', d.company_id || '', d.title, d.value, d.stage, d.close_date || '', d.currency || 'ILS']
          );
        }
        for (const r of backup.data.reminders || []) {
          await db.execute(
            'INSERT INTO reminders (id, contact_id, title, due_date, completed, priority) VALUES (?, ?, ?, ?, ?, ?)',
            [r.id, r.contact_id || '', r.title, r.due_date, r.completed ? 1 : 0, r.priority]
          );
        }
        for (const cp of backup.data.complaints || []) {
          await db.execute(
            'INSERT INTO complaints (id, contact_id, title, status, severity, description) VALUES (?, ?, ?, ?, ?, ?)',
            [cp.id, cp.contact_id || '', cp.title, cp.status, cp.severity, cp.description || '']
          );
        }
        for (const a of backup.data.activities || []) {
          await db.execute(
            'INSERT INTO activities (id, contact_id, type, notes, created_at) VALUES (?, ?, ?, ?, ?)',
            [a.id, a.contact_id || '', a.type, a.notes, a.created_at]
          );
        }

        onDataChanged();
        showStatus(t.restoreSuccess);
      } catch (err: any) {
        alert(t.restoreError + ': ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllRecords = async () => {
    if (confirm(isRTL ? 'למחוק את כל הרשומות? לא ניתן לבטל פעולה זו.' : 'Delete all CRM records? This action cannot be undone.')) {
      await crmDb.clearAllData();
      onDataChanged();
      showStatus(isRTL ? 'כל הרשומות נמחקו.' : 'All CRM records were deleted.');
    }
  };

  const handleSeedSampleData = async () => {
    if (confirm(isRTL ? 'לטעון נתוני הדגמה?' : 'Load sample demo data?')) {
      await crmDb.seedInitialData();
      onDataChanged();
      showStatus(isRTL ? 'נתוני הדגמה נטענו בהצלחה.' : 'Sample data loaded successfully.');
    }
  };


  const handleTestTaskAlert = async () => {
    const title = language === 'he' ? '📋 משימה לדוגמה שממתינה להיום' : '📋 Sample Task Due Today';
    const body = language === 'he'
      ? 'שיחת מעקב חשובה עם לקוח מתוכננת להיום [עדיפות גבוהה].'
      : 'Important client follow-up scheduled for today [High Priority].';
    await sendDesktopAlert(title, body);
    showStatus(language === 'he' ? 'התראת משימה נשלחה בהצלחה!' : 'Task notification sent!');
  };

  const handleTestDealAlert = async () => {
    const sym = CURRENCIES[selectedCurrency].symbol;
    const title = language === 'he' ? '💼 יעד סגירת עסקה מתקרב!' : '💼 Upcoming Deal Close Date!';
    const body = language === 'he'
      ? `העסקה "מערכת ניהול ענן" (${sym}75,000) מתוכננת להיסגר בעוד יומיים.`
      : `Deal "Enterprise Cloud Suite" (${sym}75,000) is scheduled to close in 2 days.`;
    await sendDesktopAlert(title, body);
    showStatus(language === 'he' ? 'התראת מועד עסקה נשלחה בהצלחה!' : 'Deal alert sent!');
  };

  const tabClass = (tab: SettingsTab) => `flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
    activeTab === tab
      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700'
      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white/70 dark:hover:bg-zinc-800/60'
  }`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm ring-1 ring-blue-500/20">
            <Settings className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.allSettings}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.allSettingsSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Global Status Toast */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="inline-flex max-w-full flex-wrap gap-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5">
        <button
          onClick={() => setActiveTab('general')}
          className={tabClass('general')}
        >
          <Sliders className="w-4 h-4" />
          <span>{t.generalSettings}</span>
        </button>



        <button onClick={() => setActiveTab('notifications')} className={tabClass('notifications')}>
          <Bell className="w-4 h-4" />
          <span>{t.notificationSettings}</span>
        </button>

        <button onClick={() => setActiveTab('database')} className={tabClass('database')}>
          <HardDrive className="w-4 h-4" />
          <span>{t.databaseTab}</span>
        </button>


      </div>

      {/* Tab 1: General Preferences */}
      {activeTab === 'general' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Currency Preference Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.currencyPreference}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {language === 'he'
                    ? 'בחר את מטבע ברירת המחדל להצגת שווי עסקאות, צנרת מכירות וגרפים (כולל תמיכה מלאה בשקל ישראלי חדש ₪)'
                    : 'Choose your default currency for pipeline revenue, deal values, and metrics (supports Israeli Shekel ₪, USD $, EUR €, GBP £)'}
                </p>
              </div>
              <span className="text-sm font-bold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {CURRENCIES[selectedCurrency].symbol} {selectedCurrency}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {(['ILS', 'USD', 'EUR', 'GBP'] as CurrencyCode[]).map((cCode) => {
                const cfg = CURRENCIES[cCode];
                const isSelected = selectedCurrency === cCode;
                return (
                  <button
                    key={cCode}
                    onClick={() => handleCurrencyChange(cCode)}
                    className={`p-3.5 rounded-xl border text-left rtl:text-right flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-base text-zinc-800 dark:text-zinc-100">
                        {cfg.symbol}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{cCode}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {language === 'he' ? cfg.hebrewName : cfg.name}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Selector Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>{t.appearance}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.themeDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  !isDark
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-600'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-[#18181b]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.lightMode}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.lightModeDesc}</div>
                  </div>
                </div>
                {!isDark && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  isDark
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-600'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-[#18181b]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.darkMode}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.darkModeDesc}</div>
                  </div>
                </div>
                {isDark && <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
              </button>
            </div>
          </div>

          {/* Language Selector Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <span>{t.languagePreference}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isRTL
                    ? 'החלף שפה בקלות בין עברית לאנגלית עם התאמת כיווניות RTL/LTR מלאה'
                    : 'Switch display language between English and Hebrew with full RTL/LTR layout alignment'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                  language === 'en'
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-600'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-[#18181b]'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">English (LTR)</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Left-to-right CRM layout</div>
                </div>
                {language === 'en' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
              </button>

              <button
                onClick={() => setLanguage('he')}
                className={`p-4 rounded-xl border text-right flex items-start justify-between transition-all cursor-pointer ${
                  language === 'he'
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-600'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-[#18181b]'
                }`}
              >
                <div className="w-full">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">עברית (RTL)</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">ממשק מיושר מימין לשמאל</div>
                </div>
                {language === 'he' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tab 3: Desktop Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-5">
            {/* Header & Permission Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/70 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  <span>{t.notificationSettings}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {language === 'he'
                    ? 'התראות שולחן עבודה אוטומטיות על משימות להיום, משימות באיחור ועסקאות שמועד סגירתן מתקרב'
                    : 'Automated desktop OS notifications for due tasks, overdue reminders, and imminent deal close dates'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : notificationPermission === 'denied'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {isRTL ? 'הרשאה: ' : 'Permission: '}
                  {notificationPermission}
                </span>

                {onRequestPermission && notificationPermission !== 'granted' && (
                  <button
                    onClick={onRequestPermission}
                    className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                  >
                    {t.enableNotifications}
                  </button>
                )}
              </div>
            </div>

            {/* Notification Rules & Toggles */}
            <div className="space-y-3">
              {/* Toggle 1: Background Monitoring */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t.automatedMonitoring}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {language === 'he' ? 'בדיקה אוטומטית ברקע של מועדי משימות ועסקאות כל 60 שניות' : 'Checks due tasks and closing deals every 60 seconds in the background'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.enabled}
                  onChange={(e) => handleUpdateNotifSettings({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Toggle 3: Tasks Due Today */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.taskDueAlert}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {language === 'he' ? 'התראה על משימות שממתינות לביצוע להיום ועל משימות שעברו את תאריך היעד' : 'Alerts when reminders are due today or overdue'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.notifyTasksDueToday}
                  onChange={(e) => handleUpdateNotifSettings({ notifyTasksDueToday: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Toggle 4: Deal Closing Notifications */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.dealClosingAlert}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {language === 'he' ? 'התראה מראש על עסקאות פעילות שמתקרבות לתאריך הסגירה המשוער' : 'Alerts when active deals reach their expected close date'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.notifyDealsClosingSoon}
                    onChange={(e) => handleUpdateNotifSettings({ notifyDealsClosingSoon: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Lead Days Selector */}
                {notifSettings.notifyDealsClosingSoon && (
                  <div className="flex items-center gap-2 pt-1 text-xs border-t border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">{t.notificationLeadDays}:</span>
                    <select
                      value={notifSettings.dealLeadDays}
                      onChange={(e) => handleUpdateNotifSettings({ dealLeadDays: parseInt(e.target.value) || 3 })}
                      className="px-2.5 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-800 dark:text-zinc-200"
                    >
                      <option value={1}>{language === 'he' ? 'יום אחד מראש' : '1 day in advance'}</option>
                      <option value={2}>{language === 'he' ? 'יומיים מראש' : '2 days in advance'}</option>
                      <option value={3}>{language === 'he' ? '3 ימים מראש' : '3 days in advance'}</option>
                      <option value={7}>{language === 'he' ? 'שבוע מראש (7 ימים)' : '7 days in advance'}</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Test Trigger Buttons */}
            <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800 flex flex-wrap gap-2.5">
              <button
                onClick={handleTestTaskAlert}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'he' ? 'בדוק התראת משימה' : 'Test Task Alert'}</span>
              </button>

              <button
                onClick={handleTestDealAlert}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'he' ? 'בדוק התראת מועד עסקה' : 'Test Deal Alert'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data & Backups */}
      {activeTab === 'database' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200/80 dark:border-blue-900/70">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{language === 'he' ? 'נתוני ה-CRM' : 'CRM data'}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{language === 'he' ? 'ייצוא גיבוי או שחזור נתונים' : 'Export a backup or restore your records'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Export Backup */}
                <button
                  onClick={handleExportBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>{t.exportBackup}</span>
                </button>

                {/* Import / Restore Backup */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>{t.importBackup}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>

            {/* Table Record Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">{t.companies}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{counts.companies}</div>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">{t.contacts}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{counts.contacts}</div>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">{t.deals}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{counts.deals}</div>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">{t.reminders}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{counts.reminders}</div>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">{t.complaints}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{counts.complaints}</div>
              </div>
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">{t.timelineTab}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{counts.activities}</div>
              </div>
            </div>

            {/* Clean Data Controls */}
            <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {language === 'he' ? 'ניהול רשומות ואיפוס' : 'Record Management & Cleanup'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {language === 'he'
                    ? 'כל נתוני ההדגמה הוסרו. תוכל לאפס את מסד הנתונים או לטעון נתוני הדגמה לבדיקה.'
                    : 'All example records removed. Reset database completely or reload sample testing data.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSeedSampleData}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {language === 'he' ? 'טען נתוני הדגמה' : 'Load Sample Data'}
                </button>
                <button
                  onClick={handleClearAllRecords}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'he' ? 'מחק את כל הרשומות' : 'Clear All Records'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
