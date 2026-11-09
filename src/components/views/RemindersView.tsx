import React, { useState } from 'react';
import {
  CalendarCheck2,
  Plus,
  Bell,
  BellRing,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Users,
  Search,
} from 'lucide-react';
import { Reminder, Contact, categorizeReminders, Priority, PRIORITIES } from '../../lib/crmLogic.ts';
import { crmDb } from '../../db/crmDatabase.ts';
import { useTranslation } from '../../lib/i18n.tsx';

interface RemindersViewProps {
  reminders: Reminder[];
  contacts: Contact[];
  onDataChanged: () => void;
  onOpenQuickAdd: (type?: string) => void;
  onOpenContactDrawer: (contactId: string) => void;
  onTriggerDesktopAlert: () => void;
  notificationPermission: NotificationPermission | 'default';
  onRequestPermission: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  contacts,
  onDataChanged,
  onOpenQuickAdd,
  onOpenContactDrawer,
  onTriggerDesktopAlert,
  notificationPermission,
  onRequestPermission,
}) => {
  const { t, isRTL, language, getPriorityName } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [alertSuccessToast, setAlertSuccessToast] = useState<string | null>(null);

  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const filteredReminders = reminders.filter((r) => {
    const matchesSearch =
      !searchTerm.trim() ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.due_date.includes(searchTerm);
    const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const buckets = categorizeReminders(filteredReminders);

  const handleToggle = async (id: string, current: number) => {
    await crmDb.toggleReminderCompleted(id, current === 0);
    onDataChanged();
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`${t.deleteConfirm} "${title}"`)) {
      await crmDb.deleteReminder(id);
      onDataChanged();
    }
  };

  const handleTestAlert = () => {
    onTriggerDesktopAlert();
    setAlertSuccessToast(language === 'he' ? 'התראת שולחן עבודה נשלחה בהצלחה!' : 'Native desktop alert sent!');
    setTimeout(() => setAlertSuccessToast(null), 3500);
  };

  const renderReminderItem = (r: Reminder, statusClass?: string) => {
    const contact = r.contact_id ? contactMap.get(r.contact_id) : null;
    const isCompleted = Boolean(r.completed);

    return (
      <div
        key={r.id}
        className={`p-3 rounded-lg border bg-white dark:bg-[#18181b] flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all group ${
          statusClass || 'border-zinc-200 dark:border-zinc-700/80'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={() => handleToggle(r.id, r.completed)}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 focus:ring-0 cursor-pointer"
          />
          <div className="min-w-0">
            <span
              className={`font-medium block truncate ${
                isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {r.title}
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {contact && (
                <button
                  onClick={() => onOpenContactDrawer(contact.id)}
                  className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:underline"
                >
                  <Users className="w-3 h-3 text-zinc-400" />
                  <span>{contact.name}</span>
                </button>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>{r.due_date}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              r.priority === 'High'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : r.priority === 'Med'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {getPriorityName(r.priority)}
          </span>
          <button
            onClick={() => handleDelete(r.id, r.title)}
            className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.reminders}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {language === 'he' ? 'מעקב משימות אופליין מקומי עם התראות שולחן עבודה' : 'Native offline alert monitoring with instant SQLite synchronization'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={onRequestPermission}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{t.desktopAlerts}</span>
            </button>
          ) : (
            <button
              onClick={handleTestAlert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
              title="Test system desktop notification"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>{language === 'he' ? 'בדיקת התראה' : 'Test Desktop Alert'}</span>
            </button>
          )}

          <button
            onClick={() => onOpenQuickAdd('reminder')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addTask}</span>
          </button>
        </div>
      </div>

      {/* Alert toast notification */}
      {alertSuccessToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{alertSuccessToast}</span>
          </div>
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#202125] p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder={t.searchReminders}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">{language === 'he' ? 'עדיפות:' : 'Priority:'}</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-800 dark:text-zinc-200"
          >
            <option value="all">{language === 'he' ? 'הכל' : 'All'}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{getPriorityName(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 1: Overdue */}
      {buckets.overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t.overdue} ({buckets.overdue.length})</span>
          </div>
          <div className="space-y-2">
            {buckets.overdue.map((r) => renderReminderItem(r, 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'))}
          </div>
        </div>
      )}

      {/* Section 2: Due Today */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
          <CalendarCheck2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{t.dueToday} ({buckets.dueToday.length})</span>
        </div>
        {buckets.dueToday.length === 0 ? (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg text-xs text-zinc-400 dark:text-zinc-500 text-center">
            {language === 'he' ? 'אין משימות שממתינות להיום' : 'No pending tasks due today.'}
          </div>
        ) : (
          <div className="space-y-2">
            {buckets.dueToday.map((r) => renderReminderItem(r, 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20'))}
          </div>
        )}
      </div>

      {/* Section 3: Upcoming */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{language === 'he' ? 'בקרוב' : 'Upcoming'} ({buckets.upcoming.length})</span>
        </div>
        {buckets.upcoming.length === 0 ? (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg text-xs text-zinc-400 dark:text-zinc-500 text-center">
            {language === 'he' ? 'אין משימות מתוזמנות בהמשך' : 'No upcoming tasks scheduled.'}
          </div>
        ) : (
          <div className="space-y-2">
            {buckets.upcoming.map((r) => renderReminderItem(r))}
          </div>
        )}
      </div>

      {/* Section 4: Completed */}
      {buckets.completed.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-zinc-200/80 dark:border-zinc-700/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.completed} ({buckets.completed.length})</span>
          </div>
          <div className="space-y-2 opacity-75">
            {buckets.completed.map((r) => renderReminderItem(r, 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40'))}
          </div>
        </div>
      )}
    </div>
  );
};
