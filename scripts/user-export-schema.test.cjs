const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('every user collection in Firestore rules is represented in the account export', () => {
  const source = fs.readFileSync('src/app/core/backups/user-data-export.ts', 'utf8');
  const declared = [
    ...source.matchAll(/export const (?:USER|BUDGET)_COLLECTIONS = \[([\s\S]*?)\] as const/g),
  ].flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((value) => value[1]));
  assert.ok(declared.length > 15);
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const collections = [...rules.matchAll(/match \/(\w+)\/\{[^}]+\}/g)].map((match) => match[1]);
  const rootsOrNested = new Set(['databases', 'users', 'budgets', 'refuels']);
  for (const collection of collections)
    assert.ok(
      rootsOrNested.has(collection) || declared.includes(collection),
      `Add ${collection} to the full account export before shipping its rules.`,
    );
  assert.ok(source.includes('/refuels'));
});
