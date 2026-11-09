import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Building2,
  Users,
  Kanban,
  CalendarCheck2,
  AlertCircle,
  Settings,
  X,
  ArrowRight,
  Plus,
  CornerDownLeft,
} from 'lucide-react';
import {
  Company,
  Contact,
  Deal,
  Reminder,
  Complaint,
  searchAllRecords,
  SearchResultItem,
} from '../lib/crmLogic.ts';
import { useTranslation } from '../lib/i18n.tsx';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  reminders: Reminder[];
  complaints: Complaint[];
  onSelectResult: (item: SearchResultItem) => void;
  onQuickAdd: (type: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  companies,
  contacts,
  deals,
  reminders,
  complaints,
  onSelectResult,
  onQuickAdd,
}) => {
  const { t, isRTL, language, getStageName, getPriorityName } = useTranslation();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFilterType('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const rawResults = useMemo(() => {
    if (!query.trim()) {
      const sampleCompanies = companies.slice(0, 3).map((c) => ({
        id: c.id,
        type: 'company' as const,
        title: c.name,
        subtitle: c.industry || (language === 'he' ? 'חברה' : 'Company'),
        badge: language === 'he' ? 'חברה' : 'Company',
        metadata: c.website,
        raw: c,
      }));
      const sampleContacts = contacts.slice(0, 3).map((ct) => ({
        id: ct.id,
        type: 'contact' as const,
        title: ct.name,
        subtitle: ct.role || (language === 'he' ? 'איש קשר' : 'Contact'),
        badge: language === 'he' ? 'איש קשר' : 'Contact',
        metadata: ct.email,
        raw: ct,
      }));
      const sampleDeals = deals.slice(0, 3).map((d) => ({
        id: d.id,
        type: 'deal' as const,
        title: d.title,
        subtitle: `$${d.value.toLocaleString()} • ${getStageName(d.stage)}`,
        badge: getStageName(d.stage),
        metadata: d.close_date,
        raw: d,
      }));
      const sampleReminders = reminders.slice(0, 3).map((r) => ({
        id: r.id,
        type: 'reminder' as const,
        title: r.title,
        subtitle: `${t.dueToday}: ${r.due_date}`,
        badge: getPriorityName(r.priority),
        metadata: r.completed ? t.completed : t.inProgress,
        raw: r,
      }));

      const settingsItem: SearchResultItem = {
        id: 'settings-hub',
        type: 'settings',
        title: t.allSettings,
        subtitle: t.allSettingsSubtitle,
        badge: t.settings,
        metadata: t.settingsShortcut,
        raw: {},
      };

      return [...sampleDeals, ...sampleContacts, ...sampleCompanies, ...sampleReminders, settingsItem];
    }

    const matches = searchAllRecords(query, {
      companies,
      contacts,
      deals,
      reminders,
      complaints,
    });

    const q = query.toLowerCase();
    if (
      'settings'.includes(q) ||
      'preferences'.includes(q) ||
      'backup'.includes(q) ||
      'database'.includes(q) ||
      'הגדרות'.includes(q) ||
      'גיבוי'.includes(q) ||
      'שפה'.includes(q)
    ) {
      matches.unshift({
        id: 'settings-hub',
        type: 'settings',
        title: t.allSettings,
        subtitle: t.allSettingsSubtitle,
        badge: t.settings,
        metadata: t.settingsShortcut,
        raw: {},
      });
    }

    return matches;
  }, [query, companies, contacts, deals, reminders, complaints, language, t, getStageName, getPriorityName]);

  const filteredResults = useMemo(() => {
    if (filterType === 'all') return rawResults;
    return rawResults.filter((r) => r.type === filterType);
  }, [rawResults, filterType]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          onSelectResult(filteredResults[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onSelectResult, onClose]);

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case 'contact':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'deal':
        return <Kanban className="w-4 h-4 text-blue-500" />;
      case 'reminder':
        return <CalendarCheck2 className="w-4 h-4 text-amber-500" />;
      case 'complaint':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-purple-600" />;
      default:
        return <Search className="w-4 h-4 text-zinc-400" />;
    }
  };

  const categories = [
    { id: 'all', label: language === 'he' ? 'הכל' : 'All' },
    { id: 'deal', label: t.deals },
    { id: 'contact', label: t.contacts },
    { id: 'company', label: t.companies },
    { id: 'reminder', label: t.reminders },
    { id: 'complaint', label: t.complaints },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#202125] rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col transition-colors duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Input Bar */}
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-700/80 flex items-center gap-3 bg-white dark:bg-[#202125]">
          <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t.searchPlaceholder}
            className="flex-1 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-transparent outline-hidden border-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-3 py-2 bg-zinc-50 dark:bg-[#18181b] border-b border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-1.5 overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setFilterType(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                filterType === cat.id
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 p-1">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Search className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm font-medium text-zinc-700">
                {language === 'he' ? `לא נמצאו רשומות עבור "${query}"` : `No records found matching "${query}"`}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {language === 'he' ? 'נסה מונח חיפוש אחר או הוסף רשומה חדשה' : 'Try another search term or create a new record below'}
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectResult(item);
                    onClose();
                  }}
                  className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center shrink-0">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ltr:ml-4 rtl:mr-4">
                    {item.metadata && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline-block truncate max-w-[140px]">
                        {item.metadata}
                      </span>
                    )}
                    <span className={`p-1 rounded text-zinc-400 dark:text-zinc-500 ${isSelected ? 'text-zinc-700 dark:text-zinc-200' : 'opacity-0'}`}>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Quick-Action Shortcuts */}
        <div className="p-3 bg-zinc-50/90 dark:bg-[#18181b] border-t border-zinc-200 dark:border-zinc-700/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 ltr:mr-1 rtl:ml-1">{t.quickAdd}:</span>
            <button
              onClick={() => {
                onClose();
                onQuickAdd('deal');
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-blue-500" />
              <span>{t.deals}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onQuickAdd('contact');
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-emerald-500" />
              <span>{t.contacts}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onQuickAdd('reminder');
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-amber-500" />
              <span>{t.reminders}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onQuickAdd('company');
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-indigo-500" />
              <span>{t.companies}</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
            <span>↑↓</span>
            <span>↵</span>
            <span>esc</span>
          </div>
        </div>
      </div>
    </div>
  );
};
