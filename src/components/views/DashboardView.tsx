import React, { useState } from 'react';
import {
  DollarSign,
  CalendarCheck2,
  AlertCircle,
  Building2,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  Plus,
  BarChart3,
  Flame,
  Sparkles,
} from 'lucide-react';
import {
  Deal,
  Reminder,
  Complaint,
  Contact,
  Company,
  Activity,
  calculatePipelineMetrics,
  categorizeReminders,
  calculateComplaintMetrics,
  formatCurrency,
  DEAL_STAGES,
  DealStage,
} from '../../lib/crmLogic.ts';
import { ActiveView } from '../Sidebar.tsx';
import { useTranslation } from '../../lib/i18n.tsx';
import { getCurrencySymbol } from '../../lib/currency.ts';

interface DashboardViewProps {
  deals: Deal[];
  reminders: Reminder[];
  complaints: Complaint[];
  contacts: Contact[];
  companies: Company[];
  activities: Activity[];
  onSelectView: (view: ActiveView) => void;
  onOpenQuickAdd: (type?: string) => void;
  onToggleReminder: (id: string, current: number) => void;
  onOpenContactDrawer: (contactId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  deals,
  reminders,
  complaints,
  contacts,
  companies,
  activities,
  onSelectView,
  onOpenQuickAdd,
  onToggleReminder,
  onOpenContactDrawer,
}) => {
  const { t, isRTL, language, getStageName, getActivityName, getPriorityName } = useTranslation();
  const [chartMetric, setChartMetric] = useState<'value' | 'count'>('value');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const pipelineMetrics = calculatePipelineMetrics(deals);
  const reminderBuckets = categorizeReminders(reminders);
  const complaintMetrics = calculateComplaintMetrics(complaints);

  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // Today's High-Priority Reminders (due today or overdue with High priority)
  const todayHighPriorityReminders = [...reminderBuckets.overdue, ...reminderBuckets.dueToday].filter(
    (r) => r.priority === 'High' && !r.completed
  );

  // Other today/overdue reminders (Med/Low) for secondary display
  const otherPendingReminders = [...reminderBuckets.overdue, ...reminderBuckets.dueToday].filter(
    (r) => r.priority !== 'High' && !r.completed
  );

  // Filtered recent activities
  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'all') return true;
    return act.type === activityFilter;
  });

  // Calculate maximum values for the Bar Chart scale
  const maxStageValue = Math.max(
    1,
    ...DEAL_STAGES.map((s) => pipelineMetrics.stageBreakdown[s]?.totalValue || 0)
  );
  const maxStageCount = Math.max(
    1,
    ...DEAL_STAGES.map((s) => pipelineMetrics.stageBreakdown[s]?.count || 0)
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Call':
        return <span className="text-indigo-600 dark:text-indigo-400 font-bold">☎</span>;
      case 'Email':
        return <span className="text-blue-600 dark:text-blue-400 font-bold">✉</span>;
      case 'Meeting':
        return <span className="text-emerald-600 dark:text-emerald-400 font-bold">📅</span>;
      case 'Note':
      default:
        return <span className="text-zinc-500 dark:text-zinc-400 font-bold">📝</span>;
    }
  };

  const getStageBarColor = (stage: DealStage) => {
    switch (stage) {
      case 'Lead':
        return 'bg-zinc-400 dark:bg-zinc-500 hover:bg-zinc-500';
      case 'Qualified':
        return 'bg-blue-500 dark:bg-blue-400 hover:bg-blue-600';
      case 'Proposal Needed':
        return 'bg-purple-500 dark:bg-purple-400 hover:bg-purple-600';
      case 'Proposal Sent':
        return 'bg-indigo-500 dark:bg-indigo-400 hover:bg-indigo-600';
      case 'Won':
        return 'bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-600';
      case 'Lost':
      default:
        return 'bg-rose-400 dark:bg-rose-500 hover:bg-rose-500';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.dashboardTitle}</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              {t.offlineStatus}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t.dashboardSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenQuickAdd('deal')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addDeal}</span>
          </button>
          <button
            onClick={() => onOpenQuickAdd('reminder')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>{t.addTask}</span>
          </button>
          <button
            onClick={() => onOpenQuickAdd('activity')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>{t.logActivity}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Pipeline Card */}
        <div
          onClick={() => onSelectView('deals')}
          className="p-4 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t.activePipelineValue}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {getCurrencySymbol()}
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {formatCurrency(pipelineMetrics.totalActiveValue)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span>{pipelineMetrics.activeDealsCount} {t.activeDealsCount}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(pipelineMetrics.wonValue)} {t.wonValue}</span>
          </div>
        </div>

        {/* Due Today Card with High-Priority Highlight */}
        <div
          onClick={() => onSelectView('reminders')}
          className={`p-4 rounded-xl border shadow-2xs transition-all cursor-pointer group ${
            todayHighPriorityReminders.length > 0
              ? 'bg-rose-50/40 dark:bg-rose-950/30 border-rose-200/90 dark:border-rose-800/80 hover:border-rose-300'
              : 'bg-white dark:bg-[#202125] border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t.tasksDueToday}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              todayHighPriorityReminders.length > 0
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}>
              {todayHighPriorityReminders.length > 0 ? (
                <Flame className="w-4 h-4 animate-pulse text-rose-600 dark:text-rose-400" />
              ) : (
                <CalendarCheck2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-baseline gap-2">
            <span>{reminderBuckets.dueToday.length}</span>
            {todayHighPriorityReminders.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300">
                {todayHighPriorityReminders.length} {t.priorityHigh}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span>{reminderBuckets.overdue.length} {t.overdue}</span>
            <span className="text-zinc-600 dark:text-zinc-300">{reminderBuckets.completed.length} {t.completed}</span>
          </div>
        </div>

        {/* Open Complaints Card */}
        <div
          onClick={() => onSelectView('complaints')}
          className="p-4 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t.openComplaints}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-baseline gap-2">
            <span>{complaintMetrics.openCount + complaintMetrics.inProgressCount}</span>
            {complaintMetrics.highSeverityUnresolved > 0 && (
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                ({complaintMetrics.highSeverityUnresolved} {t.priorityHigh})
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span>{complaintMetrics.inProgressCount} {t.inProgress}</span>
            <span className="text-emerald-600 dark:text-emerald-400">{complaintMetrics.resolvedCount} {t.resolved}</span>
          </div>
        </div>

        {/* Contacts & Directory Card */}
        <div
          onClick={() => onSelectView('contacts')}
          className="p-4 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t.clientDirectory}</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {contacts.length} {t.contacts}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span>{companies.length} {t.acrossCompanies}</span>
            <span className="text-zinc-600 dark:text-zinc-300">{pipelineMetrics.winRate}% {t.winRate}</span>
          </div>
        </div>
      </div>

      {/* WIDGET 1: Visual Representation of Deals by Stage (Bar Chart) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.pipelineByStage}</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.pipelineSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Metric View (Value $ vs Deal Count) */}
            <div className="flex items-center bg-zinc-100 dark:bg-[#18181b] p-0.5 rounded-lg text-xs font-medium border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                onClick={() => setChartMetric('value')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartMetric === 'value'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {t.valueMetric} ({getCurrencySymbol()})
              </button>
              <button
                onClick={() => setChartMetric('count')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartMetric === 'count'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {t.countMetric}
              </button>
            </div>

            <button
              onClick={() => onSelectView('deals')}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
            >
              <span>{t.kanbanBoard}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Visual Bar Chart or Clean Empty State */}
        {deals.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-zinc-50/70 dark:bg-[#18181b] border border-dashed border-zinc-300 dark:border-zinc-700 space-y-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {language === 'he' ? 'צנרת העסקאות נקייה ומוכנה' : 'Your sales pipeline is empty'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                {language === 'he'
                  ? 'המערכת פועלת באופן מקומי לחלוטין ללא נתוני דוגמה. לחץ על הכפתור מטה כדי להוסיף את העסקה הראשונה שלך.'
                  : 'All example data has been removed. Amit CRM is running 100% locally with SQLite. Add your first real deal below to start tracking your revenue.'}
              </p>
            </div>
            <button
              onClick={() => onOpenQuickAdd('deal')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addDeal}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
              {DEAL_STAGES.map((stage) => {
                const info = pipelineMetrics.stageBreakdown[stage];
                const value = info.totalValue;
                const count = info.count;
                const heightPercent =
                  chartMetric === 'value'
                    ? Math.max(12, Math.round((value / maxStageValue) * 100))
                    : Math.max(12, Math.round((count / maxStageCount) * 100));

                return (
                  <div
                    key={stage}
                    onClick={() => onSelectView('deals')}
                    className="flex flex-col items-center group cursor-pointer p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* Top Bar Label */}
                    <div className="text-center mb-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block tracking-tight">
                        {chartMetric === 'value' ? formatCurrency(value) : `${count} ${count === 1 ? t.dealSingular : t.dealPlural}`}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {chartMetric === 'value'
                          ? `${count} ${count === 1 ? t.dealSingular : t.dealPlural}`
                          : formatCurrency(value)}
                      </span>
                    </div>

                    {/* Vertical Bar Chart Graphic with Scale */}
                    <div className="w-full h-36 bg-zinc-100/80 dark:bg-[#18181b] rounded-lg flex items-end p-1.5 border border-zinc-200/60 dark:border-zinc-700/60 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-1/4 border-b border-zinc-200/40 dark:border-zinc-800" />
                      <div className="absolute inset-x-0 top-2/4 border-b border-zinc-200/40 dark:border-zinc-800" />
                      <div className="absolute inset-x-0 top-3/4 border-b border-zinc-200/40 dark:border-zinc-800" />

                      {/* Bar Pillar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-md transition-all duration-500 relative shadow-2xs ${getStageBarColor(
                          stage
                        )}`}
                      >
                        <div className="absolute inset-0 bg-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Stage Name */}
                    <div className="mt-2 text-center">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block truncate group-hover:text-zinc-950 dark:group-hover:text-white">
                        {getStageName(stage)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span>
                  {t.activePipelineSummary}: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(pipelineMetrics.totalActiveValue)}</strong>
                </span>
                <span>•</span>
                <span>
                  {t.wonDealsSummary}: <strong className="text-emerald-700 dark:text-emerald-400">{formatCurrency(pipelineMetrics.wonValue)}</strong>
                </span>
                <span>•</span>
                <span>
                  {t.winRate}: <strong className="text-zinc-800 dark:text-zinc-200">{pipelineMetrics.winRate}%</strong>
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{t.clickStageTip}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: Left (Recent Activities) + Right (Today's High-Priority Reminders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 2: Recent Activities Section */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.recentActivities}</h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.activitiesSubtitle}
                </p>
              </div>

              <button
                onClick={() => onOpenQuickAdd('activity')}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.logActivity}</span>
              </button>
            </div>

            {/* Activity Type Filters */}
            <div className="flex items-center gap-1 pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto text-xs">
              {[
                { id: 'all', label: t.allActivities },
                { id: 'Call', label: t.calls },
                { id: 'Email', label: t.emails },
                { id: 'Meeting', label: t.meetings },
                { id: 'Note', label: t.notes },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActivityFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                    activityFilter === f.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Activities Stream */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-xs space-y-2">
                  <Clock className="w-7 h-7 mx-auto text-zinc-300 dark:text-zinc-600" />
                  <p className="font-medium text-zinc-600 dark:text-zinc-400">{t.noActivities}</p>
                  <button
                    onClick={() => onOpenQuickAdd('activity')}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.logActivity}</span>
                  </button>
                </div>
              ) : (
                filteredActivities.slice(0, 6).map((act) => {
                  const contact = act.contact_id ? contactMap.get(act.contact_id) : null;
                  const company = contact?.company_id ? companyMap.get(contact.company_id) : null;

                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-[#18181b] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                        {getActivityIcon(act.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {getActivityName(act.type)}
                            </span>
                            {contact && (
                              <button
                                onClick={() => onOpenContactDrawer(contact.id)}
                                className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:underline truncate"
                              >
                                {t.withContact} {contact.name}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-medium">
                            {act.created_at}
                          </span>
                        </div>

                        {company && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                            <span>{company.name}</span>
                          </div>
                        )}

                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed line-clamp-2">
                          {act.notes}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{filteredActivities.length} {t.allActivities}</span>
            <button
              onClick={() => onSelectView('contacts')}
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>{t.viewTimelines}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* WIDGET 3: Today's High-Priority Reminders (Urgent Focus) */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#202125] border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.highPriorityReminders}</h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.highPrioritySubtitle}
                </p>
              </div>

              <button
                onClick={() => onOpenQuickAdd('reminder')}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addTask}</span>
              </button>
            </div>

            {/* List of High-Priority Reminders or Clean Zero State */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {todayHighPriorityReminders.length === 0 ? (
                <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl text-center space-y-2 my-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{t.zeroHighPriority}</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 max-w-xs mx-auto">
                    {t.zeroHighPriorityDesc}
                  </p>
                </div>
              ) : (
                todayHighPriorityReminders.map((rem) => {
                  const contact = rem.contact_id ? contactMap.get(rem.contact_id) : null;
                  const isOverdue = reminderBuckets.overdue.some((o) => o.id === rem.id);

                  return (
                    <div
                      key={rem.id}
                      className="p-3.5 rounded-xl border border-rose-200/90 dark:border-rose-900/80 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 transition-colors flex items-start gap-3 shadow-2xs group"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(rem.completed)}
                        onChange={() => onToggleReminder(rem.id, rem.completed)}
                        className="mt-0.5 w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-0 cursor-pointer"
                        title="Mark completed"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {rem.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                            {t.priorityHigh}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {contact ? (
                            <button
                              onClick={() => onOpenContactDrawer(contact.id)}
                              className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-medium hover:underline truncate"
                            >
                              <Users className="w-3 h-3 text-zinc-400" />
                              <span>{contact.name}</span>
                            </button>
                          ) : (
                            <span>{t.addTask}</span>
                          )}

                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {isOverdue ? `${t.overdue} (${rem.due_date})` : t.dueToday}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Other Due Tasks (Med/Low) if available */}
              {otherPendingReminders.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                    {t.otherDueTasks} ({otherPendingReminders.length})
                  </div>
                  <div className="space-y-2">
                    {otherPendingReminders.map((rem) => {
                      const contact = rem.contact_id ? contactMap.get(rem.contact_id) : null;
                      return (
                        <div
                          key={rem.id}
                          className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-[#18181b] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={Boolean(rem.completed)}
                              onChange={() => onToggleReminder(rem.id, rem.completed)}
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                            />
                            <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{rem.title}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            {contact && (
                              <button
                                onClick={() => onOpenContactDrawer(contact.id)}
                                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:underline hidden sm:inline"
                              >
                                {contact.name}
                              </button>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                                rem.priority === 'Med'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                              }`}
                            >
                              {getPriorityName(rem.priority)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {todayHighPriorityReminders.length} {t.priorityHigh} • {otherPendingReminders.length} {t.otherDueTasks}
            </span>
            <button
              onClick={() => onSelectView('reminders')}
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>{t.allRemindersLink} ({reminders.length})</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
