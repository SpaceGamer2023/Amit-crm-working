import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePipelineMetrics,
  categorizeReminders,
  calculateComplaintMetrics,
  formatCurrency,
  Deal,
  Reminder,
  Complaint
} from './crmLogic.ts';

test('calculatePipelineMetrics correctly totals active, won, and lost pipeline', () => {
  const deals: Deal[] = [
    { id: '1', title: 'Deal A', value: 10000, stage: 'Lead' },
    { id: '2', title: 'Deal B', value: 25000, stage: 'Qualified' },
    { id: '3', title: 'Deal C', value: 50000, stage: 'Proposal Sent' },
    { id: '4', title: 'Deal D', value: 80000, stage: 'Won' },
    { id: '5', title: 'Deal E', value: 15000, stage: 'Lost' },
  ];

  const metrics = calculatePipelineMetrics(deals);
  assert.equal(metrics.totalActiveValue, 85000); // 10k + 25k + 50k
  assert.equal(metrics.wonValue, 80000);
  assert.equal(metrics.lostValue, 15000);
  assert.equal(metrics.activeDealsCount, 3);
  assert.equal(metrics.totalDeals, 5);
  // Win rate: 1 won out of 2 closed (Won + Lost) = 50%
  assert.equal(metrics.winRate, 50);
});

test('categorizeReminders partitions into overdue, today, upcoming, completed', () => {
  const referenceDate = '2026-11-08T10:00:00Z';
  const reminders: Reminder[] = [
    { id: '1', title: 'Past task', due_date: '2026-11-05', completed: 0, priority: 'High' },
    { id: '2', title: 'Today task', due_date: '2026-11-08', completed: 0, priority: 'Med' },
    { id: '3', title: 'Future task', due_date: '2026-11-12', completed: 0, priority: 'Low' },
    { id: '4', title: 'Done task', due_date: '2026-11-01', completed: 1, priority: 'High' },
  ];

  const buckets = categorizeReminders(reminders, referenceDate);
  assert.equal(buckets.overdue.length, 1);
  assert.equal(buckets.overdue[0].id, '1');
  assert.equal(buckets.dueToday.length, 1);
  assert.equal(buckets.dueToday[0].id, '2');
  assert.equal(buckets.upcoming.length, 1);
  assert.equal(buckets.upcoming[0].id, '3');
  assert.equal(buckets.completed.length, 1);
  assert.equal(buckets.completed[0].id, '4');
});

test('calculateComplaintMetrics accurately counts status and severe issues', () => {
  const complaints: Complaint[] = [
    { id: '1', title: 'Issue 1', status: 'Open', severity: 'High' },
    { id: '2', title: 'Issue 2', status: 'Open', severity: 'Low' },
    { id: '3', title: 'Issue 3', status: 'In Progress', severity: 'High' },
    { id: '4', title: 'Issue 4', status: 'Resolved', severity: 'High' },
  ];

  const metrics = calculateComplaintMetrics(complaints);
  assert.equal(metrics.total, 4);
  assert.equal(metrics.openCount, 2);
  assert.equal(metrics.inProgressCount, 1);
  assert.equal(metrics.resolvedCount, 1);
  assert.equal(metrics.highSeverityUnresolved, 2); // #1 and #3
});

test('formatCurrency outputs Israeli Shekel by default and supports explicit currencies', () => {
  assert.equal(formatCurrency(50000), '₪50,000');
  assert.equal(formatCurrency(0), '₪0');
  assert.equal(formatCurrency(50000, 'USD'), '$50,000');
  assert.equal(formatCurrency(25000, 'EUR'), '€25.000');
  assert.equal(formatCurrency(25000, 'GBP'), '£25,000');
});

test('searchAllRecords matches across companies, contacts, deals, and reminders', async () => {
  const { searchAllRecords } = await import('./crmLogic.ts');
  const mockData = {
    companies: [{ id: 'c1', name: 'Acme Robotics', industry: 'Hardware', website: 'acme.org' }],
    contacts: [{ id: 'ct1', name: 'Alice Cooper', email: 'alice@acme.org', role: 'Head of Engineering' }],
    deals: [{ id: 'd1', title: 'Robotics Enterprise Platform', value: 120000, stage: 'Qualified' as const }],
    reminders: [{ id: 'r1', title: 'Schedule Alice demo', due_date: '2026-11-09', completed: 0, priority: 'High' as const }],
    complaints: [{ id: 'cp1', title: 'Sensor delay glitch', status: 'Open' as const, severity: 'High' as const }],
  };

  // Search "Alice"
  const aliceResults = searchAllRecords('Alice', mockData);
  assert.equal(aliceResults.length, 2); // contact + reminder
  assert.ok(aliceResults.some(r => r.type === 'contact' && r.title === 'Alice Cooper'));
  assert.ok(aliceResults.some(r => r.type === 'reminder' && r.title === 'Schedule Alice demo'));

  // Search "Robotics"
  const roboticsResults = searchAllRecords('Robotics', mockData);
  assert.equal(roboticsResults.length, 2); // company + deal
  assert.ok(roboticsResults.some(r => r.type === 'company' && r.title === 'Acme Robotics'));
  assert.ok(roboticsResults.some(r => r.type === 'deal' && r.title === 'Robotics Enterprise Platform'));
});

