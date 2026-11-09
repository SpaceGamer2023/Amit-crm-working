import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Terminal,
  AlertCircle,
  ShieldCheck,
  Languages,
  Bell,
  Sliders,
  Check,
  Cpu,
  Trash2,
  Sun,
  Moon,
  Copy,
  FolderDown,
  DollarSign,
  Volume2,
  Clock,
  GitBranch,
  ExternalLink,
  HelpCircle,
  PackageCheck,
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
  playNotificationChime,
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
  onTriggerDesktopAlert?: () => void;
}

type SettingsTab = 'general' | 'desktop' | 'notifications' | 'database' | 'sql';

export const SettingsView: React.FC<SettingsViewProps> = ({
  counts,
  onDataChanged,
  notificationPermission = 'default',
  onRequestPermission,
  onTriggerDesktopAlert,
}) => {
  const { t, isRTL, language, setLanguage } = useTranslation();
  const { isDark, setTheme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM deals LIMIT 10');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
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

  const handleRunQuery = async () => {
    setIsRunning(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const db = await crmDb.getDb();
      if (sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
        const rows = await db.select(sqlQuery);
        setQueryResult(rows);
      } else {
        const res = await db.execute(sqlQuery);
        setQueryResult([{ rowsAffected: res.rowsAffected, lastInsertId: res.lastInsertId }]);
        onDataChanged();
      }
    } catch (e: any) {
      setQueryError(e.message || 'SQL execution failed');
    } finally {
      setIsRunning(false);
    }
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
        engine: 'tauri-plugin-sql-sqlite',
        database: 'sqlite:crm.db',
        data: { companies, contacts, deals, reminders, complaints, activities },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amit_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showStatus(isRTL ? 'גיבוי SQLite מקומי הורד בהצלחה.' : 'Local SQLite backup downloaded successfully.');
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
    if (confirm(isRTL ? 'האם אתה בטוח שברצונך למחוק את כל הנתונים במסד הנתונים המקומי? פעולה זו אינה ניתנת לביטול.' : 'Are you sure you want to delete ALL data from the local SQLite database? This cannot be undone.')) {
      await crmDb.clearAllData();
      onDataChanged();
      showStatus(isRTL ? 'כל הנתונים נמחקו. מסד הנתונים המקומי ריק.' : 'All data cleared. Local database is empty.');
    }
  };

  const handleSeedSampleData = async () => {
    if (confirm(isRTL ? 'לטעון נתוני הדגמה למסד הנתונים?' : 'Load sample demo data into local database?')) {
      await crmDb.seedInitialData();
      onDataChanged();
      showStatus(isRTL ? 'נתוני הדגמה נטענו בהצלחה.' : 'Sample data loaded successfully.');
    }
  };

  const copyBuildCommand = () => {
    navigator.clipboard.writeText('npm run tauri:build');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const gitCommandsText = `git init
git add .
git commit -m "Amit CRM initial release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/amit-crm.git
git push -u origin main`;

  const copyGitCommands = () => {
    navigator.clipboard.writeText(gitCommandsText);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 2500);
  };

  const downloadProjectZip = () => {
    const a = document.createElement('a');
    a.href = '/amit-crm-source.zip';
    a.download = 'amit-crm-source.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showStatus(language === 'he' ? 'הורדת קובץ הפרויקט המלא (ZIP) החלה.' : 'Downloading full project source ZIP...');
  };

  const downloadBuildBat = () => {
    const batContent = `@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================================
echo        Amit CRM - Windows .EXE Desktop Builder
echo ========================================================
echo.

if not exist "package.json" (
    echo [ERROR] package.json NOT FOUND IN THIS DIRECTORY!
    echo Current folder: %CD%
    echo.
    echo It looks like you downloaded only 'build-exe.bat' without the project files.
    echo To compile Amit CRM into an .EXE locally, this file must reside inside the
    echo project root directory alongside package.json, src\\, and src-tauri\\.
    echo.
    echo HOW TO FIX:
    echo 1. In Amit CRM Settings, click "Download Complete Project (ZIP)".
    echo 2. Extract that ZIP into this folder: %CD%
    echo 3. Run build-exe.bat again!
    echo.
    echo OR USE THE RECOMMENDED 100%% FREE GITHUB ACTIONS BUILDER:
    echo You don't need to install Node or Rust on your PC!
    echo See Settings > Desktop Executable (.exe).
    echo.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ (v20+ LTS).
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Rust / Cargo was not found in your PATH.
    echo Tauri requires the Rust toolchain to compile native Windows .exe.
    echo.
    echo 1. Install Rust: https://rustup.rs/
    echo 2. Install "Desktop development with C++" via Visual Studio Installer.
    echo.
    set /p CONTINUE="Try building anyway? (y/n): "
    if /i "!CONTINUE!" neq "y" exit /b 1
)

echo [1/3] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b %errorlevel%
)

echo [2/3] Compiling React frontend with Vite...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)

echo [3/3] Compiling Tauri v2 Windows .EXE with local SQLite...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo [ERROR] Tauri build failed. Check the error output above.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   SUCCESS! Amit CRM .exe has been successfully built!
echo ========================================================
echo.
echo Executable location:
echo   src-tauri\\target\\release\\bundle\\nsis\\
echo.
pause
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-exe.bat';
    a.click();
    URL.revokeObjectURL(url);
    showStatus(isRTL ? 'קובץ build-exe.bat הורד.' : 'build-exe.bat downloaded.');
  };

  const handleTestTaskAlert = async () => {
    const title = language === 'he' ? '📋 משימה לדוגמה שממתינה להיום' : '📋 Sample Task Due Today';
    const body = language === 'he'
      ? 'שיחת מעקב חשובה עם לקוח מתוכננת להיום [עדיפות גבוהה].'
      : 'Important client follow-up scheduled for today [High Priority].';
    await sendDesktopAlert(title, body, 'reminder');
    showStatus(language === 'he' ? 'התראת משימה נשלחה בהצלחה!' : 'Task notification sent!');
  };

  const handleTestDealAlert = async () => {
    const sym = CURRENCIES[selectedCurrency].symbol;
    const title = language === 'he' ? '💼 יעד סגירת עסקה מתקרב!' : '💼 Upcoming Deal Close Date!';
    const body = language === 'he'
      ? `העסקה "מערכת ניהול ענן" (${sym}75,000) מתוכננת להיסגר בעוד יומיים.`
      : `Deal "Enterprise Cloud Suite" (${sym}75,000) is scheduled to close in 2 days.`;
    await sendDesktopAlert(title, body, 'deal');
    showStatus(language === 'he' ? 'התראת מועד עסקה נשלחה בהצלחה!' : 'Deal alert sent!');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.allSettings}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.allSettingsSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% Offline • Local SQLite</span>
          </span>
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
      <div className="flex border-b border-zinc-200/90 dark:border-zinc-700/80 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{t.generalSettings}</span>
        </button>

        <button
          onClick={() => setActiveTab('desktop')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'desktop'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Desktop Executable (.exe)</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t.notificationSettings}</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'database'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>{t.databaseTab}</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sql'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>{t.sqlConsoleTab}</span>
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

      {/* Tab 2: Desktop .EXE & GitHub Guide */}
      {activeTab === 'desktop' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Explanation Callout for the ENOENT Error */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{language === 'he' ? 'פתרון לשגיאת npm error enoent Could not read package.json' : 'Fix for "npm error enoent Could not read package.json"'}</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {language === 'he'
                ? 'שגיאה זו מתרחשת כאשר מורידים רק את הקובץ build-exe.bat לבדו. סקריפט בנייה של Node/Tauri חייב להימצא בתוך תיקיית הפרויקט המלאה שבה נמצאים package.json ו-src-tauri. יש לך 2 דרכים קלות להפעיל זאת:'
                : 'This error occurs when only "build-exe.bat" is downloaded by itself into a folder. A Node/Tauri builder script requires the complete project folder containing package.json and src-tauri. Below are the 2 easiest solutions:'}
            </p>
          </div>

          {/* Solution 1: Download Complete Project ZIP */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'he' ? 'דרך 1: הורדת כל קובצי הפרויקט (ZIP) לבנייה במחשב שלך' : 'Option 1: Download Complete Project ZIP (Local Build)'}</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {language === 'he'
                    ? 'הורד ארכיון ZIP של כל הפרויקט (כולל package.json, src, src-tauri ו-build-exe.bat), חלץ אותו והרץ את build-exe.bat.'
                    : 'Download the entire project source ZIP archive (all 52 files), extract into your folder, and double-click build-exe.bat.'}
                </p>
              </div>

              <button
                onClick={downloadProjectZip}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'he' ? 'הורד פרויקט מלא (ZIP)' : 'Download Complete Project (ZIP)'}</span>
              </button>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-[#18181b] rounded-lg border border-zinc-200/70 dark:border-zinc-700/70 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">{language === 'he' ? 'הוראות חילוץ:' : 'Extraction Steps:'}</div>
              <ol className="list-decimal ltr:pl-5 rtl:pr-5 space-y-0.5 text-[11px]">
                <li>{language === 'he' ? 'לחץ על "הורד פרויקט מלא (ZIP)"' : 'Click "Download Complete Project (ZIP)" above.'}</li>
                <li>{language === 'he' ? 'פתח את הקובץ amit-crm-source.zip וחלץ את כל תוכנו לתיקייה שלך (למשל C:\\Users\\liorl\\Downloads\\Utility\\Amit CRM)' : 'Extract amit-crm-source.zip into your folder (e.g. C:\\Users\\liorl\\Downloads\\Utility\\Amit CRM).'}</li>
                <li>{language === 'he' ? 'וודא ש-package.json נמצא באותה תיקייה לצד build-exe.bat' : 'Ensure package.json is now in the same folder as build-exe.bat.'}</li>
                <li>{language === 'he' ? 'הרץ שוב את build-exe.bat בלחיצה כפולה!' : 'Double-click build-exe.bat to build!'}</li>
              </ol>
            </div>
          </div>

          {/* Solution 2: Recommended 100% Free Private GitHub Actions Cloud Builder */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-blue-200/80 dark:border-blue-800/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-blue-500" />
                    <span>{language === 'he' ? 'דרך 2 (מומלצת ביותר): בנייה אוטומטית ב-GitHub פרטי ללא צורך בהתקנות' : 'Option 2 (Recommended): Free Private GitHub Actions Builder'}</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    Zero PC Setup
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {language === 'he'
                    ? 'אתה לא צריך להתקין Rust, Cargo או כלי C++ במחשב שלך! העלה את הפרויקט ל-GitHub בריפו פרטי (רק אתה רואה), ושרתי GitHub יקמפלו את ה-EXE בחינם תוך 3 דקות.'
                    : 'You do NOT need to install Rust or Visual Studio C++ on your PC! Push this code to a 100% Private GitHub repository and GitHub Actions will compile the Windows .EXE for you in ~3 minutes.'}
                </p>
              </div>
            </div>

            {/* Step-by-Step GitHub Guide */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                  <span>{language === 'he' ? 'צור מאגר פרטי חדש ב-GitHub' : 'Create a New Private Repository on GitHub'}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                  {language === 'he'
                    ? 'גש אל github.com/new, תן למאגר שם (למשל amit-crm) וסמן אותו כ-Private (פרטי לחלוטין).'
                    : 'Go to https://github.com/new, name it "amit-crm", and make sure to select "Private".'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>{language === 'he' ? 'העלאת הקוד ל-GitHub' : 'Push the Code to GitHub'}</span>
                  </div>
                  <button
                    onClick={copyGitCommands}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedGit ? (language === 'he' ? 'הועתק!' : 'Copied!') : (language === 'he' ? 'העתק פקודות' : 'Copy Commands')}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto whitespace-pre select-all">
                  {gitCommandsText}
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {language === 'he'
                    ? 'לחילופין: תוכל להשתמש בתוכנת GitHub Desktop – פשוט גרור את התיקייה שחילצת מ-amit-crm-source.zip ולחץ Publish Repository.'
                    : 'Alternatively, use GitHub Desktop: drag & drop the extracted folder and click "Publish Repository".'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">3</span>
                  <span>{language === 'he' ? 'הורדת קובץ ה-EXE המוכן מלשונית Actions' : 'Download the Compiled EXE from GitHub Actions'}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                  {language === 'he'
                    ? 'במאגר שלך ב-GitHub, לחץ על הלשונית "Actions". תראה את משימת "Build Windows Executable (.exe)" רצה. לאחר כ-3 דקות יופיע וי ירוק. לחץ עליה, ובתחתית העמוד תחת Artifacts תמצא את Amit-CRM-Windows-EXE להורדה מיידית!'
                    : 'In your GitHub repository, click the "Actions" tab. The workflow runs automatically. Once complete (green check in ~3 mins), click the build, and scroll down to Artifacts to download Amit-CRM-Windows-EXE!'}
                </p>
              </div>
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

              {/* Toggle 2: Audio Chime */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.soundChime}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {language === 'he' ? 'השמעת צליל עדין ונעים בעת הגעת התראה חדשה' : 'Plays a subtle pleasant tone when an alert is triggered'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifSettings.soundEnabled}
                  onChange={(e) => {
                    handleUpdateNotifSettings({ soundEnabled: e.target.checked });
                    if (e.target.checked) playNotificationChime();
                  }}
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

      {/* Tab 4: Local SQLite Database & Clean Data */}
      {activeTab === 'database' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connection: sqlite:crm.db</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.offlineStatus} • 100% Offline Local Engine
                  </p>
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

      {/* Tab 5: Raw SQL Console */}
      {activeTab === 'sql' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-zinc-500" />
                <span>Execute SQL Statement (sqlite:crm.db)</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSqlQuery('SELECT * FROM deals')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  deals
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT * FROM contacts')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  contacts
                </button>
                <button
                  onClick={() => setSqlQuery('SELECT * FROM reminders')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                >
                  reminders
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
              placeholder="SELECT * FROM deals"
            />

            <div className="flex justify-end">
              <button
                onClick={handleRunQuery}
                disabled={isRunning || !sqlQuery.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span>Execute SQL</span>
              </button>
            </div>
          </div>

          {/* Results table */}
          {queryResult && (
            <div className="p-4 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs overflow-hidden">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Results ({queryResult.length} rows):
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <pre className="text-[11px] font-mono p-3 bg-zinc-50 dark:bg-[#18181b] text-zinc-800 dark:text-zinc-200 rounded-lg">
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {queryError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{queryError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
