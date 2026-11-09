import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Contact, Company } from '../../lib/crmLogic.ts';
import { crmDb } from '../../db/crmDatabase.ts';
import { useTranslation } from '../../lib/i18n.tsx';

interface ContactsViewProps {
  contacts: Contact[];
  companies: Company[];
  onDataChanged: () => void;
  onOpenQuickAdd: (type?: string) => void;
  onSelectContact: (contactId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  companies,
  onDataChanged,
  onOpenQuickAdd,
  onSelectContact,
}) => {
  const { t, isRTL, language } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');

  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const filteredContacts = contacts.filter((c) => {
    const q = searchTerm.toLowerCase();
    const compName = c.company_id ? companyMap.get(c.company_id)?.name.toLowerCase() : '';
    const matchesSearch =
      !searchTerm.trim() ||
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q)) ||
      compName?.includes(q);

    const matchesCompany = selectedCompanyId === 'all' || c.company_id === selectedCompanyId;

    return matchesSearch && matchesCompany;
  });

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`${t.deleteConfirm} "${name}"`)) {
      await crmDb.deleteContact(id);
      onDataChanged();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.contacts}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {contacts.length} {t.contacts} • {companies.length} {t.acrossCompanies}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Company filter */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
          >
            <option value="all">{t.filterCompanies}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="relative">
            <Search className={`w-3.5 h-3.5 text-zinc-400 absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <input
              type="text"
              placeholder={t.searchContacts}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 w-52 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'
              }`}
            />
          </div>

          <button
            onClick={() => onOpenQuickAdd('contact')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.createRecord} {t.contacts}</span>
          </button>
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="bg-white dark:bg-[#202125] rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-[#18181b] border-b border-zinc-200/80 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colContact}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colCompany}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colRole}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colEmail}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.colPhone}</th>
                <th className={`py-3 px-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    <Users className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                      {language === 'he' ? 'אין אנשי קשר עדיין' : 'No contacts yet'}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 mb-3">
                      {language === 'he' ? 'הוסף איש קשר ראשון למערכת המקומית שלך' : 'Add your first contact to begin tracking relationships locally.'}
                    </p>
                    <button
                      onClick={() => onOpenQuickAdd('contact')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.createRecord} {t.contacts}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => {
                  const company = contact.company_id ? companyMap.get(contact.company_id) : null;
                  return (
                    <tr
                      key={contact.id}
                      onClick={() => onSelectContact(contact.id)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200/80 text-zinc-800 font-semibold flex items-center justify-center text-[11px]">
                            {contact.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-900 group-hover:text-zinc-950">
                            {contact.name}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-3 px-4">
                        {company ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700">
                            <Building2 className="w-3 h-3 text-zinc-400" />
                            {company.name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 text-zinc-600 font-medium">
                        {contact.role || <span className="text-zinc-400">—</span>}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4">
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-zinc-600 hover:text-zinc-900 hover:underline flex items-center gap-1.5"
                          >
                            <Mail className="w-3 h-3 text-zinc-400" />
                            <span>{contact.email}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5"
                          >
                            <Phone className="w-3 h-3 text-zinc-400" />
                            <span dir="ltr">{contact.phone}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={`py-3 px-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <div className={`flex items-center gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          <button
                            onClick={(e) => handleDelete(e, contact.id, contact.name)}
                            className="p-1 text-zinc-300 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="p-1 text-zinc-400 group-hover:text-zinc-700">
                            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
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

        {/* Footer info */}
        <div className="p-3 border-t border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
          <span>{filteredContacts.length} / {contacts.length} {t.contacts}</span>
          <span className="text-[11px] text-zinc-400">
            {language === 'he' ? 'לחץ על שורה לפתיחת ציר הזמן והעסקאות של איש הקשר' : 'Click any row to open the timeline & deal drawer'}
          </span>
        </div>
      </div>
    </div>
  );
};
