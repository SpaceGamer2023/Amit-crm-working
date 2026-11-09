import React, { createContext, useContext, useState, useEffect } from 'react';
import { DealStage, ComplaintStatus, Severity, Priority, ActivityType } from './crmLogic.ts';

export type Language = 'en' | 'he';

export interface Translations {
  // Brand & Header
  appName: string;
  searchPlaceholder: string;
  searchShortcut: string;
  newRecord: string;
  desktopAlerts: string;
  languageToggle: string;

  // Sidebar Nav
  workspace: string;
  dashboard: string;
  deals: string;
  contacts: string;
  companies: string;
  complaints: string;
  reminders: string;
  quickAdd: string;
  searchRecords: string;
  dueSuffix: string;

  // Dashboard Metrics & Headers
  dashboardTitle: string;
  dashboardSubtitle: string;
  activePipelineValue: string;
  tasksDueToday: string;
  openComplaints: string;
  clientDirectory: string;
  activeDealsCount: string;
  wonValue: string;
  overdue: string;
  completed: string;
  inProgress: string;
  resolved: string;
  acrossCompanies: string;
  winRate: string;
  addDeal: string;
  addTask: string;
  logActivity: string;

  // Deals Pipeline by Stage Widget
  pipelineByStage: string;
  pipelineSubtitle: string;
  valueMetric: string;
  countMetric: string;
  kanbanBoard: string;
  dealSingular: string;
  dealPlural: string;
  activePipelineSummary: string;
  wonDealsSummary: string;
  clickStageTip: string;

  // Recent Activities Widget
  recentActivities: string;
  activitiesSubtitle: string;
  allActivities: string;
  calls: string;
  emails: string;
  meetings: string;
  notes: string;
  withContact: string;
  noActivities: string;
  viewTimelines: string;

  // Today's High-Priority Reminders Widget
  highPriorityReminders: string;
  highPrioritySubtitle: string;
  zeroHighPriority: string;
  zeroHighPriorityDesc: string;
  dueToday: string;
  otherDueTasks: string;
  allRemindersLink: string;
  dueTodayAlert: string;

  // Deal Stages
  stageLead: string;
  stageQualified: string;
  stageProposalNeeded: string;
  stageProposalSent: string;
  stageWon: string;
  stageLost: string;

  // Activity Types
  actCall: string;
  actEmail: string;
  actMeeting: string;
  actNote: string;

  // Priorities & Severities
  priorityHigh: string;
  priorityMed: string;
  priorityLow: string;
  statusOpen: string;
  statusInProgress: string;
  statusResolved: string;

  // Table Headers
  colContact: string;
  colCompany: string;
  colRole: string;
  colEmail: string;
  colPhone: string;
  colActions: string;
  colWebsite: string;
  colIndustry: string;
  colValue: string;
  filterCompanies: string;
  filterSeverities: string;
  searchContacts: string;
  searchCompanies: string;
  searchDeals: string;
  searchReminders: string;
  searchComplaints: string;

  // Modals & Drawers
  close: string;
  cancel: string;
  save: string;
  saving: string;
  loadingWorkspace: string;
  createRecord: string;
  logTouchpoint: string;
  deleteConfirm: string;
  timelineTab: string;
  dealsTab: string;
  remindersTab: string;
  complaintsTab: string;
  exportBackup: string;
  resetDemoData: string;
  dealsSubtitle: string;
  dropDealsHere: string;
  complaintsSubtitle: string;
  logTicket: string;
  noComplaintsIn: string;
  noContactAssigned: string;
  moveToInProgress: string;
  markResolved: string;
  companiesSubtitle: string;
  addCompany: string;
  editCompany: string;
  addContact: string;
  editContact: string;
  closeSheet: string;
  settings: string;
  generalSettings: string;
  notificationSettings: string;
  databaseTab: string;
  allSettings: string;
  allSettingsSubtitle: string;
  openSettings: string;
  openAllSettings: string;
  settingsShortcut: string;
  testAlert: string;
  importBackup: string;
  permissionStatus: string;
  enableNotifications: string;
  languagePreference: string;
  currencyPreference: string;
  restoreSuccess: string;
  restoreError: string;
  appearance: string;
  theme: string;
  darkMode: string;
  lightMode: string;
  themeDescription: string;
  lightModeDesc: string;
  darkModeDesc: string;
  currencyType: string;
  selectCurrency: string;
  israeliShekel: string;
  usDollar: string;
  euroCurrency: string;
  britishPound: string;
  downloadProjectZip: string;
  githubGuide: string;
  notificationLeadDays: string;
  soundChime: string;
  automatedMonitoring: string;
  dealClosingAlert: string;
  taskDueAlert: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Amit CRM',
    searchPlaceholder: 'Search companies, contacts, deals, reminders...',
    searchShortcut: '⌘K',
    newRecord: 'New',
    desktopAlerts: 'Desktop Alerts',
    languageToggle: 'עברית',

    workspace: 'Workspace',
    dashboard: 'Dashboard',
    deals: 'Deals',
    contacts: 'Contacts',
    companies: 'Companies',
    complaints: 'Complaints',
    reminders: 'Reminders',
    quickAdd: 'Quick Add',
    searchRecords: 'Search records',
    dueSuffix: 'due',

    dashboardTitle: 'Overview',
    dashboardSubtitle: 'Your pipeline, upcoming tasks, and recent activity at a glance.',
    activePipelineValue: 'Active Pipeline Value',
    tasksDueToday: 'Tasks Due Today',
    openComplaints: 'Open Complaints',
    clientDirectory: 'Client Directory',
    activeDealsCount: 'active deals',
    wonValue: 'won',
    overdue: 'overdue',
    completed: 'completed',
    inProgress: 'in progress',
    resolved: 'resolved',
    acrossCompanies: 'Companies',
    winRate: 'Win Rate',
    addDeal: 'Add Deal',
    addTask: 'Add Task',
    logActivity: 'Log Activity',

    pipelineByStage: 'Deals Pipeline by Stage',
    pipelineSubtitle: 'Visual stage volume & dollar distribution across your sales funnel',
    valueMetric: 'Value',
    countMetric: 'Deal Count',
    kanbanBoard: 'Kanban Board',
    dealSingular: 'deal',
    dealPlural: 'deals',
    activePipelineSummary: 'Active Pipeline',
    wonDealsSummary: 'Won Deals',
    clickStageTip: 'Click any stage bar to open in Kanban',

    recentActivities: 'Recent Activities',
    activitiesSubtitle: 'Timeline of calls, emails, meetings, and notes logged across all contacts',
    allActivities: 'All Activities',
    calls: 'Calls',
    emails: 'Emails',
    meetings: 'Meetings',
    notes: 'Notes',
    withContact: 'with',
    noActivities: 'No activities recorded in this category.',
    viewTimelines: 'View Contact Timelines',

    highPriorityReminders: "Today's High-Priority Reminders",
    highPrioritySubtitle: 'Critical client follow-ups and due tasks requiring immediate focus',
    zeroHighPriority: 'Zero High-Priority Reminders Pending',
    zeroHighPriorityDesc: 'You have cleared all urgent tasks for today! Any other pending tasks are listed below.',
    dueToday: 'Due Today',
    otherDueTasks: 'Other Tasks Due Today',
    allRemindersLink: 'All Reminders',
    dueTodayAlert: 'require attention',

    stageLead: 'Lead',
    stageQualified: 'Qualified',
    stageProposalNeeded: 'Proposal Needed',
    stageProposalSent: 'Proposal Sent',
    stageWon: 'Won',
    stageLost: 'Lost',

    actCall: 'Call',
    actEmail: 'Email',
    actMeeting: 'Meeting',
    actNote: 'Note',

    priorityHigh: 'High Priority',
    priorityMed: 'Medium',
    priorityLow: 'Low',
    statusOpen: 'Open',
    statusInProgress: 'In Progress',
    statusResolved: 'Resolved',

    colContact: 'Contact',
    colCompany: 'Company',
    colRole: 'Role',
    colEmail: 'Email',
    colPhone: 'Phone',
    colActions: 'Actions',
    colWebsite: 'Website',
    colIndustry: 'Industry',
    colValue: 'Pipeline Value',
    filterCompanies: 'All Companies',
    filterSeverities: 'All Severities',
    searchContacts: 'Search contacts...',
    searchCompanies: 'Search companies...',
    searchDeals: 'Filter deals...',
    searchReminders: 'Search reminders...',
    searchComplaints: 'Filter complaints...',

    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    loadingWorkspace: 'Loading your workspace...',
    createRecord: 'Create',
    logTouchpoint: 'Log',
    deleteConfirm: 'Are you sure you want to delete this record?',
    timelineTab: 'Timeline',
    dealsTab: 'Deals',
    remindersTab: 'Reminders',
    complaintsTab: 'Complaints',
    exportBackup: 'Export Backup (.json)',
    resetDemoData: 'Reset Demo Data',
    dealsSubtitle: 'Move deals between stages to keep your pipeline up to date.',
    dropDealsHere: 'Drop deals here',
    complaintsSubtitle: 'Track client issues and escalate by severity across Open, In Progress, and Resolved',
    logTicket: 'Log Ticket',
    noComplaintsIn: 'No complaints in',
    noContactAssigned: 'No contact assigned',
    moveToInProgress: 'In Progress →',
    markResolved: 'Resolve ✓',
    companiesSubtitle: 'corporate accounts with real-time pipeline aggregation',
    addCompany: 'Add Company',
    editCompany: 'Edit Company Information',
    addContact: 'Add Contact',
    editContact: 'Edit Contact Details',
    closeSheet: 'Close Sheet',
    settings: 'Settings',
    generalSettings: 'General & Preferences',
    notificationSettings: 'Desktop Notifications',
    databaseTab: 'Data & Backups',
    allSettings: 'Settings & Preferences',
    allSettingsSubtitle: 'Manage your appearance, language, notifications, and backups.',
    openSettings: 'Settings',
    openAllSettings: 'Open All Settings',
    settingsShortcut: '⌘,',
    testAlert: 'Send Test Notification',
    importBackup: 'Restore / Import Backup (.json)',
    permissionStatus: 'Notification Status',
    enableNotifications: 'Enable Desktop Alerts',
    languagePreference: 'Display Language',
    currencyPreference: 'Currency Symbol',
    restoreSuccess: 'Database restored successfully from backup.',
    restoreError: 'Failed to restore backup file.',
    appearance: 'Appearance & Theme',
    theme: 'Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    themeDescription: 'Customize CRM theme between light and dark modes',
    lightModeDesc: 'Clean high-contrast bright interface',
    darkModeDesc: 'Deep dark minimalist palette for low-light focus',
    currencyType: 'Currency Type',
    selectCurrency: 'Select Currency',
    israeliShekel: 'Israeli Shekel (₪)',
    usDollar: 'US Dollar ($)',
    euroCurrency: 'Euro (€)',
    britishPound: 'British Pound (£)',
    downloadProjectZip: 'Download Complete Project (ZIP)',
    githubGuide: 'Private GitHub & .EXE Guide',
    notificationLeadDays: 'Notify Deal Closing In Advance',
    soundChime: 'Play Audio Chime with Alerts',
    automatedMonitoring: 'Automated Background Monitoring',
    dealClosingAlert: 'Deal Closing Alerts',
    taskDueAlert: 'Task Due & Overdue Alerts',
  },

  he: {
    appName: 'עמית CRM',
    searchPlaceholder: 'חיפוש חברות, אנשי קשר, עסקאות, משימות...',
    searchShortcut: '⌘K',
    newRecord: 'חדש',
    desktopAlerts: 'התראות שולחן עבודה',
    languageToggle: 'English',

    workspace: 'סביבת עבודה',
    dashboard: 'לוח בקרה',
    deals: 'עסקאות',
    contacts: 'אנשי קשר',
    companies: 'חברות',
    complaints: 'פניות ותלונות',
    reminders: 'משימות ותזכורות',
    quickAdd: 'הוספה מהירה',
    searchRecords: 'חיפוש רשומות',
    dueSuffix: 'להיום',

    dashboardTitle: 'סקירה כללית',
    dashboardSubtitle: 'צנרת המכירות, המשימות הקרובות והפעילות האחרונה במקום אחד.',
    activePipelineValue: 'שווי צנרת עסקאות פעילה',
    tasksDueToday: 'משימות להיום',
    openComplaints: 'פניות פתוחות',
    clientDirectory: 'ספר כתובות לקוחות',
    activeDealsCount: 'עסקאות פעילות',
    wonValue: 'זכיות',
    overdue: 'באיחור',
    completed: 'הושלמו',
    inProgress: 'בטיפול',
    resolved: 'נפתרו',
    acrossCompanies: 'חברות',
    winRate: 'אחוז זכייה',
    addDeal: 'הוסף עסקה',
    addTask: 'הוסף משימה',
    logActivity: 'תעד פעילות',

    pipelineByStage: 'צנרת עסקאות לפי שלב',
    pipelineSubtitle: 'התפלגות עסקאות ושווי כספי לאורך שלבי המכירה',
    valueMetric: 'שווי כספי',
    countMetric: 'כמות עסקאות',
    kanbanBoard: 'לוח קנבן',
    dealSingular: 'עסקה',
    dealPlural: 'עסקאות',
    activePipelineSummary: 'צנרת פעילה',
    wonDealsSummary: 'עסקאות שנסגרו בזכייה',
    clickStageTip: 'לחץ על שלב כלשהו לפתיחה בלוח הקנבן',

    recentActivities: 'פעילויות אחרונות',
    activitiesSubtitle: 'ציר זמן של שיחות, הודעות דוא"ל, פגישות והערות מול אנשי הקשר',
    allActivities: 'כל הפעילויות',
    calls: 'שיחות',
    emails: 'הודעות דוא"ל',
    meetings: 'פגישות',
    notes: 'הערות',
    withContact: 'עם',
    noActivities: 'לא נמצאו פעילויות בקטגוריה זו.',
    viewTimelines: 'ציר זמן אנשי קשר',

    highPriorityReminders: 'תזכורות דחופות להיום (עדיפות גבוהה)',
    highPrioritySubtitle: 'מעקב קריטי מול לקוחות ומשימות הדורשות טיפול מיידי',
    zeroHighPriority: 'אין משימות דחופות שממתינות!',
    zeroHighPriorityDesc: 'סיימת את כל המשימות הדחופות להיום! שאר המשימות מופיעות למטה.',
    dueToday: 'להיום',
    otherDueTasks: 'משימות נוספות להיום',
    allRemindersLink: 'כל המשימות',
    dueTodayAlert: 'דורשות טיפול',

    stageLead: 'ליד',
    stageQualified: 'מתאים',
    stageProposalNeeded: 'נדרשת הצעה',
    stageProposalSent: 'הצעה נשלחה',
    stageWon: 'זכייה',
    stageLost: 'הפסד',

    actCall: 'שיחה',
    actEmail: 'דוא"ל',
    actMeeting: 'פגישה',
    actNote: 'הערה',

    priorityHigh: 'עדיפות גבוהה',
    priorityMed: 'בינונית',
    priorityLow: 'נמוכה',
    statusOpen: 'פתוח',
    statusInProgress: 'בטיפול',
    statusResolved: 'נפתר',

    colContact: 'איש קשר',
    colCompany: 'חברה',
    colRole: 'תפקיד',
    colEmail: 'דוא"ל',
    colPhone: 'טלפון',
    colActions: 'פעולות',
    colWebsite: 'אתר',
    colIndustry: 'תחום',
    colValue: 'שווי צנרת',
    filterCompanies: 'כל החברות',
    filterSeverities: 'כל רמות החומרה',
    searchContacts: 'חיפוש אנשי קשר...',
    searchCompanies: 'חיפוש חברות...',
    searchDeals: 'סינון עסקאות...',
    searchReminders: 'חיפוש משימות...',
    searchComplaints: 'חיפוש פניות ותלונות...',

    close: 'סגור',
    cancel: 'ביטול',
    save: 'שמירה',
    saving: 'שומר...',
    loadingWorkspace: 'טוען את סביבת העבודה...',
    createRecord: 'צור',
    logTouchpoint: 'שמור',
    deleteConfirm: 'האם אתה בטוח שברצונך למחוק רשומה זו?',
    timelineTab: 'ציר זמן',
    dealsTab: 'עסקאות',
    remindersTab: 'משימות',
    complaintsTab: 'פניות',
    exportBackup: 'ייצוא גיבוי (.json)',
    resetDemoData: 'איפוס נתוני הדגמה',
    dealsSubtitle: 'העבר עסקאות בין השלבים כדי לעדכן את צנרת המכירות.',
    dropDealsHere: 'גרור עסקאות לכאן',
    complaintsSubtitle: 'מעקב אחר תלונות ופניות לקוחות לפי רמת חומרה וסטטוס טיפול',
    logTicket: 'פתח פנייה',
    noComplaintsIn: 'אין פניות בסטטוס',
    noContactAssigned: 'לא הוקצה איש קשר',
    moveToInProgress: 'בטיפול →',
    markResolved: 'סמן כנפתר ✓',
    companiesSubtitle: 'חשבונות עסקיים עם סיכום שווי צנרת בזמן אמת',
    addCompany: 'הוסף חברה',
    editCompany: 'עריכת פרטי חברה',
    addContact: 'הוסף איש קשר',
    editContact: 'עריכת פרטי איש קשר',
    closeSheet: 'סגור חלונית',
    settings: 'הגדרות',
    generalSettings: 'כללי והעדפות',
    notificationSettings: 'התראות שולחן עבודה',
    databaseTab: 'נתונים וגיבויים',
    allSettings: 'הגדרות והעדפות',
    allSettingsSubtitle: 'ניהול המראה, השפה, ההתראות והגיבויים.',
    openSettings: 'הגדרות',
    openAllSettings: 'פתח את כל ההגדרות',
    settingsShortcut: '⌘,',
    testAlert: 'שלח התראת בדיקה',
    importBackup: 'שחזור / ייבוא גיבוי (.json)',
    permissionStatus: 'סטטוס הרשאת התראות',
    enableNotifications: 'הפעל התראות שולחן עבודה',
    languagePreference: 'שפת ממשק',
    currencyPreference: 'מטבע תצוגה',
    restoreSuccess: 'מסד הנתונים שוחזר בהצלחה מהגיבוי.',
    restoreError: 'שגיאה בשחזור קובץ הגיבוי.',
    appearance: 'ערכת נושא ומראה',
    theme: 'ערכת נושא',
    darkMode: 'מצב כהה',
    lightMode: 'מצב בהיר',
    themeDescription: 'התאמה אישית של ערכת הנושא בין מצב בהיר למצב כהה',
    lightModeDesc: 'ממשק בהיר ונקי עם ניגודיות גבוהה',
    darkModeDesc: 'פלטה כהה ומינימליסטית לעבודה נוחה באור חלש',
    currencyType: 'סוג מטבע',
    selectCurrency: 'בחירת מטבע',
    israeliShekel: 'שקל ישראלי חדש (₪)',
    usDollar: 'דולר ארה"ב ($)',
    euroCurrency: 'אירו (€)',
    britishPound: 'ליש"ט בריטי (£)',
    downloadProjectZip: 'הורדת פרויקט מלא (ZIP)',
    githubGuide: 'מדריך ל-GitHub פרטי וקובץ .EXE',
    notificationLeadDays: 'התראה מראש על סגירת עסקה',
    soundChime: 'השמעת צליל התראה',
    automatedMonitoring: 'ניטור התראות אוטומטי ברקע',
    dealClosingAlert: 'התראות על מועדי סגירת עסקאות',
    taskDueAlert: 'התראות על משימות להיום ובאיחור',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  isRTL: boolean;
  getStageName: (stage: DealStage) => string;
  getActivityName: (type: ActivityType) => string;
  getPriorityName: (priority: Priority) => string;
  getStatusName: (status: ComplaintStatus) => string;
  getSeverityName: (severity: Severity) => string;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('amit_crm_language');
      if (saved === 'he' || saved === 'en') return saved;
    }
    return 'en';
  });

  const isRTL = language === 'he';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('amit_crm_language', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'he' : 'en');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language, isRTL]);

  const t = translations[language];

  const getStageName = (stage: DealStage): string => {
    switch (stage) {
      case 'Lead': return t.stageLead;
      case 'Qualified': return t.stageQualified;
      case 'Proposal Needed': return t.stageProposalNeeded;
      case 'Proposal Sent': return t.stageProposalSent;
      case 'Won': return t.stageWon;
      case 'Lost': return t.stageLost;
    }
  };

  const getActivityName = (type: ActivityType): string => {
    switch (type) {
      case 'Call': return t.actCall;
      case 'Email': return t.actEmail;
      case 'Meeting': return t.actMeeting;
      case 'Note': return t.actNote;
    }
  };

  const getPriorityName = (priority: Priority): string => {
    switch (priority) {
      case 'High': return t.priorityHigh;
      case 'Med': return t.priorityMed;
      case 'Low': return t.priorityLow;
    }
  };

  const getStatusName = (status: ComplaintStatus): string => {
    switch (status) {
      case 'Open': return t.statusOpen;
      case 'In Progress': return t.statusInProgress;
      case 'Resolved': return t.statusResolved;
    }
  };

  const getSeverityName = (severity: Severity): string => {
    switch (severity) {
      case 'High': return t.priorityHigh;
      case 'Med': return t.priorityMed;
      case 'Low': return t.priorityLow;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isRTL,
        getStageName,
        getActivityName,
        getPriorityName,
        getStatusName,
        getSeverityName,
      }}
    >
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-sans text-right' : 'font-sans text-left'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
