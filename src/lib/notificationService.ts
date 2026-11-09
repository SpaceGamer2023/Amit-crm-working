import { Reminder, Deal, Complaint, formatCurrency } from './crmLogic.ts';

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
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
  soundEnabled: true,
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

// Subtle pleasant synth chime via Web Audio API (no external asset needed)
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.15);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.5);
  } catch (e) {
    // AudioContext might be blocked until user gesture, safely ignore
  }
}

// In-app alert dispatch
export interface InAppAlert {
  id: string;
  title: string;
  body: string;
  type: 'reminder' | 'deal' | 'complaint' | 'system';
  timestamp: string;
}

export function dispatchInAppAlert(alert: InAppAlert): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amit_crm_in_app_alert', { detail: alert }));
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

// Core alert dispatcher (Native desktop + Web Notification + In-app + Sound)
export async function sendDesktopAlert(
  title: string,
  body: string,
  type: InAppAlert['type'] = 'system'
): Promise<boolean> {
  const settings = getNotificationSettings();

  if (settings.soundEnabled) {
    playNotificationChime();
  }

  // Always dispatch in-app alert banner
  dispatchInAppAlert({
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    body,
    type,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  // Try Tauri v2 native notification if running in desktop binary
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const tauriNotification = await import('@tauri-apps/plugin-notification');
      if (tauriNotification.sendNotification) {
        tauriNotification.sendNotification({ title, body });
        return true;
      }
    } catch {
      // Fallback to web notification
    }
  }

  // Web Notification API
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
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    // If in Tauri v2 desktop environment
    if ((window as any).__TAURI_INTERNALS__) {
      const tauriNotification = await import('@tauri-apps/plugin-notification');
      if (tauriNotification.requestPermission) {
        const tauriPerm = await tauriNotification.requestPermission();
        if (tauriPerm === 'granted') {
          return 'granted';
        }
      }
    }

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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayStart = new Date(`${todayStr}T00:00:00`).getTime();
  const todayEnd = new Date(`${todayStr}T23:59:59.999`).getTime();

  // 1. Reminders
  for (const rem of data.reminders) {
    if (rem.completed) continue;
    if (!rem.due_date) continue;

    const dueTime = new Date(`${rem.due_date.split('T')[0]}T12:00:00`).getTime();
    if (isNaN(dueTime)) continue;

    // Overdue task
    if (dueTime < todayStart && settings.notifyTasksOverdue) {
      const key = `rem_overdue_${rem.id}_${todayStr}`;
      if (!hasBeenNotified(key)) {
        markNotified(key);
        const title = language === 'he' ? '⚠️ משימה באיחור לביצוע' : '⚠️ Overdue Task Alert';
        const body = language === 'he'
          ? `המשימה "${rem.title}" עברה את תאריך היעד (${rem.due_date}).`
          : `Task "${rem.title}" was due on ${rem.due_date} and needs attention.`;
        sendDesktopAlert(title, body, 'reminder');
      }
    }
    // Due today
    else if (dueTime >= todayStart && dueTime <= todayEnd && settings.notifyTasksDueToday) {
      const key = `rem_due_today_${rem.id}_${todayStr}`;
      if (!hasBeenNotified(key)) {
        markNotified(key);
        const title = language === 'he' ? '📋 משימה שממתינה להיום' : '📋 Task Due Today';
        const body = language === 'he'
          ? `יש לבצע היום: "${rem.title}" [עדיפות: ${rem.priority}].`
          : `Due today: "${rem.title}" [Priority: ${rem.priority}].`;
        sendDesktopAlert(title, body, 'reminder');
      }
    }
  }

  // 2. Deals closing soon or today
  for (const deal of data.deals) {
    if (deal.stage === 'Won' || deal.stage === 'Lost') continue;
    if (!deal.close_date) continue;

    const closeTime = new Date(`${deal.close_date.split('T')[0]}T12:00:00`).getTime();
    if (isNaN(closeTime)) continue;

    const diffDays = Math.ceil((closeTime - todayStart) / (1000 * 60 * 60 * 24));
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
        sendDesktopAlert(title, body, 'deal');
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
        sendDesktopAlert(title, body, 'deal');
      }
    }
  }
}
