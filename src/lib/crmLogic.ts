export type DealStage = 'Lead' | 'Qualified' | 'Proposal Needed' | 'Proposal Sent' | 'Won' | 'Lost';
export const DEAL_STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal Needed', 'Proposal Sent', 'Won', 'Lost'];

export type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved';
export const COMPLAINT_STATUSES: ComplaintStatus[] = ['Open', 'In Progress', 'Resolved'];

export type Severity = 'Low' | 'Med' | 'High';
export const SEVERITIES: Severity[] = ['Low', 'Med', 'High'];

export type Priority = 'Low' | 'Med' | 'High';
export const PRIORITIES: Priority[] = ['Low', 'Med', 'High'];

export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Note';
export const ACTIVITY_TYPES: ActivityType[] = ['Call', 'Email', 'Meeting', 'Note'];

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
}

export interface Contact {
  id: string;
  company_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

import { CURRENCIES, formatCurrencyAmount, getCurrencySymbol, getActiveCurrency } from './currency.ts';
import type { CurrencyCode } from './currency.ts';
export type { CurrencyCode };
export { CURRENCIES, formatCurrencyAmount, getCurrencySymbol, getActiveCurrency };

export interface Deal {
  id: string;
  contact_id?: string;
  company_id?: string;
  title: string;
  value: number;
  stage: DealStage;
  close_date?: string;
  currency?: CurrencyCode;
}

export interface Reminder {
  id: string;
  contact_id?: string;
  title: string;
  due_date: string;
  completed: number; // 0 or 1
  priority: Priority;
}

export interface Complaint {
  id: string;
  contact_id?: string;
  title: string;
  status: ComplaintStatus;
  severity: Severity;
  description?: string;
}

export interface Activity {
  id: string;
  contact_id?: string;
  type: ActivityType;
  notes: string;
  created_at: string;
}

export interface PipelineMetrics {
  totalActiveValue: number;
  wonValue: number;
  lostValue: number;
  totalDeals: number;
  activeDealsCount: number;
  stageBreakdown: Record<DealStage, { count: number; totalValue: number }>;
  winRate: number; // percentage
}

export function calculatePipelineMetrics(deals: Deal[]): PipelineMetrics {
  const stageBreakdown: Record<DealStage, { count: number; totalValue: number }> = {
    'Lead': { count: 0, totalValue: 0 },
    'Qualified': { count: 0, totalValue: 0 },
    'Proposal Needed': { count: 0, totalValue: 0 },
    'Proposal Sent': { count: 0, totalValue: 0 },
    'Won': { count: 0, totalValue: 0 },
    'Lost': { count: 0, totalValue: 0 },
  };

  let totalActiveValue = 0;
  let wonValue = 0;
  let lostValue = 0;
  let activeDealsCount = 0;
  let wonCount = 0;
  let closedCount = 0;

  for (const deal of deals) {
    const val = Number(deal.value) || 0;
    const stage = deal.stage && stageBreakdown[deal.stage] ? deal.stage : 'Lead';
    stageBreakdown[stage].count += 1;
    stageBreakdown[stage].totalValue += val;

    if (stage === 'Won') {
      wonValue += val;
      wonCount += 1;
      closedCount += 1;
    } else if (stage === 'Lost') {
      lostValue += val;
      closedCount += 1;
    } else {
      totalActiveValue += val;
      activeDealsCount += 1;
    }
  }

  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  return {
    totalActiveValue,
    wonValue,
    lostValue,
    totalDeals: deals.length,
    activeDealsCount,
    stageBreakdown,
    winRate,
  };
}

export interface ReminderBuckets {
  overdue: Reminder[];
  dueToday: Reminder[];
  upcoming: Reminder[];
  completed: Reminder[];
}

export function categorizeReminders(reminders: Reminder[], referenceDateStr?: string): ReminderBuckets {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();
  const todayStart = new Date(refYear, refMonth, refDay, 0, 0, 0, 0).getTime();
  const todayEnd = new Date(refYear, refMonth, refDay, 23, 59, 59, 999).getTime();

  const buckets: ReminderBuckets = {
    overdue: [],
    dueToday: [],
    upcoming: [],
    completed: [],
  };

  for (const rem of reminders) {
    if (rem.completed) {
      buckets.completed.push(rem);
      continue;
    }

    if (!rem.due_date) {
      buckets.upcoming.push(rem);
      continue;
    }

    // Parse date (supports YYYY-MM-DD or ISO strings)
    const dueDate = new Date(rem.due_date.includes('T') ? rem.due_date : `${rem.due_date}T12:00:00`);
    const dueTime = dueDate.getTime();

    if (isNaN(dueTime)) {
      buckets.upcoming.push(rem);
    } else if (dueTime < todayStart) {
      buckets.overdue.push(rem);
    } else if (dueTime <= todayEnd) {
      buckets.dueToday.push(rem);
    } else {
      buckets.upcoming.push(rem);
    }
  }

  // Sort: overdue earliest first, today earliest first, upcoming earliest first
  const sortByDate = (a: Reminder, b: Reminder) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  buckets.overdue.sort(sortByDate);
  buckets.dueToday.sort(sortByDate);
  buckets.upcoming.sort(sortByDate);

  return buckets;
}

export interface ComplaintMetrics {
  total: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  highSeverityUnresolved: number;
}

export function calculateComplaintMetrics(complaints: Complaint[]): ComplaintMetrics {
  let openCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  let highSeverityUnresolved = 0;

  for (const c of complaints) {
    if (c.status === 'Open') {
      openCount += 1;
      if (c.severity === 'High') highSeverityUnresolved += 1;
    } else if (c.status === 'In Progress') {
      inProgressCount += 1;
      if (c.severity === 'High') highSeverityUnresolved += 1;
    } else if (c.status === 'Resolved') {
      resolvedCount += 1;
    }
  }

  return {
    total: complaints.length,
    openCount,
    inProgressCount,
    resolvedCount,
    highSeverityUnresolved,
  };
}

export function formatCurrency(amount: number, currencyCode?: CurrencyCode | string): string {
  return formatCurrencyAmount(amount, currencyCode);
}

export interface SearchResultItem {
  id: string;
  type: 'company' | 'contact' | 'deal' | 'reminder' | 'complaint' | 'settings';
  title: string;
  subtitle: string;
  badge?: string;
  metadata?: string;
  raw: any;
}

export function searchAllRecords(
  query: string,
  data: {
    companies: Company[];
    contacts: Contact[];
    deals: Deal[];
    reminders: Reminder[];
    complaints: Complaint[];
  }
): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResultItem[] = [];

  // 1. Companies
  for (const c of data.companies) {
    if (
      c.name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.website && c.website.toLowerCase().includes(q))
    ) {
      results.push({
        id: c.id,
        type: 'company',
        title: c.name,
        subtitle: c.industry || 'Company',
        badge: 'Company',
        metadata: c.website || c.phone,
        raw: c,
      });
    }
  }

  // 2. Contacts
  for (const ct of data.contacts) {
    if (
      ct.name.toLowerCase().includes(q) ||
      (ct.email && ct.email.toLowerCase().includes(q)) ||
      (ct.role && ct.role.toLowerCase().includes(q)) ||
      (ct.phone && ct.phone.toLowerCase().includes(q))
    ) {
      results.push({
        id: ct.id,
        type: 'contact',
        title: ct.name,
        subtitle: ct.role ? `${ct.role} • ${ct.email || ''}` : (ct.email || 'Contact'),
        badge: 'Contact',
        metadata: ct.phone,
        raw: ct,
      });
    }
  }

  // 3. Deals
  for (const d of data.deals) {
    if (
      d.title.toLowerCase().includes(q) ||
      d.stage.toLowerCase().includes(q) ||
      String(d.value).includes(q)
    ) {
      results.push({
        id: d.id,
        type: 'deal',
        title: d.title,
        subtitle: `${formatCurrency(d.value)} • ${d.stage}`,
        badge: d.stage,
        metadata: d.close_date ? `Close: ${d.close_date}` : undefined,
        raw: d,
      });
    }
  }

  // 4. Reminders
  for (const r of data.reminders) {
    if (
      r.title.toLowerCase().includes(q) ||
      r.priority.toLowerCase().includes(q) ||
      (r.due_date && r.due_date.includes(q))
    ) {
      results.push({
        id: r.id,
        type: 'reminder',
        title: r.title,
        subtitle: `Due: ${r.due_date} • ${r.priority} Priority`,
        badge: r.completed ? 'Completed' : `${r.priority} Priority`,
        metadata: r.completed ? 'Done' : 'Pending',
        raw: r,
      });
    }
  }

  // 5. Complaints
  for (const cp of data.complaints) {
    if (
      cp.title.toLowerCase().includes(q) ||
      cp.status.toLowerCase().includes(q) ||
      cp.severity.toLowerCase().includes(q) ||
      (cp.description && cp.description.toLowerCase().includes(q))
    ) {
      results.push({
        id: cp.id,
        type: 'complaint',
        title: cp.title,
        subtitle: `${cp.status} • ${cp.severity} Severity`,
        badge: cp.severity,
        metadata: cp.description?.substring(0, 50),
        raw: cp,
      });
    }
  }

  return results;
}

