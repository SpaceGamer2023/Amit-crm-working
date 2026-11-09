import { Reminder, Deal, Complaint, formatCurrency } from './crmLogic.ts';

export interface NotificationSettings {
  enabled: boolean;
  notifyTasksDueToday: boolean;
  notifyTasksOverdue: boolean;
  notifyDealsClosingToday: boolean;
  notifyDealsClosingSoon: boolean; // 3 days in advance
  dealLeadDays: number; // default 3
}

export const NOTIFICATION_SETTINGS_KEY = 'amit_crm_notification_settings';
export const NOTIFIED_MILESTONES_KEY = 'amit_crm_notified_milestones';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyTasksDueToday: true,
  notifyTasksOverdue: true,
  notifyDealsClosingToday: true,
  notifyDealsClosingSoon: true,
  dealLeadDays: 3,
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse notification settings:', e);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  }
}

// Milestone deduplication to avoid repeated notifications
function hasBeenNotified(milestoneKey: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(NOTIFIED_MILESTONES_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    const ts = map[milestoneKey];
    if (ts && Date.now() - ts < 24 * 60 * 60 * 1000) {
      return true; // Notified within last 24h
    }
  } catch {
    // fallback
  }
  return false;
}

function markNotified(milestoneKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(NOTIFIED_MILESTONES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[milestoneKey] = Date.now();
    // Prune entries older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const k of Object.keys(map)) {
      if (map[k] < cutoff) delete map[k];
    }
    window.localStorage.setItem(NOTIFIED_MILESTONES_KEY, JSON.stringify(map));
  } catch {
    // fallback
  }
}

// Send only through the operating system's notification service.
export async function sendDesktopAlert(
  title: string,
  body: string
): Promise<boolean> {
  // Try Tauri v2 native notification if running in desktop binary
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const tauriNotification = await import('@tauri-apps/plugin-notification');
      if (tauriNotification.sendNotification) {
        // No sound is supplied so Windows displays a silent native toast.
        tauriNotification.sendNotification({ title, body });
        return true;
      }
    } catch (error) {
      console.warn('Native Windows notification failed:', error);
      return false;
    }
    return false;
  }

  // Browser notification fallback for web previews only; no CRM banner is shown.
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          tag: title,
        });
        return true;
      } catch (e) {
        console.warn('Notification failed:', e);
      }
    }
  }

  return false;
}

// Request notification permissions
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  try {
    // If in Tauri v2 desktop environment
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const tauriNotification = await import('@tauri-apps/plugin-notification');
      if (tauriNotification.requestPermission) {
        const tauriPerm = await tauriNotification.requestPermission();
        return tauriPerm;
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await sendDesktopAlert('Amit CRM', 'Desktop notifications are active and ready.');
    }
    return perm;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return 'default';
  }
}

/**
 * Scan all tasks, deals, and complaints to fire notifications for:
 * - Tasks due today
 * - Overdue tasks
 * - Deals closing today
 * - Deals closing in 1-3 days
 */
export function checkAndNotifyMilestones(
  data: { reminders: Reminder[]; deals: Deal[]; complaints: Complaint[] },
  language: 'en' | 'he' = 'en'
): void {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const today = new Date();
  const todayStr = toLocalDateString(today);
  const todayOrdinal = calendarOrdinal(today);

  // 1. Reminders
  for (const rem of data.reminders) {
    if (rem.completed) continue;
    if (!rem.due_date) continue;

    const dueDate = new Date(`${rem.due_date.split('T')[0]}T00:00:00`);
    if (isNaN(dueDate.getTime())) continue;
    const daysUntilDue = calendarOrdinal(dueDate) - todayOrdinal;

    // Overdue task
    if (daysUntilDue < 0 && settings.notifyTasksOverdue) {
      const key = `rem_overdue_${rem.id}_${todayStr}`;
      if (!hasBeenNotified(key)) {
        markNotified(key);
        const title = language === 'he' ? '⚠️ משימה באיחור לביצוע' : '⚠️ Overdue Task Alert';
        const body = language === 'he'
          ? `המשימה "${rem.title}" עברה את תאריך היעד (${rem.due_date}).`
          : `Task "${rem.title}" was due on ${rem.due_date} and needs attention.`;
        sendDesktopAlert(title, body);
      }
    }
    // Due today
    else if (daysUntilDue === 0 && settings.notifyTasksDueToday) {
      const key = `rem_due_today_${rem.id}_${todayStr}`;
      if (!hasBeenNotified(key)) {
        markNotified(key);
        const title = language === 'he' ? '📋 משימה שממתינה להיום' : '📋 Task Due Today';
        const body = language === 'he'
          ? `יש לבצע היום: "${rem.title}" [עדיפות: ${rem.priority}].`
          : `Due today: "${rem.title}" [Priority: ${rem.priority}].`;
        sendDesktopAlert(title, body);
      }
    }
  }

  // 2. Deals closing soon or today
  for (const deal of data.deals) {
    if (deal.stage === 'Won' || deal.stage === 'Lost') continue;
    if (!deal.close_date) continue;

    const closeDate = new Date(deal.close_date.length === 10 ? `${deal.close_date}T00:00:00` : deal.close_date);
    if (isNaN(closeDate.getTime())) continue;

    const diffDays = calendarOrdinal(closeDate) - todayOrdinal;
    const formattedVal = formatCurrency(deal.value, deal.currency);

    // Closing today
    if (diffDays === 0 && settings.notifyDealsClosingToday) {
      const key = `deal_closing_today_${deal.id}_${todayStr}`;
      if (!hasBeenNotified(key)) {
        markNotified(key);
        const title = language === 'he' ? '💼 עסקת יעד נסגרת היום!' : '💼 Deal Expected to Close Today!';
        const body = language === 'he'
          ? `העסקה "${deal.title}" (${formattedVal}) מתוכננת להיסגר היום.`
          : `Deal "${deal.title}" (${formattedVal}) is scheduled to close today.`;
        sendDesktopAlert(title, body);
      }
    }
    // Closing soon (within dealLeadDays, e.g. 1-3 days)
    else if (diffDays > 0 && diffDays <= settings.dealLeadDays && settings.notifyDealsClosingSoon) {
      const key = `deal_closing_soon_${deal.id}_${diffDays}d_${todayStr}`;
      if (!hasBeenNotified(key)) {
        markNotified(key);
        const title = language === 'he' ? `⏳ מועד סגירת עסקה מתקרב (${diffDays} ימים)` : `⏳ Upcoming Deal Close (${diffDays} days left)`;
        const body = language === 'he'
          ? `נותרו ${diffDays} ימים לעסקה "${deal.title}" (${formattedVal}) בשלב ${deal.stage}.`
          : `Deal "${deal.title}" (${formattedVal}) at stage "${deal.stage}" closes in ${diffDays} days.`;
        sendDesktopAlert(title, body);
      }
    }
  }
}

function toLocalDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function calendarOrdinal(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}
