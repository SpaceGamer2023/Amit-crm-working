import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus,
  Search,
  Calendar,
  Building2,
  Users,
  Trash2,
} from 'lucide-react';
import {
  Deal,
  DealStage,
  DEAL_STAGES,
  Company,
  Contact,
  formatCurrency,
} from '../../lib/crmLogic.ts';
import { crmDb } from '../../db/crmDatabase.ts';
import { useTranslation } from '../../lib/i18n.tsx';

interface DealsKanbanViewProps {
  deals: Deal[];
  companies: Company[];
  contacts: Contact[];
  onDataChanged: () => void;
  onOpenQuickAdd: (type?: string, defaultStage?: DealStage) => void;
  onOpenContactDrawer: (contactId: string) => void;
}

export const DealsKanbanView: React.FC<DealsKanbanViewProps> = ({
  deals,
  companies,
  contacts,
  onDataChanged,
  onOpenQuickAdd,
  onOpenContactDrawer,
}) => {
  const { t, isRTL, getStageName } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // Filtered deals
  const filteredDeals = deals.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const comp = d.company_id ? companyMap.get(d.company_id)?.name.toLowerCase() : '';
    const cont = d.contact_id ? contactMap.get(d.contact_id)?.name.toLowerCase() : '';
    return (
      d.title.toLowerCase().includes(q) ||
      comp?.includes(q) ||
      cont?.includes(q) ||
      String(d.value).includes(q)
    );
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    // If moved to Won, celebrate with confetti!
    if (targetStage === 'Won') {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch (e) {
        // Safe fallback
      }
    }

    await crmDb.updateDealStage(dealId, targetStage);
    onDataChanged();
  };

  const handleDeleteDeal = async (dealId: string, title: string) => {
    if (confirm(t.deleteConfirm)) {
      await crmDb.deleteDeal(dealId);
      onDataChanged();
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.deals}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.dealsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-zinc-400 absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <input
              type="text"
              placeholder={t.searchDeals}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 w-48 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 ${
                isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'
              }`}
            />
          </div>

          <button
            onClick={() => onOpenQuickAdd('deal')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addDeal}</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container (Horizontal Scroll) */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px] h-full items-start">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
            const isTarget = dragOverStage === stage;

            const getStageHeaderColor = () => {
              if (stage === 'Won') return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
              if (stage === 'Lost') return 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
              if (stage === 'Proposal Sent') return 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
              return 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
            };

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                className={`w-72 flex flex-col rounded-xl border bg-zinc-50/60 dark:bg-[#202125]/90 max-h-full transition-colors ${
                  isTarget
                    ? 'border-zinc-900 dark:border-zinc-400 bg-zinc-100/90 dark:bg-zinc-800 ring-2 ring-zinc-900/10 dark:ring-zinc-400/20'
                    : 'border-zinc-200/80 dark:border-zinc-700/80'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 border-b rounded-t-xl flex items-center justify-between ${getStageHeaderColor()}`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">{getStageName(stage)}</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium opacity-80 mt-0.5">
                      {formatCurrency(totalStageValue)}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenQuickAdd('deal', stage)}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
                    title={`Add deal to ${getStageName(stage)}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Body Cards List */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1 min-h-[160px]">
                  {stageDeals.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-zinc-200/80 dark:border-zinc-700/80 rounded-lg text-zinc-400 dark:text-zinc-500 text-xs text-center p-2">
                      {t.dropDealsHere}
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const company = deal.company_id ? companyMap.get(deal.company_id) : null;
                      const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          className="p-3 bg-white dark:bg-[#18181b] rounded-lg border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs hover:shadow-xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-grab active:cursor-grabbing group space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                              {deal.title}
                            </h4>
                            <button
                              onClick={() => handleDeleteDeal(deal.id, deal.title)}
                              className="text-zinc-300 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer shrink-0"
                              title="Delete deal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {formatCurrency(deal.value, deal.currency)}
                          </div>

                          <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {company && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{company.name}</span>
                              </div>
                            )}

                            {contact && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Users className="w-3 h-3 text-zinc-400 shrink-0" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenContactDrawer(contact.id);
                                  }}
                                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:underline truncate"
                                >
                                  {contact.name}
                                </button>
                              </div>
                            )}

                            {deal.close_date && (
                              <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                                <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                                <span>{deal.close_date}</span>
                              </div>
                            )}
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
