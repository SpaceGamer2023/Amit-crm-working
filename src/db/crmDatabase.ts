import { Database, migrateLegacyBrowserData, TauriSqlDatabase } from './sqliteAdapter.ts';
import {
  Company,
  Contact,
  Deal,
  Reminder,
  Complaint,
  Activity,
  DealStage,
  ComplaintStatus,
  Severity,
  Priority,
  ActivityType,
} from '../lib/crmLogic.ts';

const DB_PATH = 'sqlite:crm.db';

export class CrmDatabase {
  private static instance: CrmDatabase | null = null;
  private db: TauriSqlDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  public static getInstance(): CrmDatabase {
    if (!CrmDatabase.instance) {
      CrmDatabase.instance = new CrmDatabase();
    }
    return CrmDatabase.instance;
  }

  public async getDb(): Promise<TauriSqlDatabase> {
    if (!this.db) {
      this.db = await Database.load(DB_PATH);
    }
    if (!this.initPromise) {
      this.initPromise = this.initSchemaAndSeed();
    }
    await this.initPromise;
    return this.db;
  }

  private async initSchemaAndSeed(): Promise<void> {
    if (!this.db) return;

    // 1. Create tables exactly matching user requirements
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        phone TEXT
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        company_id TEXT,
        title TEXT NOT NULL,
        value REAL NOT NULL,
        stage TEXT NOT NULL,
        close_date TEXT,
        currency TEXT DEFAULT 'ILS'
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        priority TEXT NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        type TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // Move any existing browser-backed CRM records into native SQLite before initializing the app.
    const migrationStatus = await migrateLegacyBrowserData(this.db, DB_PATH);

    // Do not purge existing records during first launch or after a localStorage marker is lost.
    if (typeof window !== 'undefined') {
      const cleaned = window.localStorage.getItem('amit_crm_cleaned_examples');
      if (cleaned !== 'true') {
        if (migrationStatus === 'no-legacy-data' && !(await this.hasAnyRecords())) {
          await this.clearAllData();
        }
        window.localStorage.setItem('amit_crm_cleaned_examples', 'true');
      }
    }
  }

  private async hasAnyRecords(): Promise<boolean> {
    if (!this.db) return false;

    for (const table of ['companies', 'contacts', 'deals', 'reminders', 'complaints', 'activities']) {
      const rows = await this.db.select(`SELECT id FROM ${table} LIMIT 1`);
      if (rows.length > 0) return true;
    }
    return false;
  }

  public async clearAllData(): Promise<void> {
    if (!this.db) return;
    await this.db.execute('DELETE FROM activities');
    await this.db.execute('DELETE FROM complaints');
    await this.db.execute('DELETE FROM reminders');
    await this.db.execute('DELETE FROM deals');
    await this.db.execute('DELETE FROM contacts');
    await this.db.execute('DELETE FROM companies');
  }

  public async seedInitialData(): Promise<void> {
    if (!this.db) return;

    // Clear existing
    await this.clearAllData();

    // Companies
    const seedCompanies: Company[] = [
      { id: 'comp_1', name: 'Supabase Inc.', industry: 'Developer Tools', website: 'https://supabase.com', phone: '+1-415-555-0101' },
      { id: 'comp_2', name: 'Raycast Technologies', industry: 'Productivity Software', website: 'https://raycast.com', phone: '+44-20-7946-0123' },
      { id: 'comp_3', name: 'Retool Software', industry: 'Enterprise Low-Code', website: 'https://retool.com', phone: '+1-415-555-0182' },
      { id: 'comp_4', name: 'Linear Systems', industry: 'Project Management', website: 'https://linear.app', phone: '+1-415-555-0199' },
      { id: 'comp_5', name: 'Vercel Platform', industry: 'Cloud Infrastructure', website: 'https://vercel.com', phone: '+1-415-555-0130' },
    ];

    for (const c of seedCompanies) {
      await this.db.execute(
        'INSERT INTO companies (id, name, industry, website, phone) VALUES (?, ?, ?, ?, ?)',
        [c.id, c.name, c.industry || '', c.website || '', c.phone || '']
      );
    }

    // Contacts
    const seedContacts: Contact[] = [
      { id: 'cont_1', company_id: 'comp_1', name: 'Paul Copplestone', email: 'paul@supabase.io', phone: '+1-415-555-1101', role: 'Chief Executive Officer' },
      { id: 'cont_2', company_id: 'comp_1', name: 'Ant Wilson', email: 'ant@supabase.io', phone: '+1-415-555-1102', role: 'Co-founder & CTO' },
      { id: 'cont_3', company_id: 'comp_2', name: 'Thomas Paul Mann', email: 'thomas@raycast.com', phone: '+44-20-7946-1123', role: 'CEO & Co-founder' },
      { id: 'cont_4', company_id: 'comp_3', name: 'David Hsu', email: 'david@retool.com', phone: '+1-415-555-1182', role: 'CEO & Founder' },
      { id: 'cont_5', company_id: 'comp_4', name: 'Karri Saarinen', email: 'karri@linear.app', phone: '+1-415-555-1199', role: 'CEO & Co-founder' },
      { id: 'cont_6', company_id: 'comp_4', name: 'Tuomas Artman', email: 'tuomas@linear.app', phone: '+1-415-555-1198', role: 'CTO & Co-founder' },
      { id: 'cont_7', company_id: 'comp_5', name: 'Guillermo Rauch', email: 'guillermo@vercel.com', phone: '+1-415-555-1130', role: 'CEO & Founder' },
      { id: 'cont_8', company_id: 'comp_5', name: 'Lee Robinson', email: 'lee@vercel.com', phone: '+1-415-555-1131', role: 'VP of Product' },
    ];

    for (const c of seedContacts) {
      await this.db.execute(
        'INSERT INTO contacts (id, company_id, name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.company_id || '', c.name, c.email || '', c.phone || '', c.role || '']
      );
    }

    // Deals across all stages
    const seedDeals: Deal[] = [
      { id: 'deal_1', contact_id: 'cont_1', company_id: 'comp_1', title: 'Enterprise Dedicated Cluster Tier', value: 48000, stage: 'Proposal Sent', close_date: '2026-11-25' },
      { id: 'deal_2', contact_id: 'cont_3', company_id: 'comp_2', title: 'Global Team 500-Seat Pro Plan', value: 24000, stage: 'Qualified', close_date: '2026-11-18' },
      { id: 'deal_3', contact_id: 'cont_4', company_id: 'comp_3', title: 'Custom On-Prem Orchestration Suite', value: 75000, stage: 'Won', close_date: '2026-11-04' },
      { id: 'deal_4', contact_id: 'cont_6', company_id: 'comp_4', title: 'SOC2 Type II Compliance Add-on', value: 16000, stage: 'Lead', close_date: '2026-12-05' },
      { id: 'deal_5', contact_id: 'cont_7', company_id: 'comp_5', title: 'High-Concurrency Edge CDN Contract', value: 110000, stage: 'Proposal Needed', close_date: '2026-11-30' },
      { id: 'deal_6', contact_id: 'cont_2', company_id: 'comp_1', title: 'Multi-Region Read Replica Addon', value: 32000, stage: 'Won', close_date: '2026-10-28' },
      { id: 'deal_7', contact_id: 'cont_4', company_id: 'comp_3', title: 'Legacy Bridge Connector Pilot', value: 9500, stage: 'Lost', close_date: '2026-10-15' },
      { id: 'deal_8', contact_id: 'cont_8', company_id: 'comp_5', title: 'Realtime Observability Integration', value: 42000, stage: 'Proposal Sent', close_date: '2026-12-10' },
    ];

    for (const d of seedDeals) {
      await this.db.execute(
        'INSERT INTO deals (id, contact_id, company_id, title, value, stage, close_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [d.id, d.contact_id || '', d.company_id || '', d.title, d.value, d.stage, d.close_date || '']
      );
    }

    // Reminders
    const seedReminders: Reminder[] = [
      { id: 'rem_1', contact_id: 'cont_1', title: 'Call Paul on Dedicated Cluster proposal review', due_date: '2026-11-08', completed: 0, priority: 'High' },
      { id: 'rem_2', contact_id: 'cont_3', title: 'Send Raycast team license agreement draft', due_date: '2026-11-08', completed: 0, priority: 'Med' },
      { id: 'rem_3', contact_id: 'cont_7', title: 'Overdue follow-up on Vercel security questionnaire', due_date: '2026-11-06', completed: 0, priority: 'High' },
      { id: 'rem_4', contact_id: 'cont_6', title: 'Prepare Linear slide deck for SOC2 sync', due_date: '2026-11-12', completed: 0, priority: 'Low' },
      { id: 'rem_5', contact_id: 'cont_8', title: 'Review Observability architecture spec', due_date: '2026-11-19', completed: 0, priority: 'Med' },
      { id: 'rem_6', contact_id: 'cont_4', title: 'Retool contract signing confirmation', due_date: '2026-11-02', completed: 1, priority: 'High' },
    ];

    for (const r of seedReminders) {
      await this.db.execute(
        'INSERT INTO reminders (id, contact_id, title, due_date, completed, priority) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.contact_id || '', r.title, r.due_date, r.completed, r.priority]
      );
    }

    // Complaints
    const seedComplaints: Complaint[] = [
      { id: 'comp_c1', contact_id: 'cont_1', title: 'Latency spikes on EU West database gateway', status: 'Open', severity: 'High', description: 'Customer logged 800ms response delays during European peak trading hours. Investigating connection pooling.' },
      { id: 'comp_c2', contact_id: 'cont_3', title: 'Missing tax exemption certificate in invoice', status: 'In Progress', severity: 'Low', description: 'Finance team needs updated VAT registration certificate regenerated for the Q3 statement.' },
      { id: 'comp_c3', contact_id: 'cont_4', title: 'Webhook timeouts on heavy JSON payloads (>10MB)', status: 'Open', severity: 'Med', description: 'Large batch payload ingestion triggered 504 Gateway Timeouts. Needs streaming upload adapter.' },
      { id: 'comp_c4', contact_id: 'cont_6', title: 'SAML Single Sign-On certificate expired', status: 'Resolved', severity: 'High', description: 'Re-uploaded signing certificate in Okta dashboard. SSO login restored.' },
      { id: 'comp_c5', contact_id: 'cont_8', title: 'Saved dashboard filter preferences reset', status: 'Resolved', severity: 'Low', description: 'Fixed in latest release by writing active filters to local SQLite cache.' },
    ];

    for (const c of seedComplaints) {
      await this.db.execute(
        'INSERT INTO complaints (id, contact_id, title, status, severity, description) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.contact_id || '', c.title, c.status, c.severity, c.description || '']
      );
    }

    // Activities
    const seedActivities: Activity[] = [
      { id: 'act_1', contact_id: 'cont_1', type: 'Call', notes: 'Walked through proposal terms. Paul agreed on the pricing structure with annual billing.', created_at: '2026-11-07 15:30' },
      { id: 'act_2', contact_id: 'cont_3', type: 'Email', notes: 'Sent Raycast team trial activation keys and team workspace configuration guide.', created_at: '2026-11-06 10:15' },
      { id: 'act_3', contact_id: 'cont_7', type: 'Meeting', notes: 'Executive roadmap presentation. Guillermo confirmed interest in CDN expansion.', created_at: '2026-11-05 14:00' },
      { id: 'act_4', contact_id: 'cont_4', type: 'Note', notes: 'David mentioned Retool is expanding their engineering team by 40% next quarter.', created_at: '2026-11-04 11:20' },
      { id: 'act_5', contact_id: 'cont_8', type: 'Call', notes: 'Discussed technical prerequisites for frontend telemetry pipeline.', created_at: '2026-11-03 16:45' },
      { id: 'act_6', contact_id: 'cont_6', type: 'Meeting', notes: 'Reviewed SOC2 checklist and data residency parameters.', created_at: '2026-11-02 09:30' },
    ];

    for (const a of seedActivities) {
      await this.db.execute(
        'INSERT INTO activities (id, contact_id, type, notes, created_at) VALUES (?, ?, ?, ?, ?)',
        [a.id, a.contact_id || '', a.type, a.notes, a.created_at]
      );
    }
  }

  // --- Companies CRUD ---
  public async getCompanies(): Promise<Company[]> {
    const db = await this.getDb();
    return db.select<Company>('SELECT * FROM companies ORDER BY name ASC');
  }

  public async getCompanyById(id: string): Promise<Company | null> {
    const db = await this.getDb();
    const rows = await db.select<Company>('SELECT * FROM companies WHERE id = ?', [id]);
    return rows[0] || null;
  }

  public async saveCompany(company: Partial<Company> & { name: string }): Promise<string> {
    const db = await this.getDb();
    const id = company.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (company.id) {
      await db.execute(
        'UPDATE companies SET name = ?, industry = ?, website = ?, phone = ? WHERE id = ?',
        [company.name, company.industry || '', company.website || '', company.phone || '', id]
      );
    } else {
      await db.execute(
        'INSERT INTO companies (id, name, industry, website, phone) VALUES (?, ?, ?, ?, ?)',
        [id, company.name, company.industry || '', company.website || '', company.phone || '']
      );
    }
    return id;
  }

  public async deleteCompany(id: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM companies WHERE id = ?', [id]);
  }

  // --- Contacts CRUD ---
  public async getContacts(): Promise<Contact[]> {
    const db = await this.getDb();
    return db.select<Contact>('SELECT * FROM contacts ORDER BY name ASC');
  }

  public async getContactById(id: string): Promise<Contact | null> {
    const db = await this.getDb();
    const rows = await db.select<Contact>('SELECT * FROM contacts WHERE id = ?', [id]);
    return rows[0] || null;
  }

  public async saveContact(contact: Partial<Contact> & { name: string }): Promise<string> {
    const db = await this.getDb();
    const id = contact.id || `cont_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (contact.id) {
      await db.execute(
        'UPDATE contacts SET company_id = ?, name = ?, email = ?, phone = ?, role = ? WHERE id = ?',
        [contact.company_id || '', contact.name, contact.email || '', contact.phone || '', contact.role || '', id]
      );
    } else {
      await db.execute(
        'INSERT INTO contacts (id, company_id, name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        [id, contact.company_id || '', contact.name, contact.email || '', contact.phone || '', contact.role || '']
      );
    }
    return id;
  }

  public async deleteContact(id: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM contacts WHERE id = ?', [id]);
  }

  // --- Deals CRUD ---
  public async getDeals(): Promise<Deal[]> {
    const db = await this.getDb();
    return db.select<Deal>('SELECT * FROM deals ORDER BY value DESC');
  }

  public async getDealsByContact(contactId: string): Promise<Deal[]> {
    const db = await this.getDb();
    return db.select<Deal>('SELECT * FROM deals WHERE contact_id = ?', [contactId]);
  }

  public async saveDeal(deal: Partial<Deal> & { title: string; value: number; stage: DealStage }): Promise<string> {
    const db = await this.getDb();
    const id = deal.id || `deal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const curr = deal.currency || 'ILS';
    if (deal.id) {
      await db.execute(
        'UPDATE deals SET contact_id = ?, company_id = ?, title = ?, value = ?, stage = ?, close_date = ?, currency = ? WHERE id = ?',
        [deal.contact_id || '', deal.company_id || '', deal.title, deal.value, deal.stage, deal.close_date || '', curr, id]
      );
    } else {
      await db.execute(
        'INSERT INTO deals (id, contact_id, company_id, title, value, stage, close_date, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, deal.contact_id || '', deal.company_id || '', deal.title, deal.value, deal.stage, deal.close_date || '', curr]
      );
    }
    return id;
  }

  public async updateDealStage(id: string, stage: DealStage): Promise<void> {
    const db = await this.getDb();
    await db.execute('UPDATE deals SET stage = ? WHERE id = ?', [stage, id]);
  }

  public async deleteDeal(id: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM deals WHERE id = ?', [id]);
  }

  // --- Reminders CRUD ---
  public async getReminders(): Promise<Reminder[]> {
    const db = await this.getDb();
    return db.select<Reminder>('SELECT * FROM reminders ORDER BY due_date ASC');
  }

  public async getRemindersByContact(contactId: string): Promise<Reminder[]> {
    const db = await this.getDb();
    return db.select<Reminder>('SELECT * FROM reminders WHERE contact_id = ?', [contactId]);
  }

  public async saveReminder(reminder: Partial<Reminder> & { title: string; due_date: string; priority: Priority }): Promise<string> {
    const db = await this.getDb();
    const id = reminder.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const completed = reminder.completed !== undefined ? reminder.completed : 0;
    if (reminder.id) {
      await db.execute(
        'UPDATE reminders SET contact_id = ?, title = ?, due_date = ?, completed = ?, priority = ? WHERE id = ?',
        [reminder.contact_id || '', reminder.title, reminder.due_date, completed, reminder.priority, id]
      );
    } else {
      await db.execute(
        'INSERT INTO reminders (id, contact_id, title, due_date, completed, priority) VALUES (?, ?, ?, ?, ?, ?)',
        [id, reminder.contact_id || '', reminder.title, reminder.due_date, completed, reminder.priority]
      );
    }
    return id;
  }

  public async toggleReminderCompleted(id: string, completed: boolean): Promise<void> {
    const db = await this.getDb();
    await db.execute('UPDATE reminders SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
  }

  public async deleteReminder(id: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM reminders WHERE id = ?', [id]);
  }

  // --- Complaints CRUD ---
  public async getComplaints(): Promise<Complaint[]> {
    const db = await this.getDb();
    return db.select<Complaint>('SELECT * FROM complaints ORDER BY severity DESC');
  }

  public async saveComplaint(complaint: Partial<Complaint> & { title: string; status: ComplaintStatus; severity: Severity }): Promise<string> {
    const db = await this.getDb();
    const id = complaint.id || `comp_c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (complaint.id) {
      await db.execute(
        'UPDATE complaints SET contact_id = ?, title = ?, status = ?, severity = ?, description = ? WHERE id = ?',
        [complaint.contact_id || '', complaint.title, complaint.status, complaint.severity, complaint.description || '', id]
      );
    } else {
      await db.execute(
        'INSERT INTO complaints (id, contact_id, title, status, severity, description) VALUES (?, ?, ?, ?, ?, ?)',
        [id, complaint.contact_id || '', complaint.title, complaint.status, complaint.severity, complaint.description || '']
      );
    }
    return id;
  }

  public async updateComplaintStatus(id: string, status: ComplaintStatus): Promise<void> {
    const db = await this.getDb();
    await db.execute('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
  }

  public async deleteComplaint(id: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM complaints WHERE id = ?', [id]);
  }

  // --- Activities CRUD ---
  public async getActivities(): Promise<Activity[]> {
    const db = await this.getDb();
    return db.select<Activity>('SELECT * FROM activities ORDER BY created_at DESC');
  }

  public async getActivitiesByContact(contactId: string): Promise<Activity[]> {
    const db = await this.getDb();
    return db.select<Activity>('SELECT * FROM activities WHERE contact_id = ? ORDER BY created_at DESC', [contactId]);
  }

  public async saveActivity(activity: { contact_id?: string; type: ActivityType; notes: string; created_at?: string }): Promise<string> {
    const db = await this.getDb();
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = activity.created_at || new Date().toISOString().replace('T', ' ').substring(0, 16);
    await db.execute(
      'INSERT INTO activities (id, contact_id, type, notes, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, activity.contact_id || '', activity.type, activity.notes, now]
    );
    return id;
  }

  public async deleteActivity(id: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM activities WHERE id = ?', [id]);
  }
}

export const crmDb = CrmDatabase.getInstance();
