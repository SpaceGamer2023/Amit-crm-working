import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Building2,
  AlertCircle,
  CalendarCheck2,
  Settings,
  Plus,
  Command,
} from 'lucide-react';
import { useTranslation } from '../lib/i18n.tsx';

export type ActiveView = 'dashboard' | 'deals' | 'contacts' | 'companies' | 'complaints' | 'reminders' | 'settings';

interface SidebarProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenQuickAdd: (defaultType?: string) => void;
  onOpenSearch: () => void;
  counts: {
    deals: number;
    contacts: number;
    companies: number;
    openComplaints: number;
    dueTodayReminders: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenQuickAdd,
  onOpenSearch,
  counts,
}) => {
  const { t, isRTL } = useTranslation();

  const navItems = [
    {
      id: 'dashboard' as ActiveView,
      label: t.dashboard,
      icon: LayoutDashboard,
      badge: counts.dueTodayReminders > 0 ? `${counts.dueTodayReminders} ${t.dueSuffix}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'deals' as ActiveView,
      label: t.deals,
      icon: Kanban,
      badge: `${counts.deals}`,
      badgeColor: 'bg-zinc-100 text-zinc-600',
    },
    {
      id: 'contacts' as ActiveView,
      label: t.contacts,
      icon: Users,
      badge: `${counts.contacts}`,
      badgeColor: 'bg-zinc-100 text-zinc-600',
    },
    {
      id: 'companies' as ActiveView,
      label: t.companies,
      icon: Building2,
      badge: `${counts.companies}`,
      badgeColor: 'bg-zinc-100 text-zinc-600',
    },
    {
      id: 'complaints' as ActiveView,
      label: t.complaints,
      icon: AlertCircle,
      badge: counts.openComplaints > 0 ? `${counts.openComplaints}` : undefined,
      badgeColor: counts.openComplaints > 0 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-600',
    },
    {
      id: 'reminders' as ActiveView,
      label: t.reminders,
      icon: CalendarCheck2,
      badge: counts.dueTodayReminders > 0 ? `${counts.dueTodayReminders}` : undefined,
      badgeColor: counts.dueTodayReminders > 0 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600',
    },
  ];

  return (
    <aside className={`w-56 bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between select-none shrink-0 text-zinc-700 dark:text-zinc-300 transition-colors duration-150 ${
      isRTL ? 'border-l' : 'border-r'
    }`}>
      {/* Top: Workspace Branding */}
      <div className="p-3">
        <div className="flex items-center gap-3 px-2 py-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-blue-500/20">
            A
          </div>
          <h2 className="flex-1 min-w-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{t.appName}</h2>
        </div>

        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-md mb-3 shadow-2xs transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>{t.searchRecords}</span>
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{t.searchShortcut}</span>
        </button>

        {/* Main Navigation */}
        <div className="space-y-0.5">
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
            {t.workspace}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-semibold shadow-2xs border border-blue-100 dark:border-blue-900/60'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200'
                      : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Quick Add & Settings */}
      <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800 space-y-1">
        <button
          onClick={() => onOpenQuickAdd()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.quickAdd}</span>
        </button>

        <button
          onClick={() => onSelectView('settings')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            currentView === 'settings'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-semibold shadow-2xs border border-blue-100 dark:border-blue-900/60'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
          }`}
          title={`${t.settings} (${t.settingsShortcut})`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Settings className={`w-4 h-4 shrink-0 ${currentView === 'settings' ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-400 dark:text-zinc-500'}`} />
            <span className="truncate">{t.settings}</span>
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{t.settingsShortcut}</span>
        </button>
      </div>
    </aside>
  );
};
