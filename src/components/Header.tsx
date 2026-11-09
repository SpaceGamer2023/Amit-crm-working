import React from 'react';
import { Search, Plus, Bell, Settings, Languages, Sun, Moon } from 'lucide-react';
import { useTranslation } from '../lib/i18n.tsx';
import { useTheme } from '../lib/theme.tsx';
import { getActiveCurrency, CURRENCIES } from '../lib/currency.ts';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenQuickAdd: (defaultType?: string) => void;
  onOpenSettings: () => void;
  dueTodayCount: number;
  onTriggerDesktopAlert: () => void;
  activeViewTitle: string;
  isSettingsActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenQuickAdd,
  onOpenSettings,
  dueTodayCount,
  onTriggerDesktopAlert,
  activeViewTitle,
  isSettingsActive = false,
}) => {
  const { t, language, toggleLanguage } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-13 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 px-4 flex items-center justify-between select-none shrink-0 z-20 transition-colors duration-150">
      {/* View title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{t.appName}</span>
          <span className="text-zinc-300 dark:text-zinc-600">•</span>
          <h1 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-tight">
            {activeViewTitle}
          </h1>
        </div>

      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 rounded-md transition-all group cursor-pointer shadow-xs"
          aria-label="Global search across all records"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
            <span className="truncate">{t.searchPlaceholder}</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-600 rounded shadow-2xs">
            {t.searchShortcut}
          </kbd>
        </button>
      </div>

      {/* Right: Theme Toggle, Language Switcher, Alerts & Settings */}
      <div className="flex items-center gap-2">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-md transition-colors cursor-pointer"
          title={isDark ? `${t.lightMode}` : `${t.darkMode}`}
          aria-label={isDark ? t.lightMode : t.darkMode}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-zinc-600" />
          )}
        </button>

        {/* Currency Indicator Button */}
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-md transition-colors cursor-pointer"
          title={`Currency: ${CURRENCIES[getActiveCurrency()]?.name} (Click to change)`}
        >
          <span className="text-sm font-bold">{CURRENCIES[getActiveCurrency()]?.symbol}</span>
          <span>{getActiveCurrency()}</span>
        </button>

        {/* Language Switcher Button (Hebrew <-> English) */}
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700/80 rounded-md transition-colors cursor-pointer"
          title={language === 'en' ? 'Switch to Hebrew (עברית)' : 'החלף לאנגלית (English)'}
        >
          <Languages className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>{language === 'en' ? 'עברית' : 'English'}</span>
        </button>

        <button
          onClick={onTriggerDesktopAlert}
          className="relative p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
          title={dueTodayCount > 0 ? `${dueTodayCount} ${t.dueSuffix} - ${t.desktopAlerts}` : t.desktopAlerts}
          aria-label="Desktop alert trigger"
        >
          <Bell className="w-4 h-4" />
          {dueTodayCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
          )}
        </button>

        {/* Prominent Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer border ${
            isSettingsActive
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-zinc-700/80'
          }`}
          title={`${t.settings} (${t.settingsShortcut})`}
          aria-label={t.settings}
        >
          <Settings className={`w-3.5 h-3.5 ${isSettingsActive ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'}`} />
          <span>{t.settings}</span>
          <kbd className={`hidden md:inline-block text-[9px] font-mono px-1 py-0.2 rounded border ${
            isSettingsActive
              ? 'bg-zinc-800 text-zinc-300 dark:bg-zinc-200 dark:text-zinc-800 border-zinc-700 dark:border-zinc-300'
              : 'bg-white dark:bg-zinc-700 text-zinc-400 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600'
          }`}>
            {t.settingsShortcut}
          </kbd>
        </button>

        <button
          onClick={() => onOpenQuickAdd()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.newRecord}</span>
        </button>
      </div>
    </header>
  );
};
