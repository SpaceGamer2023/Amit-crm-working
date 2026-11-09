import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Building2,
  Users,
  Kanban,
  CalendarCheck2,
  AlertCircle,
  FileText,
  Check,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Plus,
} from 'lucide-react';
import {
  Company,
  Contact,
  DealStage,
  DEAL_STAGES,
  ComplaintStatus,
  COMPLAINT_STATUSES,
  Severity,
  SEVERITIES,
  Priority,
  PRIORITIES,
  ActivityType,
  ACTIVITY_TYPES,
  formatCurrency,
  CurrencyCode,
  CURRENCIES,
  getCurrencySymbol,
  getActiveCurrency,
} from '../lib/crmLogic.ts';
import { crmDb } from '../db/crmDatabase.ts';
import { useTranslation } from '../lib/i18n.tsx';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: string;
  companies: Company[];
  contacts: Contact[];
  onSuccess: () => void;
  preselectedContactId?: string;
}

const toLocalDateTimeValue = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'deal',
  companies,
  contacts,
  onSuccess,
  preselectedContactId,
}) => {
  const closeDateInputRef = useRef<HTMLInputElement>(null);
  const { t, isRTL, language, getStageName, getPriorityName, getStatusName, getActivityName, getSeverityName } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState({ name: '', industry: '', website: '', phone: '' });
  const [contactForm, setContactForm] = useState({ company_id: '', name: '', email: '', phone: '', role: '' });
  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    stage: 'Lead' as DealStage,
    company_id: '',
    contact_id: preselectedContactId || '',
    close_date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 14);
      date.setHours(17, 0, 0, 0);
      return toLocalDateTimeValue(date);
    })(),
    currency: getActiveCurrency(),
  });
  const [reminderForm, setReminderForm] = useState({
    title: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'Med' as Priority,
    contact_id: preselectedContactId || '',
  });
  const [complaintForm, setComplaintForm] = useState({
    title: '',
    status: 'Open' as ComplaintStatus,
    severity: 'Med' as Severity,
    description: '',
    contact_id: preselectedContactId || '',
  });
  const [activityForm, setActivityForm] = useState({
    type: 'Call' as ActivityType,
    notes: '',
    contact_id: preselectedContactId || '',
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultType);
      setError(null);
      if (preselectedContactId) {
        setDealForm((prev) => ({ ...prev, contact_id: preselectedContactId }));
        setReminderForm((prev) => ({ ...prev, contact_id: preselectedContactId }));
        setComplaintForm((prev) => ({ ...prev, contact_id: preselectedContactId }));
        setActivityForm((prev) => ({ ...prev, contact_id: preselectedContactId }));
      }
    }
  }, [isOpen, defaultType, preselectedContactId]);

  // Relative date label helper
  const getRelativeDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const target = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      const diffTime = targetDay.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const formatted = target.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      if (diffDays === 0) return language === 'he' ? `היום (${formatted})` : `Today (${formatted})`;
      if (diffDays === 1) return language === 'he' ? `מחר (${formatted})` : `Tomorrow (${formatted})`;
      if (diffDays > 1) {
        return language === 'he'
          ? `בעוד ${diffDays} ימים (${formatted})`
          : `In ${diffDays} days (${formatted})`;
      }
      return language === 'he'
        ? `באיחור של ${Math.abs(diffDays)} ימים (${formatted})`
        : `${Math.abs(diffDays)} days overdue (${formatted})`;
    } catch {
      return dateStr;
    }
  };

  const setReminderDateOffset = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    setReminderForm((prev) => ({ ...prev, due_date: d.toISOString().split('T')[0] }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'company') {
        if (!companyForm.name.trim()) throw new Error(language === 'he' ? 'שם החברה הוא שדה חובה' : 'Company name is required');
        await crmDb.saveCompany(companyForm);
      } else if (activeTab === 'contact') {
        if (!contactForm.name.trim()) throw new Error(language === 'he' ? 'שם איש הקשר הוא שדה חובה' : 'Contact name is required');
        await crmDb.saveContact(contactForm);
      } else if (activeTab === 'deal') {
        if (!dealForm.title.trim()) throw new Error(language === 'he' ? 'כותרת העסקה היא שדה חובה' : 'Deal title is required');
        const val = parseFloat(dealForm.value);
        if (isNaN(val) || val < 0) throw new Error(language === 'he' ? 'שווי עסקה חוקי נדרש' : 'Valid deal value is required');
        await crmDb.saveDeal({
          title: dealForm.title,
          value: val,
          stage: dealForm.stage,
          company_id: dealForm.company_id || undefined,
          contact_id: dealForm.contact_id || undefined,
          close_date: dealForm.close_date || undefined,
          currency: dealForm.currency || getActiveCurrency(),
        });
      } else if (activeTab === 'reminder') {
        if (!reminderForm.title.trim()) throw new Error(language === 'he' ? 'כותרת המשימה היא שדה חובה' : 'Reminder title is required');
        if (!reminderForm.due_date) throw new Error(language === 'he' ? 'תאריך יעד הוא שדה חובה' : 'Due date is required');
        await crmDb.saveReminder({
          title: reminderForm.title,
          due_date: reminderForm.due_date,
          priority: reminderForm.priority,
          contact_id: reminderForm.contact_id || undefined,
          completed: 0,
        });
      } else if (activeTab === 'complaint') {
        if (!complaintForm.title.trim()) throw new Error(language === 'he' ? 'כותרת הפנייה היא שדה חובה' : 'Complaint title is required');
        await crmDb.saveComplaint({
          title: complaintForm.title,
          status: complaintForm.status,
          severity: complaintForm.severity,
          description: complaintForm.description || undefined,
          contact_id: complaintForm.contact_id || undefined,
        });
      } else if (activeTab === 'activity') {
        if (!activityForm.notes.trim()) throw new Error(language === 'he' ? 'פרטי הפעילות הם שדה חובה' : 'Activity notes are required');
        await crmDb.saveActivity({
          type: activityForm.type,
          notes: activityForm.notes,
          contact_id: activityForm.contact_id || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not save this record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'deal', label: t.deals, icon: Kanban },
    { id: 'contact', label: t.contacts, icon: Users },
    { id: 'reminder', label: t.reminders, icon: CalendarCheck2 },
    { id: 'company', label: t.companies, icon: Building2 },
    { id: 'complaint', label: t.complaints, icon: AlertCircle },
    { id: 'activity', label: t.recentActivities, icon: FileText },
  ];

  // Stage theme colors
  const stageStyles: Record<DealStage, { bg: string; border: string; text: string; dot: string }> = {
    Lead: { bg: 'bg-zinc-100 dark:bg-zinc-800', border: 'border-zinc-300 dark:border-zinc-600', text: 'text-zinc-800 dark:text-zinc-200', dot: 'bg-zinc-400' },
    Qualified: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
    'Proposal Needed': { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-300', dot: 'bg-purple-500' },
    'Proposal Sent': { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-800 dark:text-indigo-300', dot: 'bg-indigo-500' },
    Won: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    Lost: { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-800 dark:text-rose-300', dot: 'bg-rose-500' },
  };

  const parsedDealValue = parseFloat(dealForm.value);
  const formattedDealValue = !isNaN(parsedDealValue) && parsedDealValue >= 0 ? formatCurrency(parsedDealValue, dealForm.currency) : null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#202125] rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col my-8 transition-colors duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-[#1a1b1e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Plus className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t.newRecord}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200/90 dark:border-zinc-700/80 bg-zinc-100/70 dark:bg-[#18181b] px-3 pt-2 gap-1.5 overflow-x-auto text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium text-xs transition-all cursor-pointer border-b-2 shrink-0 ${
                  isActive
                    ? 'border-blue-600 dark:border-blue-400 bg-white dark:bg-[#202125] text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Deal Form */}
          {activeTab === 'deal' && (
            <div className="space-y-4">
              {/* Deal Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'כותרת העסקה *' : 'Deal Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'he' ? 'לדוגמה: שדרוג תשתיות ענן שנתי' : 'e.g. Enterprise Cloud Annual Subscription'}
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Currency Type Selector */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1b1f] border border-zinc-200/90 dark:border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">¤</span>
                    <span>{t.currencyType} *</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/70 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {language === 'he' ? CURRENCIES[dealForm.currency]?.hebrewName : CURRENCIES[dealForm.currency]?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['ILS', 'USD', 'EUR', 'GBP'] as CurrencyCode[]).map((cCode) => {
                    const cfg = CURRENCIES[cCode];
                    const isSelected = dealForm.currency === cCode;
                    return (
                      <button
                        key={cCode}
                        type="button"
                        onClick={() => setDealForm({ ...dealForm, currency: cCode })}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-600 dark:border-blue-400 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-2xs'
                            : 'bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base font-bold text-blue-600 dark:text-blue-400 shrink-0">{cfg.symbol}</span>
                          <span className="truncate">{cCode}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price / Value Field with Live Formatted Badge & Presets */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1b1f] border border-zinc-200/90 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'he' ? `שווי העסקה (${getCurrencySymbol(dealForm.currency)}) *` : `Deal Value (${getCurrencySymbol(dealForm.currency)}) *`}</span>
                  </label>
                  {formattedDealValue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <Check className="w-3 h-3" />
                      <span>{formattedDealValue}</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 ltr:left-0 rtl:right-0 flex items-center ltr:pl-3 rtl:pr-3 text-zinc-500 dark:text-zinc-400 font-bold text-base pointer-events-none">
                    {getCurrencySymbol(dealForm.currency)}
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    placeholder="25000"
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full ltr:pl-9 rtl:pr-9 pr-3 py-2 text-sm font-semibold rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Quick Price Increment Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ltr:mr-1 rtl:ml-1">
                    {language === 'he' ? 'בחירה מהירה:' : 'Quick Select:'}
                  </span>
                  {['5000', '15000', '25000', '50000', '100000'].map((val) => {
                    const isCurrent = dealForm.value === val;
                    const sym = getCurrencySymbol(dealForm.currency);
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setDealForm({ ...dealForm, value: val })}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {sym}{parseInt(val).toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deal Stage Interactive Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'שלב בעסקה (בחר שלב פעיל) *' : 'Deal Stage (Click to select) *'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEAL_STAGES.map((s) => {
                    const isSelected = dealForm.stage === s;
                    const style = stageStyles[s];
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setDealForm({ ...dealForm, stage: s })}
                        className={`p-2 rounded-lg border text-left rtl:text-right flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-blue-600 dark:ring-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50/90 dark:bg-blue-950/60 shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-[#1a1b1f]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
                          <span className={`text-xs font-medium truncate ${isSelected ? 'font-bold text-blue-900 dark:text-blue-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {getStageName(s)}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected Close Date and Time */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1b1f] border border-zinc-200/90 dark:border-zinc-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'he' ? 'תאריך סגירה צפוי *' : 'Expected Close Date *'}</span>
                  </label>
                  {dealForm.close_date && (
                    <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/70 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 truncate max-w-[220px]">
                      {getRelativeDateLabel(dealForm.close_date)}
                    </span>
                  )}
                </div>

                <input
                  ref={closeDateInputRef}
                  type="datetime-local"
                  value={dealForm.close_date}
                  onChange={(e) => setDealForm({ ...dealForm, close_date: e.target.value })}
                  onClick={() => {
                    try {
                      closeDateInputRef.current?.showPicker();
                    } catch {
                      // The browser may not expose showPicker; the native input remains usable.
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Company & Contact Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{t.colCompany}</span>
                  </label>
                  <select
                    value={dealForm.company_id}
                    onChange={(e) => setDealForm({ ...dealForm, company_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">{language === 'he' ? 'בחר חברה (אופציונלי)' : 'Select Company (optional)'}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{t.colContact}</span>
                  </label>
                  <select
                    value={dealForm.contact_id}
                    onChange={(e) => setDealForm({ ...dealForm, contact_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">{language === 'he' ? 'בחר איש קשר (אופציונלי)' : 'Select Contact (optional)'}</option>
                    {contacts.map((ct) => (
                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Contact Form */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'שם מלא *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'he' ? 'לדוגמה: יונתן כהן' : 'e.g. Jonathan Cohen'}
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {t.colCompany}
                  </label>
                  <select
                    value={contactForm.company_id}
                    onChange={(e) => setContactForm({ ...contactForm, company_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">{language === 'he' ? 'עצמאי / ללא חברה' : 'None / Independent'}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {t.colRole}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'he' ? 'סמנכ"ל טכנולוגיות' : 'e.g. VP of Engineering'}
                    value={contactForm.role}
                    onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {t.colEmail}
                  </label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {t.colPhone}
                  </label>
                  <input
                    type="tel"
                    placeholder="+972-50-555-0199"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reminder / Task Form */}
          {activeTab === 'reminder' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'כותרת המשימה *' : 'Task Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'he' ? 'לדוגמה: שיחת מעקב לגבי הצעת המחיר' : 'e.g. Follow-up on pricing proposal'}
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Due Date with relative chip */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1a1b1f] border border-zinc-200/90 dark:border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>{language === 'he' ? 'תאריך יעד *' : 'Due Date *'}</span>
                  </label>
                  {reminderForm.due_date && (
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/70 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {getRelativeDateLabel(reminderForm.due_date)}
                    </span>
                  )}
                </div>

                <input
                  type="date"
                  required
                  value={reminderForm.due_date}
                  onChange={(e) => setReminderForm({ ...reminderForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReminderDateOffset(0)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {language === 'he' ? 'היום' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderDateOffset(1)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {language === 'he' ? 'מחר' : 'Tomorrow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderDateOffset(3)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {language === 'he' ? '+3 ימים' : '+3 Days'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderDateOffset(7)}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {language === 'he' ? '+שבוע' : '+1 Week'}
                  </button>
                </div>
              </div>

              {/* Priority Visual Buttons */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'עדיפות המשימה' : 'Priority Level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => {
                    const isSelected = reminderForm.priority === p;
                    const colors = {
                      High: 'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 ring-rose-500',
                      Med: 'border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 ring-amber-500',
                      Low: 'border-zinc-300 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 ring-zinc-500',
                    }[p];
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setReminderForm({ ...reminderForm, priority: p })}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? `ring-2 ${colors} font-bold shadow-xs`
                            : 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#1a1b1f] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{getPriorityName(p)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{t.colContact}</span>
                </label>
                <select
                  value={reminderForm.contact_id}
                  onChange={(e) => setReminderForm({ ...reminderForm, contact_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">{language === 'he' ? 'ללא איש קשר (כללי)' : 'None / General Task'}</option>
                  {contacts.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Company Form */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'שם החברה *' : 'Company Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'he' ? 'לדוגמה: אלתא מערכות' : 'e.g. Acme Corporation'}
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {t.colIndustry}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'he' ? 'תוכנה / הייטק' : 'Software / Cloud'}
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {t.colPhone}
                  </label>
                  <input
                    type="tel"
                    placeholder="+972-3-555-0100"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {t.colWebsite}
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Complaint / Ticket Form */}
          {activeTab === 'complaint' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'נושא הפנייה *' : 'Ticket Subject *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'he' ? 'לדוגמה: תקלת חיבור ב-API' : 'e.g. Gateway Connection Timeout'}
                  value={complaintForm.title}
                  onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {language === 'he' ? 'סטטוס טיפול' : 'Ticket Status'}
                  </label>
                  <select
                    value={complaintForm.status}
                    onChange={(e) => setComplaintForm({ ...complaintForm, status: e.target.value as ComplaintStatus })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {COMPLAINT_STATUSES.map((s) => (
                      <option key={s} value={s}>{getStatusName(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    {language === 'he' ? 'חומרה' : 'Severity'}
                  </label>
                  <select
                    value={complaintForm.severity}
                    onChange={(e) => setComplaintForm({ ...complaintForm, severity: e.target.value as Severity })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {SEVERITIES.map((sev) => (
                      <option key={sev} value={sev}>{getSeverityName(sev)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'איש קשר משויך' : 'Associated Contact'}
                </label>
                <select
                  value={complaintForm.contact_id}
                  onChange={(e) => setComplaintForm({ ...complaintForm, contact_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">{language === 'he' ? 'ללא איש קשר' : 'None / Unassigned'}</option>
                  {contacts.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'תיאור התקלה / פנייה' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  placeholder={language === 'he' ? 'פרט את מהות הפנייה או התקלה שדווחה...' : 'Detail the complaint or technical bug reported...'}
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Activity Form */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'סוג הפעילות' : 'Activity Type'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACTIVITY_TYPES.map((type) => {
                    const isSelected = activityForm.type === type;
                    const icons = {
                      Call: Phone,
                      Email: Mail,
                      Meeting: Calendar,
                      Note: FileText,
                    }[type];
                    const IconComp = icons;
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setActivityForm({ ...activityForm, type })}
                        className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-blue-600 dark:ring-blue-400 border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-bold shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-[#1a1b1f] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{getActivityName(type)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {t.colContact}
                </label>
                <select
                  value={activityForm.contact_id}
                  onChange={(e) => setActivityForm({ ...activityForm, contact_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">{language === 'he' ? 'ללא איש קשר' : 'None / General'}</option>
                  {contacts.map((ct) => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  {language === 'he' ? 'הערות וסיכום הפעילות *' : 'Activity Notes & Summary *'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={language === 'he' ? 'מה נדון או סוכם בפעילות זו...' : 'What was discussed or executed in this activity...'}
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-650 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t.saving : t.createRecord}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
