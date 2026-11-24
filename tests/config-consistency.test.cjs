const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('cloud functions package the same default regions and categories', () => {
  const root = path.join(__dirname, '..', 'cloudfunctions');
  const expected = fs.readFileSync(path.join(root, 'configManage', 'base.json'), 'utf8');
  for (const name of ['infoManage', 'merchantManage']) {
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, name, 'base.json'), 'utf8')), JSON.parse(expected), `${name} defaults diverged`);
  }
});
