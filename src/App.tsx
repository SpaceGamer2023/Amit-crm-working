import React, { useState, useEffect, useCallback } from 'react';
import { crmDb } from './db/crmDatabase.ts';
import {
  Company,
  Contact,
  Deal,
  Reminder,
  Complaint,
  Activity,
  SearchResultItem,
  categorizeReminders,
} from './lib/crmLogic.ts';
import {
  checkAndNotifyMilestones,
  requestDesktopNotificationPermission,
  sendDesktopAlert,
} from './lib/notificationService.ts';
import { LanguageProvider, useTranslation } from './lib/i18n.tsx';
import { ThemeProvider } from './lib/theme.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar, ActiveView } from './components/Sidebar.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { QuickAddModal } from './components/QuickAddModal.tsx';
import { ContactDrawer } from './components/ContactDrawer.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { DealsKanbanView } from './components/views/DealsKanbanView.tsx';
import { ContactsView } from './components/views/ContactsView.tsx';
import { CompaniesView } from './components/views/CompaniesView.tsx';
import { ComplaintsKanbanView } from './components/views/ComplaintsKanbanView.tsx';
import { RemindersView } from './components/views/RemindersView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';

function AppContent() {
  const { t, isRTL, language } = useTranslation();
  const [currentView, setCurrentView] = useState<ActiveView>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Entities in local SQLite
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Modals & Drawers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<string>('deal');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  // Notifications
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Load all data from SQLite
  const loadCrmData = useCallback(async () => {
    try {
      const [comp, cont, dl, rem, cp, act] = await Promise.all([
        crmDb.getCompanies(),
        crmDb.getContacts(),
        crmDb.getDeals(),
        crmDb.getReminders(),
        crmDb.getComplaints(),
        crmDb.getActivities(),
      ]);
      setCompanies(comp);
      setContacts(cont);
      setDeals(dl);
      setReminders(rem);
      setComplaints(cp);
      setActivities(act);
    } catch (e) {
      console.error('Failed to load local SQLite data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCrmData();
  }, [loadCrmData]);

  // Periodic automated background check for due tasks and closing deals
  useEffect(() => {
    if (!isLoading && (reminders.length > 0 || deals.length > 0)) {
      checkAndNotifyMilestones({ reminders, deals, complaints }, language);
    }
    const interval = setInterval(() => {
      checkAndNotifyMilestones({ reminders, deals, complaints }, language);
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [reminders, deals, complaints, language, isLoading]);

  // Global Keyboard Shortcuts: Cmd+K / Ctrl+K for search, Cmd+, / Ctrl+, for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setCurrentView('settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Native notification request
  const handleRequestNotificationPermission = async () => {
    const perm = await requestDesktopNotificationPermission();
    setNotificationPermission(perm);
  };

  // Trigger desktop alert
  const handleTriggerDesktopAlert = async () => {
    const reminderBuckets = categorizeReminders(reminders);
    const count = reminderBuckets.dueToday.length + reminderBuckets.overdue.length;
    const activeDealsClosingSoon = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost' && d.close_date);

    const title = language === 'he' ? `${t.appName}: התראת שולחן עבודה` : `${t.appName}: Desktop Alert`;
    const body = language === 'he'
      ? count > 0
        ? `יש לך ${count} משימות שממתינות להיום או באיחור, ו-${activeDealsClosingSoon.length} עסקאות פעילות בצנרת!`
        : 'כל המשימות להיום הושלמו! אין משימות דחופות שממתינות.'
      : count > 0
        ? `You have ${count} pending reminder(s) due today or overdue, and ${activeDealsClosingSoon.length} active deal(s) in pipeline!`
        : 'All caught up! No urgent tasks pending right now.';

    await sendDesktopAlert(title, body);
  };

  // Reminder toggle
  const handleToggleReminder = async (id: string, current: number) => {
    await crmDb.toggleReminderCompleted(id, current === 0);
    await loadCrmData();
  };

  // Search item selection jump
  const handleSelectSearchResult = (item: SearchResultItem) => {
    switch (item.type) {
      case 'contact':
        setActiveContactId(item.id);
        break;
      case 'company':
        setCurrentView('companies');
        break;
      case 'deal':
        setCurrentView('deals');
        break;
      case 'reminder':
        setCurrentView('reminders');
        break;
      case 'complaint':
        setCurrentView('complaints');
        break;
      case 'settings':
        setCurrentView('settings');
        break;
    }
  };

  // Quick Add Trigger
  const handleOpenQuickAdd = (type = 'deal') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  // Computed counts
  const reminderBuckets = categorizeReminders(reminders);
  const openComplaintsCount = complaints.filter((c) => c.status !== 'Resolved').length;

  const counts = {
    deals: deals.length,
    contacts: contacts.length,
    companies: companies.length,
    openComplaints: openComplaintsCount,
    dueTodayReminders: reminderBuckets.dueToday.length + reminderBuckets.overdue.length,
    reminders: reminders.length,
    complaints: complaints.length,
    activities: activities.length,
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return t.dashboard;
      case 'deals': return t.deals;
      case 'contacts': return t.contacts;
      case 'companies': return t.companies;
      case 'complaints': return t.complaints;
      case 'reminders': return t.reminders;
      case 'settings': return t.settings;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 text-zinc-600 text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="font-medium text-zinc-700">{t.loadingWorkspace}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-hidden select-none transition-colors duration-150"
    >
      {/* Top Header Bar with Language Switcher and Settings Button */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickAdd={handleOpenQuickAdd}
        onOpenSettings={() => setCurrentView('settings')}
        dueTodayCount={counts.dueTodayReminders}
        onTriggerDesktopAlert={handleTriggerDesktopAlert}
        activeViewTitle={getViewTitle()}
        isSettingsActive={currentView === 'settings'}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          onOpenQuickAdd={handleOpenQuickAdd}
          onOpenSearch={() => setIsSearchOpen(true)}
          counts={counts}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 select-text transition-colors duration-150">
          {currentView === 'dashboard' && (
            <DashboardView
              deals={deals}
              reminders={reminders}
              complaints={complaints}
              contacts={contacts}
              companies={companies}
              activities={activities}
              onSelectView={setCurrentView}
              onOpenQuickAdd={handleOpenQuickAdd}
              onToggleReminder={handleToggleReminder}
              onOpenContactDrawer={(id) => setActiveContactId(id)}
            />
          )}

          {currentView === 'deals' && (
            <DealsKanbanView
              deals={deals}
              companies={companies}
              contacts={contacts}
              onDataChanged={loadCrmData}
              onOpenQuickAdd={(type, defaultStage) => {
                setQuickAddType(type || 'deal');
                setIsQuickAddOpen(true);
              }}
              onOpenContactDrawer={(id) => setActiveContactId(id)}
            />
          )}

          {currentView === 'contacts' && (
            <ContactsView
              contacts={contacts}
              companies={companies}
              onDataChanged={loadCrmData}
              onOpenQuickAdd={handleOpenQuickAdd}
              onSelectContact={(id) => setActiveContactId(id)}
            />
          )}

          {currentView === 'companies' && (
            <CompaniesView
              companies={companies}
              contacts={contacts}
              deals={deals}
              onDataChanged={loadCrmData}
              onOpenQuickAdd={handleOpenQuickAdd}
              onSelectContact={(id) => setActiveContactId(id)}
            />
          )}

          {currentView === 'complaints' && (
            <ComplaintsKanbanView
              complaints={complaints}
              contacts={contacts}
              onDataChanged={loadCrmData}
              onOpenQuickAdd={handleOpenQuickAdd}
              onOpenContactDrawer={(id) => setActiveContactId(id)}
            />
          )}

          {currentView === 'reminders' && (
            <RemindersView
              reminders={reminders}
              contacts={contacts}
              onDataChanged={loadCrmData}
              onOpenQuickAdd={handleOpenQuickAdd}
              onOpenContactDrawer={(id) => setActiveContactId(id)}
              onTriggerDesktopAlert={handleTriggerDesktopAlert}
              notificationPermission={notificationPermission}
              onRequestPermission={handleRequestNotificationPermission}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              counts={counts}
              onDataChanged={loadCrmData}
              notificationPermission={notificationPermission}
              onRequestPermission={handleRequestNotificationPermission}
            />
          )}
        </main>
      </div>

      {/* Global Slide-In Contact Drawer */}
      <ContactDrawer
        contactId={activeContactId}
        onClose={() => setActiveContactId(null)}
        companies={companies}
        onDataChanged={loadCrmData}
        onOpenQuickAdd={(type, contactId) => {
          setQuickAddType(type);
          setIsQuickAddOpen(true);
        }}
      />

      {/* Global Search Modal (⌘K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        companies={companies}
        contacts={contacts}
        deals={deals}
        reminders={reminders}
        complaints={complaints}
        onSelectResult={handleSelectSearchResult}
        onQuickAdd={handleOpenQuickAdd}
      />

      {/* Global Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultType={quickAddType}
        companies={companies}
        contacts={contacts}
        onSuccess={loadCrmData}
        preselectedContactId={activeContactId || undefined}
      />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
