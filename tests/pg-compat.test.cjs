const { test } = require('node:test');
const assert = require('node:assert/strict');
const wrapDatabase = require('../cloudfunctions/_shared/pgCompat');

test('PG missing document becomes null in plain reads and transactions', async () => {
  const missing = new Error('document.get:fail -501001 resource system error. Document not found');
  const raw = {
    command: { eq: 'eq' },
    collection: name => ({ doc: id => ({ get: async () => { throw missing; }, set: async options => ({ name, id, data: options.data }) }) }),
    runTransaction: callback => callback(raw)
  };
  const db = wrapDatabase(raw);
  assert.deepEqual(await db.collection('merchant').doc('absent').get(), { data: null });
  assert.deepEqual(await db.runTransaction(tx => tx.collection('user').doc('absent').get()), { data: null });
  assert.deepEqual(await db.collection('merchant').doc('present').set({ data: { _id: 'present', name: '店' } }), { name: 'merchant', id: 'present', data: { name: '店' } });
  assert.equal(db.command.eq, 'eq');
});

test('PG compatibility wrapper preserves other errors', async () => {
  const denied = new Error('database permission denied');
  const db = wrapDatabase({ collection: () => ({ doc: () => ({ get: async () => { throw denied; } }) }) });
  await assert.rejects(db.collection('user').doc('x').get(), denied);
});
