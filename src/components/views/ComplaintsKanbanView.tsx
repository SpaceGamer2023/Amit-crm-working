import React, { useState } from 'react';
import {
  AlertCircle,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  Complaint,
  ComplaintStatus,
  COMPLAINT_STATUSES,
  Severity,
  Contact,
} from '../../lib/crmLogic.ts';
import { crmDb } from '../../db/crmDatabase.ts';
import { useTranslation } from '../../lib/i18n.tsx';

interface ComplaintsKanbanViewProps {
  complaints: Complaint[];
  contacts: Contact[];
  onDataChanged: () => void;
  onOpenQuickAdd: (type?: string) => void;
  onOpenContactDrawer: (contactId: string) => void;
}

export const ComplaintsKanbanView: React.FC<ComplaintsKanbanViewProps> = ({
  complaints,
  contacts,
  onDataChanged,
  onOpenQuickAdd,
  onOpenContactDrawer,
}) => {
  const { t, isRTL, getStatusName, getSeverityName } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [draggedComplaintId, setDraggedComplaintId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ComplaintStatus | null>(null);

  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      !searchTerm.trim() ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = severityFilter === 'all' || c.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedComplaintId(id);
  };

  const handleDragOver = (e: React.DragEvent, status: ComplaintStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ComplaintStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData('text/plain') || draggedComplaintId;
    if (!id) return;

    await crmDb.updateComplaintStatus(id, targetStatus);
    onDataChanged();
  };

  const handleDeleteComplaint = async (id: string, title: string) => {
    if (confirm(t.deleteConfirm)) {
      await crmDb.deleteComplaint(id);
      onDataChanged();
    }
  };

  const handleMoveStatus = async (id: string, nextStatus: ComplaintStatus) => {
    await crmDb.updateComplaintStatus(id, nextStatus);
    onDataChanged();
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.complaints}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.complaintsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-200 focus:outline-hidden"
          >
            <option value="all">{t.filterSeverities}</option>
            <option value="High">{getSeverityName('High')}</option>
            <option value="Med">{getSeverityName('Med')}</option>
            <option value="Low">{getSeverityName('Low')}</option>
          </select>

          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-zinc-400 absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <input
              type="text"
              placeholder={t.searchComplaints}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 w-48 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 ${
                isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'
              }`}
            />
          </div>

          <button
            onClick={() => onOpenQuickAdd('complaint')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.logTicket}</span>
          </button>
        </div>
      </div>

      {/* Kanban 3-Column Layout */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-start min-w-[800px]">
          {COMPLAINT_STATUSES.map((status) => {
            const statusComplaints = filteredComplaints.filter((c) => c.status === status);
            const isTarget = dragOverStatus === status;

            const getHeaderStyle = () => {
              if (status === 'Open') return 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300';
              if (status === 'In Progress') return 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300';
              return 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300';
            };

            return (
              <div
                key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex flex-col rounded-xl border bg-zinc-50/60 dark:bg-[#202125]/90 max-h-full transition-colors ${
                  isTarget ? 'border-zinc-900 dark:border-zinc-400 bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-900/10 dark:ring-zinc-400/20' : 'border-zinc-200/80 dark:border-zinc-700/80'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b rounded-t-xl flex items-center justify-between ${getHeaderStyle()}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{getStatusName(status)}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-white/90 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                      {statusComplaints.length}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenQuickAdd('complaint')}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Complaints Cards List */}
                <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[200px]">
                  {statusComplaints.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-700/80 rounded-lg text-zinc-400 dark:text-zinc-500 text-xs text-center p-3">
                      {t.noComplaintsIn} {getStatusName(status)}
                    </div>
                  ) : (
                    statusComplaints.map((item) => {
                      const contact = item.contact_id ? contactMap.get(item.contact_id) : null;
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          className="p-3.5 bg-white dark:bg-[#18181b] rounded-lg border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-grab active:cursor-grabbing group space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                              {item.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                item.severity === 'High'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : item.severity === 'Med'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              {getSeverityName(item.severity)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                            {contact ? (
                              <button
                                onClick={() => onOpenContactDrawer(contact.id)}
                                className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:underline truncate"
                              >
                                <Users className="w-3 h-3 text-zinc-400" />
                                <span className="truncate">{contact.name}</span>
                              </button>
                            ) : (
                              <span>{t.noContactAssigned}</span>
                            )}

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              {status === 'Open' && (
                                <button
                                  onClick={() => handleMoveStatus(item.id, 'In Progress')}
                                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium cursor-pointer"
                                  title={t.moveToInProgress}
                                >
                                  {t.moveToInProgress}
                                </button>
                              )}
                              {status === 'In Progress' && (
                                <button
                                  onClick={() => handleMoveStatus(item.id, 'Resolved')}
                                  className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-medium cursor-pointer"
                                  title={t.markResolved}
                                >
                                  {t.markResolved}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComplaint(item.id, item.title)}
                                className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                                title="Delete ticket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
