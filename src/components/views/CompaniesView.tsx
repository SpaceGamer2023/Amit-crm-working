import React, { useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Globe,
  Phone,
  Users,
  DollarSign,
  Trash2,
  ChevronRight,
  X,
  Edit2,
} from 'lucide-react';
import { Company, Contact, Deal, formatCurrency } from '../../lib/crmLogic.ts';
import { crmDb } from '../../db/crmDatabase.ts';
import { useTranslation } from '../../lib/i18n.tsx';

interface CompaniesViewProps {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  onDataChanged: () => void;
  onOpenQuickAdd: (type?: string, contactId?: string) => void;
  onSelectContact: (contactId: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  contacts,
  deals,
  onDataChanged,
  onOpenQuickAdd,
  onSelectContact,
}) => {
  const { t, isRTL, getStageName } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', industry: '', website: '', phone: '' });

  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      !searchTerm.trim() ||
      c.name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.website && c.website.toLowerCase().includes(q))
    );
  });

  const getCompanyStats = (companyId: string) => {
    const compContacts = contacts.filter((ct) => ct.company_id === companyId);
    const compDeals = deals.filter((d) => d.company_id === companyId);
    const totalPipeline = compDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    return { compContacts, compDeals, totalPipeline };
  };

  const handleDeleteCompany = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(t.deleteConfirm)) {
      await crmDb.deleteCompany(id);
      if (selectedCompany?.id === id) setSelectedCompany(null);
      onDataChanged();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    await crmDb.saveCompany({
      id: selectedCompany.id,
      name: editForm.name,
      industry: editForm.industry,
      website: editForm.website,
      phone: editForm.phone,
    });
    setIsEditing(false);
    setSelectedCompany({
      ...selectedCompany,
      ...editForm,
    });
    onDataChanged();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.companies}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {companies.length} {t.companiesSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-zinc-400 absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <input
              type="text"
              placeholder={t.searchCompanies}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 w-52 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 ${
                isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'
              }`}
            />
          </div>

          <button
            onClick={() => onOpenQuickAdd('company')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addCompany}</span>
          </button>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-[#202125] rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-700 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colCompany}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colIndustry}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colWebsite}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colPhone}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.contacts}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colValue}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        {isRTL ? 'לא נמצאו חברות במאגר המקומי' : 'No companies found in local database'}
                      </p>
                      <button
                        onClick={() => onOpenQuickAdd('company')}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t.addCompany}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => {
                  const { compContacts, totalPipeline } = getCompanyStats(comp.id);
                  return (
                    <tr
                      key={comp.id}
                      onClick={() => {
                        setSelectedCompany(comp);
                        setEditForm({
                          name: comp.name,
                          industry: comp.industry || '',
                          website: comp.website || '',
                          phone: comp.phone || '',
                        });
                        setIsEditing(false);
                      }}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{comp.name}</span>
                      </td>

                      {/* Industry */}
                      <td className="py-3 px-4">
                        {comp.industry ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {comp.industry}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Website */}
                      <td className="py-3 px-4">
                        {comp.website ? (
                          <a
                            href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:underline flex items-center gap-1 max-w-[140px] truncate"
                          >
                            <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{comp.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                        {comp.phone || <span className="text-zinc-400 dark:text-zinc-600">—</span>}
                      </td>

                      {/* Contacts Count */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          <Users className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                          {compContacts.length}
                        </span>
                      </td>

                      {/* Pipeline Value */}
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPipeline > 0 ? formatCurrency(totalPipeline) : <span className="text-zinc-400 dark:text-zinc-600 font-normal">$0</span>}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDeleteCompany(e, comp.id, comp.name)}
                            className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="p-1 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Detail Drawer / Modal */}
      {selectedCompany && (
        <div className={`fixed inset-0 z-40 flex ${isRTL ? 'justify-start' : 'justify-end'} bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-150`}>
          <div
            className={`w-full max-w-lg bg-white dark:bg-[#202125] h-full shadow-2xl ${isRTL ? 'border-r animate-in slide-in-from-left' : 'border-l animate-in slide-in-from-right'} border-zinc-200 dark:border-zinc-700 flex flex-col justify-between overflow-hidden duration-200`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-start justify-between bg-zinc-50/60 dark:bg-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{selectedCompany.name}</h3>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded cursor-pointer"
                      title={t.editCompany}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedCompany.industry || 'Organization'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCompany(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{t.editCompany}</h4>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colCompany}</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colIndustry}</label>
                    <input
                      type="text"
                      value={editForm.industry}
                      onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colWebsite}</label>
                    <input
                      type="url"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 dark:text-zinc-400">{t.colPhone}</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100"
                    />
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
                      className="px-2.5 py-1 text-xs rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium cursor-pointer"
                    >
                      {t.save}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedCompany.website && (
                    <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold block">{t.colWebsite}</span>
                      <a
                        href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{selectedCompany.website}</span>
                      </a>
                    </div>
                  )}
                  {selectedCompany.phone && (
                    <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-semibold block">{t.colPhone}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        {selectedCompany.phone}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Associated Contacts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {t.contacts} ({contacts.filter((c) => c.company_id === selectedCompany.id).length})
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedCompany(null);
                      onOpenQuickAdd('contact');
                    }}
                    className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {t.addContact}
                  </button>
                </div>

                <div className="space-y-2">
                  {contacts
                    .filter((c) => c.company_id === selectedCompany.id)
                    .map((ct) => (
                      <div
                        key={ct.id}
                        onClick={() => {
                          setSelectedCompany(null);
                          onSelectContact(ct.id);
                        }}
                        className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{ct.name}</h5>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{ct.role || ct.email}</p>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-zinc-400 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    ))}
                </div>
              </div>

              {/* Associated Deals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {t.deals} ({deals.filter((d) => d.company_id === selectedCompany.id).length})
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedCompany(null);
                      onOpenQuickAdd('deal');
                    }}
                    className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {t.addDeal}
                  </button>
                </div>

                <div className="space-y-2">
                  {deals
                    .filter((d) => d.company_id === selectedCompany.id)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/70 flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{d.title}</h5>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 mt-1 inline-block">
                            {getStageName(d.stage)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-end">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 rounded cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
