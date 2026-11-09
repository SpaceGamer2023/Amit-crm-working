import test from 'node:test';
import assert from 'node:assert/strict';
import { Database } from './sqliteAdapter.ts';

test('sqliteAdapter initializes tables, executes inserts, selects, updates, and deletes', async () => {
  const db = await Database.load('sqlite:test_crm.db');

  // 1. Create table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      website TEXT,
      phone TEXT
    )
  `);

  // 2. Insert records
  await db.execute(
    'INSERT INTO companies (id, name, industry, website, phone) VALUES (?, ?, ?, ?, ?)',
    ['comp_1', 'Stripe', 'Fintech', 'https://stripe.com', '+1-800-555-0199']
  );

  await db.execute(
    'INSERT INTO companies (id, name, industry, website, phone) VALUES (?, ?, ?, ?, ?)',
    ['comp_2', 'Vercel', 'Developer Tools', 'https://vercel.com', '+1-800-555-0144']
  );

  // 3. Select all
  const all = await db.select('SELECT * FROM companies');
  assert.equal(all.length, 2);
  assert.equal(all[0].name, 'Stripe');

  // 4. Select with WHERE
  const vercel = await db.select('SELECT * FROM companies WHERE id = ?', ['comp_2']);
  assert.equal(vercel.length, 1);
  assert.equal(vercel[0].name, 'Vercel');

  // 5. Update
  await db.execute('UPDATE companies SET industry = ? WHERE id = ?', ['Cloud & Edge', 'comp_2']);
  const updatedVercel = await db.select('SELECT * FROM companies WHERE id = ?', ['comp_2']);
  assert.equal(updatedVercel[0].industry, 'Cloud & Edge');

  // 6. Delete
  await db.execute('DELETE FROM companies WHERE id = ?', ['comp_1']);
  const remaining = await db.select('SELECT * FROM companies');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'comp_2');
});
