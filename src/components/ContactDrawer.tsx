import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Building2,
  Plus,
  PhoneCall,
  Calendar,
  FileText,
  Clock,
  Trash2,
  Edit2,
  Send,
} from 'lucide-react';
import {
  Contact,
  Company,
  Deal,
  Reminder,
  Complaint,
  Activity,
  ActivityType,
  formatCurrency,
} from '../lib/crmLogic.ts';
import { crmDb } from '../db/crmDatabase.ts';
import { useTranslation } from '../lib/i18n.tsx';

interface ContactDrawerProps {
  contactId: string | null;
  onClose: () => void;
  companies: Company[];
  onDataChanged: () => void;
  onOpenQuickAdd: (type: string, contactId?: string) => void;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  contactId,
  onClose,
  companies,
  onDataChanged,
  onOpenQuickAdd,
}) => {
  const { t, isRTL, getActivityName, getStageName, getPriorityName, getStatusName, getSeverityName } = useTranslation();
  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'deals' | 'reminders' | 'complaints'>('timeline');

  // Quick activity log state
  const [isLoggingActivity, setIsLoggingActivity] = useState<ActivityType | null>(null);
  const [activityNote, setActivityNote] = useState('');
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', role: '', email: '', phone: '', company_id: '' });

  const loadData = async () => {
    if (!contactId) return;
    const ct = await crmDb.getContactById(contactId);
    setContact(ct);
    if (ct) {
      setEditForm({
        name: ct.name,
        role: ct.role || '',
        email: ct.email || '',
        phone: ct.phone || '',
        company_id: ct.company_id || '',
      });
      const d = await crmDb.getDealsByContact(contactId);
      const r = await crmDb.getRemindersByContact(contactId);
      const a = await crmDb.getActivitiesByContact(contactId);
      const allComp = await crmDb.getComplaints();
      setDeals(d);
      setReminders(r);
      setActivities(a);
      setComplaints(allComp.filter((c) => c.contact_id === contactId));
    }
  };

  useEffect(() => {
    loadData();
    setIsLoggingActivity(null);
    setIsEditing(false);
  }, [contactId]);

  if (!contactId || !contact) return null;

  const company = companies.find((c) => c.id === contact.company_id);

  const handleSaveActivity = async () => {
    if (!activityNote.trim() || !isLoggingActivity) return;
    setIsSavingActivity(true);
    await crmDb.saveActivity({
      contact_id: contact.id,
      type: isLoggingActivity,
      notes: activityNote.trim(),
    });
    setActivityNote('');
    setIsLoggingActivity(null);
    setIsSavingActivity(false);
    await loadData();
    onDataChanged();
  };

  const handleToggleReminder = async (remId: string, current: number) => {
    await crmDb.toggleReminderCompleted(remId, current === 0);
    await loadData();
    onDataChanged();
  };

  const handleSaveContactEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await crmDb.saveContact({
      id: contact.id,
      name: editForm.name,
      role: editForm.role,
      email: editForm.email,
      phone: editForm.phone,
      company_id: editForm.company_id || undefined,
    });
    setIsEditing(false);
    await loadData();
    onDataChanged();
  };

  const handleDeleteContact = async () => {
    if (confirm(t.deleteConfirm)) {
      await crmDb.deleteContact(contact.id);
      onDataChanged();
      onClose();
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'Call':
        return <PhoneCall className="w-3.5 h-3.5 text-blue-500" />;
      case 'Email':
        return <Mail className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Meeting':
        return <Calendar className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Note':
        return <FileText className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className={`fixed inset-0 z-40 flex ${isRTL ? 'justify-start' : 'justify-end'} bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-150`}>
      <div
        className={`w-full max-w-lg bg-white dark:bg-[#202125] h-full shadow-2xl ${isRTL ? 'border-r animate-in slide-in-from-left' : 'border-l animate-in slide-in-from-right'} border-zinc-200 dark:border-zinc-700 flex flex-col justify-between overflow-hidden duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-start justify-between bg-zinc-50/60 dark:bg-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold flex items-center justify-center text-sm shadow-2xs">
              {contact.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{contact.name}</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors cursor-pointer"
                  title={t.editContact}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                {contact.role && <span>{contact.role}</span>}
                {company && (
                  <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                    <Building2 className="w-3 h-3 text-zinc-400" />
                    {company.name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteContact}
              className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
              title="Delete Contact"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Edit Form Overlay */}
          {isEditing ? (
            <form onSubmit={handleSaveContactEdit} className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{t.editContact}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colContact}</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colRole}</label>
                  <input
                    type="text"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colEmail}</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colPhone}</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colCompany}</label>
                <select
                  value={editForm.company_id}
                  onChange={(e) => setEditForm({ ...editForm, company_id: e.target.value })}
                  className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">{isRTL ? 'ללא חברה' : 'None'}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 text-xs rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          ) : (
            /* Contact Metadata Quick Bar */
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#202125]">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 font-medium transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 font-medium transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Quick Activity Logger Buttons */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
            <div className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-2">
              {t.logActivity}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['Call', 'Email', 'Meeting', 'Note'] as ActivityType[]).map((type) => {
                const isSelected = isLoggingActivity === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setIsLoggingActivity(isSelected ? null : type);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs'
                        : 'bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {getActivityIcon(type)}
                    <span>{getActivityName(type)}</span>
                  </button>
                );
              })}
            </div>

            {/* Expandable note input */}
            {isLoggingActivity && (
              <div className="mt-3 space-y-2 animate-in fade-in duration-100">
                <textarea
                  rows={3}
                  autoFocus
                  placeholder={isRTL ? `הוסף פירוט על ה${getActivityName(isLoggingActivity)}...` : `Write details about this ${isLoggingActivity}...`}
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsLoggingActivity(null);
                      setActivityNote('');
                    }}
                    className="px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSaveActivity}
                    disabled={isSavingActivity || !activityNote.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSavingActivity ? t.saving : `${t.logTouchpoint} ${getActivityName(isLoggingActivity)}`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#202125] px-4 gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t.timelineTab} ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'deals'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t.dealsTab} ({deals.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'reminders'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t.remindersTab} ({reminders.length})
            </button>
            <button
              onClick={() => setActiveTab('complaints')}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'complaints'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t.complaintsTab} ({complaints.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
                    {isRTL ? 'אין פעילויות שתועדו עדיין. השתמש בכפתורים למעלה לתיעוד שיחה, דוא"ל או פגישה.' : 'No activity recorded yet. Click one of the buttons above to log a call, email, or note.'}
                  </div>
                ) : (
                  <div className={`relative ${isRTL ? 'pr-6 before:right-2.5' : 'pl-6 before:left-2.5'} space-y-4 before:absolute before:top-2 before:bottom-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-700`}>
                    {activities.map((act) => (
                      <div key={act.id} className="relative group">
                        <div className={`absolute ${isRTL ? '-right-6' : '-left-6'} top-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center`}>
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 mb-1">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{getActivityName(act.type)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {act.created_at}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {act.notes}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deals Tab */}
            {activeTab === 'deals' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.deals}</span>
                  <button
                    onClick={() => onOpenQuickAdd('deal', contact.id)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {t.addDeal}
                  </button>
                </div>

                {deals.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs">
                    {isRTL ? 'אין עסקאות משויכות לאיש קשר זה.' : 'No active deals associated with this contact.'}
                  </div>
                ) : (
                  deals.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{d.title}</h4>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(d.value)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {getStageName(d.stage)}
                        </span>
                        {d.close_date && <span>{d.close_date}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.reminders}</span>
                  <button
                    onClick={() => onOpenQuickAdd('reminder', contact.id)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {t.addTask}
                  </button>
                </div>

                {reminders.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs">
                    {isRTL ? 'אין משימות או תזכורות לאיש קשר זה.' : 'No tasks or reminders logged for this contact.'}
                  </div>
                ) : (
                  reminders.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={Boolean(r.completed)}
                          onChange={() => handleToggleReminder(r.id, r.completed)}
                          className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 focus:ring-0 cursor-pointer"
                        />
                        <span className={`truncate ${r.completed ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-200 font-medium'}`}>
                          {r.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[11px]">
                        <span className={`px-1.5 py-0.2 rounded font-medium ${
                          r.priority === 'High' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : r.priority === 'Med' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}>
                          {getPriorityName(r.priority)}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-500">{r.due_date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Complaints Tab */}
            {activeTab === 'complaints' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{t.complaints}</span>
                  <button
                    onClick={() => onOpenQuickAdd('complaint', contact.id)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {t.logTicket}
                  </button>
                </div>

                {complaints.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs">
                    {isRTL ? 'אין פניות או תלונות משויכות לאיש קשר זה.' : 'No complaints registered for this contact.'}
                  </div>
                ) : (
                  complaints.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{c.title}</h4>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                          c.severity === 'High' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {getSeverityName(c.severity)}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">{c.description}</p>
                      <div className="pt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                        {isRTL ? 'סטטוס: ' : 'Status: '}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{getStatusName(c.status)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Drawer Bar */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px]">ID: {contact.id}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 rounded text-zinc-700 dark:text-zinc-200 font-medium cursor-pointer"
          >
            {t.closeSheet}
          </button>
        </div>
      </div>
    </div>
  );
};
