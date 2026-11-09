import NativeSqlDatabase from '@tauri-apps/plugin-sql';

/**
 * Local SQLite Engine & Tauri v2 `tauri-plugin-sql` adapter.
 * 
 * Provides an exact match to Tauri v2's plugin-sql Database interface:
 * `Database.load("sqlite:crm.db")` -> { execute, select }
 * 
 * Runs 100% offline, locally in-browser with IndexedDB/localStorage persistence,
 * and seamlessly bridges to native `@tauri-apps/plugin-sql` when running inside
 * the compiled desktop Tauri binary.
 */

export interface QueryResult {
  rowsAffected: number;
  lastInsertId?: string | number;
}

export interface TauriSqlDatabase {
  execute(query: string, bindValues?: any[]): Promise<QueryResult>;
  select<T = any>(query: string, bindValues?: any[]): Promise<T[]>;
  close(): Promise<boolean>;
}

// In-browser SQL engine with indexed storage
class BrowserSqliteDatabase implements TauriSqlDatabase {
  private dbName: string;
  private tables: Map<string, Array<Record<string, any>>> = new Map();
  private isLoaded = false;
  private storageKey: string;

  constructor(path: string) {
    this.dbName = path.replace(/^sqlite:/, '');
    this.storageKey = `twenty_crm_sqlite_${this.dbName}`;
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          for (const [table, rows] of Object.entries(parsed)) {
            if (Array.isArray(rows)) {
              const seen = new Set<string>();
              const deduped: Record<string, any>[] = [];
              for (const r of rows) {
                if (r.id && !seen.has(r.id)) {
                  seen.add(r.id);
                  deduped.push(r);
                } else if (!r.id) {
                  deduped.push(r);
                }
              }
              this.tables.set(table, deduped);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not read existing local SQLite storage:', e);
    }
    this.isLoaded = true;
  }

  private save(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const obj: Record<string, any[]> = {};
    for (const [table, rows] of this.tables.entries()) {
      obj[table] = rows;
    }
    window.localStorage.setItem(this.storageKey, JSON.stringify(obj));
  }

  public async execute(query: string, bindValues: any[] = []): Promise<QueryResult> {
    await this.init();
    const cleanSql = query.trim().replace(/;+$/, '');
    const upperSql = cleanSql.toUpperCase();

    // 1. CREATE TABLE
    if (upperSql.startsWith('CREATE TABLE')) {
      const match = cleanSql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        const tableName = match[1].toLowerCase();
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
          this.save();
        }
      }
      return { rowsAffected: 0 };
    }

    // 2. INSERT INTO
    if (upperSql.startsWith('INSERT INTO')) {
      const match = cleanSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const cols = match[2].split(',').map((c) => c.trim().toLowerCase());
        const row: Record<string, any> = {};

        // Assign bound or literal values
        let bindIdx = 0;
        const valTokens = match[3].split(',').map((v) => v.trim());

        cols.forEach((col, idx) => {
          const valToken = valTokens[idx];
          if (valToken === '?') {
            row[col] = bindValues[bindIdx++];
          } else {
            // strip quotes or cast
            let val: any = valToken.replace(/^['"]|['"]$/g, '');
            if (!isNaN(Number(val)) && valToken !== '') val = Number(val);
            row[col] = val;
          }
        });

        // Ensure primary key id exists
        if (!row.id) {
          row.id = 'rec_' + Math.random().toString(36).substring(2, 10);
        }

        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
        }
        const list = this.tables.get(tableName)!;
        const existingIdx = list.findIndex((r) => r.id === row.id);
        if (existingIdx >= 0) {
          list[existingIdx] = row;
        } else {
          list.push(row);
        }
        this.save();
        return { rowsAffected: 1, lastInsertId: row.id };
      }
      return { rowsAffected: 0 };
    }

    // 3. UPDATE
    if (upperSql.startsWith('UPDATE')) {
      const match = cleanSql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];

        const rows = this.tables.get(tableName) || [];
        let rowsAffected = 0;
        let bindIdx = 0;

        // Parse SET statements
        const assignments = setClause.split(',').map((part) => {
          const [c, valExpr] = part.split('=').map((s) => s.trim());
          return { col: c.toLowerCase(), isParam: valExpr === '?', literal: valExpr };
        });

        for (const row of rows) {
          let matches = true;
          if (whereClause) {
            matches = this.evaluateWhere(row, whereClause, bindValues, assignments.filter(a => a.isParam).length);
          }

          if (matches) {
            let pIdx = 0;
            for (const assign of assignments) {
              if (assign.isParam) {
                row[assign.col] = bindValues[pIdx++];
              } else {
                row[assign.col] = assign.literal.replace(/^['"]|['"]$/g, '');
              }
            }
            rowsAffected++;
          }
        }

        this.save();
        return { rowsAffected };
      }
      return { rowsAffected: 0 };
    }

    // 4. DELETE FROM
    if (upperSql.startsWith('DELETE FROM')) {
      const match = cleanSql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const whereClause = match[2];
        const rows = this.tables.get(tableName) || [];

        if (!whereClause) {
          const count = rows.length;
          this.tables.set(tableName, []);
          this.save();
          return { rowsAffected: count };
        }

        const remaining: Record<string, any>[] = [];
        let deleted = 0;

        for (const row of rows) {
          if (this.evaluateWhere(row, whereClause, bindValues, 0)) {
            deleted++;
          } else {
            remaining.push(row);
          }
        }

        this.tables.set(tableName, remaining);
        this.save();
        return { rowsAffected: deleted };
      }
      return { rowsAffected: 0 };
    }

    return { rowsAffected: 0 };
  }

  public async select<T = any>(query: string, bindValues: any[] = []): Promise<T[]> {
    await this.init();
    const cleanSql = query.trim().replace(/;+$/, '');

    // Extract table name
    const match = cleanSql.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!match) {
      // Fallback: check if simple SELECT * FROM <table>
      const fallbackMatch = cleanSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (!fallbackMatch) return [];
      const tbl = fallbackMatch[1].toLowerCase();
      return [...(this.tables.get(tbl) || [])] as unknown as T[];
    }

    const colsStr = match[1].trim();
    const tableName = match[2].toLowerCase();
    const whereClause = match[3];
    const orderClause = match[4];
    const limit = match[5] ? parseInt(match[5], 10) : undefined;

    const sourceRows = this.tables.get(tableName) || [];
    let filtered = sourceRows.filter((row) => {
      if (!whereClause) return true;
      return this.evaluateWhere(row, whereClause, bindValues, 0);
    });

    // Handle ORDER BY
    if (orderClause) {
      const parts = orderClause.split(',').map((p) => p.trim());
      for (const part of parts) {
        const [col, dir] = part.split(/\s+/);
        const colName = col.toLowerCase();
        const isDesc = dir && dir.toUpperCase() === 'DESC';
        filtered.sort((a, b) => {
          const valA = a[colName];
          const valB = b[colName];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          if (valA < valB) return isDesc ? 1 : -1;
          return isDesc ? -1 : 1;
        });
      }
    }

    if (limit !== undefined && limit >= 0) {
      filtered = filtered.slice(0, limit);
    }

    // Projection
    if (colsStr === '*') {
      return filtered.map((r) => ({ ...r })) as unknown as T[];
    } else {
      const colNames = colsStr.split(',').map((c) => c.trim().toLowerCase());
      return filtered.map((r) => {
        const out: Record<string, any> = {};
        for (const col of colNames) {
          out[col] = r[col];
        }
        return out;
      }) as unknown as T[];
    }
  }

  private evaluateWhere(row: Record<string, any>, whereClause: string, bindValues: any[], paramOffset = 0): boolean {
    const clause = whereClause.trim();
    // Handle "col = ?"
    const eqMatch = clause.match(/([a-zA-Z0-9_]+)\s*(=|!=|<>|LIKE)\s*(\?|'[^']*'|\d+)/i);
    if (eqMatch) {
      const col = eqMatch[1].toLowerCase();
      const op = eqMatch[2].toUpperCase();
      const targetToken = eqMatch[3];
      let expected: any;

      if (targetToken === '?') {
        expected = bindValues[paramOffset];
      } else if (targetToken.startsWith("'")) {
        expected = targetToken.replace(/^'|'$/g, '');
      } else {
        expected = Number(targetToken);
      }

      const actual = row[col];
      if (op === '=' || op === 'LIKE') {
        return String(actual).toLowerCase() === String(expected).toLowerCase();
      } else if (op === '!=' || op === '<>') {
        return String(actual).toLowerCase() !== String(expected).toLowerCase();
      }
    }
    return true;
  }

  public async close(): Promise<boolean> {
    return true;
  }

  public getRawData(): Record<string, any[]> {
    const dump: Record<string, any[]> = {};
    for (const [table, rows] of this.tables.entries()) {
      dump[table] = [...rows];
    }
    return dump;
  }

  public loadRawData(data: Record<string, any[]>): void {
    this.tables.clear();
    for (const [table, rows] of Object.entries(data)) {
      this.tables.set(table.toLowerCase(), Array.isArray(rows) ? rows : []);
    }
    this.save();
  }
}

class NativeSqlDatabaseAdapter implements TauriSqlDatabase {
  constructor(private readonly database: NativeSqlDatabase) {}

  public execute(query: string, bindValues: any[] = []): Promise<QueryResult> {
    return this.database.execute(toSqlitePluginPlaceholders(query), bindValues);
  }

  public select<T = any>(query: string, bindValues: any[] = []): Promise<T[]> {
    return this.database.select<T[]>(toSqlitePluginPlaceholders(query), bindValues);
  }

  public close(): Promise<boolean> {
    return this.database.close();
  }
}

/** Convert the adapter's SQLite `?` placeholders to the plugin's `$1`, `$2` syntax. */
function toSqlitePluginPlaceholders(query: string): string {
  let result = '';
  let parameterIndex = 0;
  let quote: "'" | '"' | '`' | ']' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const next = query[i + 1];

    if (lineComment) {
      result += char;
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      result += char;
      if (char === '*' && next === '/') {
        result += next;
        i++;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      result += char;
      if (char === quote) {
        if (next === quote && quote !== ']') {
          result += next;
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === '-' && next === '-') {
      result += '--';
      i++;
      lineComment = true;
    } else if (char === '/' && next === '*') {
      result += '/*';
      i++;
      blockComment = true;
    } else if (char === "'") {
      result += char;
      quote = "'";
    } else if (char === '"') {
      result += char;
      quote = '"';
    } else if (char === '`') {
      result += char;
      quote = '`';
    } else if (char === '[') {
      result += char;
      quote = ']';
    } else if (char === '?') {
      result += `$${++parameterIndex}`;
    } else {
      result += char;
    }
  }

  return result;
}

const legacyTables = {
  companies: { columns: ['id', 'name', 'industry', 'website', 'phone'], required: ['id', 'name'] },
  contacts: { columns: ['id', 'company_id', 'name', 'email', 'phone', 'role'], required: ['id', 'name'] },
  deals: { columns: ['id', 'contact_id', 'company_id', 'title', 'value', 'stage', 'close_date', 'currency'], required: ['id', 'title', 'value', 'stage'] },
  reminders: { columns: ['id', 'contact_id', 'title', 'due_date', 'completed', 'priority'], required: ['id', 'title', 'due_date', 'priority'] },
  complaints: { columns: ['id', 'contact_id', 'title', 'status', 'severity', 'description'], required: ['id', 'title', 'status', 'severity'] },
  activities: { columns: ['id', 'contact_id', 'type', 'notes', 'created_at'], required: ['id', 'type', 'notes', 'created_at'] },
} as const;

export type LegacyDataMigrationStatus = 'not-native' | 'imported' | 'already-migrated' | 'no-legacy-data' | 'legacy-unreadable';

/** Import old browser-backed CRM records into native SQLite once, leaving the source as a backup. */
export async function migrateLegacyBrowserData(
  database: TauriSqlDatabase,
  path: string,
): Promise<LegacyDataMigrationStatus> {
  if (!(database instanceof NativeSqlDatabaseAdapter)) return 'not-native';

  const migrationKey = 'browser-local-storage-to-sqlite-v1';
  await database.execute(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL
    )
  `);

  const completed = await database.select<{ name: string }>(
    'SELECT name FROM app_migrations WHERE name = ?',
    [migrationKey],
  );
  if (completed.length > 0) return 'already-migrated';

  if (typeof window === 'undefined' || !window.localStorage) return 'no-legacy-data';

  const storageKey = `twenty_crm_sqlite_${path.replace(/^sqlite:/, '')}`;
  const raw = window.localStorage.getItem(storageKey);
  let legacyData: Record<string, unknown> = {};

  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.error('Legacy CRM browser storage has an unexpected format; the original data was left untouched.');
        return 'legacy-unreadable';
      }
      legacyData = parsed as Record<string, unknown>;
    } catch (error) {
      console.error('Could not parse legacy CRM browser storage; the original data was left untouched.', error);
      return 'legacy-unreadable';
    }
  }

  const hasLegacyRows = Object.keys(legacyTables).some((table) => {
    const rows = legacyData[table];
    return Array.isArray(rows) && rows.length > 0;
  });
  let skippedIncompleteRows = false;
  for (const [table, definition] of Object.entries(legacyTables)) {
    const sourceRows = legacyData[table];
    if (!Array.isArray(sourceRows)) continue;

    for (const candidate of sourceRows) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        skippedIncompleteRows = true;
        continue;
      }
      const row = candidate as Record<string, unknown>;
      if (definition.required.some((column) => row[column] === undefined || row[column] === null)) {
        skippedIncompleteRows = true;
        console.warn(`Skipped an incomplete legacy ${table} row; the original browser data was preserved.`);
        continue;
      }

      const columns = [...definition.columns];
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((column) => row[column] ?? null);
      await database.execute(
        `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values,
      );
    }
  }

  const status: LegacyDataMigrationStatus = skippedIncompleteRows
    ? 'legacy-unreadable'
    : (hasLegacyRows ? 'imported' : 'no-legacy-data');

  // Write the marker only after import succeeds. The source localStorage is retained as a backup.
  if (status !== 'legacy-unreadable') {
    await database.execute(
      'INSERT INTO app_migrations (name, completed_at) VALUES (?, ?)',
      [migrationKey, new Date().toISOString()],
    );
  }
  return status;
}

// Global registry of loaded databases
const loadedDatabases = new Map<string, TauriSqlDatabase>();

/**
 * Standard Tauri v2 plugin-sql entry point
 */
export class Database {
  public static async load(path: string): Promise<TauriSqlDatabase> {
    if (loadedDatabases.has(path)) {
      return loadedDatabases.get(path)!;
    }

    // Use the real SQL plugin in the desktop app. Browser runs retain the localStorage adapter.
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const nativeDb = await NativeSqlDatabase.load(path);
      const database = new NativeSqlDatabaseAdapter(nativeDb);
      loadedDatabases.set(path, database);
      return database;
    }

    const browserDb = new BrowserSqliteDatabase(path);
    await browserDb.init();
    loadedDatabases.set(path, browserDb);
    return browserDb;
  }
}

export default Database;
