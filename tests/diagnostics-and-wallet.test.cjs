const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');

class MemoryDatabase {
  constructor() { this.data = new Map(); }
  bucket(name, source = this.data) {
    if (!source.has(name)) source.set(name, new Map());
    return source.get(name);
  }
  collection(name, source = this.data) {
    const bucket = this.bucket(name, source);
    const query = condition => ({
      max: Infinity, offset: 0, sortKey: null, sortDirection: 'asc',
      limit(value) { this.max = value; return this; },
      skip(value) { this.offset = value; return this; },
      orderBy(key, direction) { this.sortKey = key; this.sortDirection = direction; return this; },
      rows() {
        const matchesValue = (actual, expected) => {
          if (expected instanceof RegExp) return expected.test(String(actual || ''));
          if (expected && typeof expected === 'object' && expected.op) {
            if (expected.op === 'and') return matchesValue(actual, expected.left) && matchesValue(actual, expected.right);
            if (expected.op === 'gt') return actual > expected.value;
            if (expected.op === 'gte') return actual >= expected.value;
            if (expected.op === 'lt') return actual < expected.value;
          }
          return actual === expected;
        };
        const matches = [...bucket.values()].filter(item => Object.entries(condition).every(([key, value]) => matchesValue(item[key], value)));
        if (this.sortKey) matches.sort((a, b) => {
          const result = String(a[this.sortKey] || '').localeCompare(String(b[this.sortKey] || ''));
          return this.sortDirection === 'desc' ? -result : result;
        });
        return matches;
      },
      async get() { return { data: this.rows().slice(this.offset, this.offset + this.max).map(item => structuredClone(item)) }; }
    });
    return {
      doc: id => ({
        get: async () => ({ data: structuredClone(bucket.get(id) || null) }),
        set: async ({ data }) => { bucket.set(id, { ...structuredClone(data), _id: id }); return { stats: { updated: 1 } }; },
        update: async ({ data }) => {
          const existing = bucket.get(id);
          if (!existing) throw new Error(`missing ${name}/${id}`);
          bucket.set(id, { ...existing, ...structuredClone(data) });
          return { stats: { updated: 1 } };
        }
      }),
      where: query,
      limit: value => query({}).limit(value)
    };
  }
  put(name, id, item) { this.bucket(name).set(id, { ...item, _id: id }); }
}

MemoryDatabase.prototype.command = {
  gt: value => ({ op: 'gt', value }),
  gte: value => ({ op: 'gte', value, and(other) { return { op: 'and', left: this, right: other }; } }),
  lt: value => ({ op: 'lt', value })
};

let activeDb;
let openid;
const sdk = {
  DYNAMIC_CURRENT_ENV: 'test-env',
  init() {},
  database: () => activeDb,
  getWXContext: () => ({ OPENID: openid })
};
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const realLoad = Module._load;

function loadFunction(name) {
  const filename = path.join(__dirname, '..', 'cloudfunctions', name, 'index.js');
  delete require.cache[require.resolve(filename)];
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return sdk;
    return realLoad.call(this, request, parent, isMain);
  };
  try { return require(filename).main; }
  finally { Module._load = realLoad; }
}

test('getMyCoupons enriches user coupons with merchant category metadata', async () => {
  activeDb = new MemoryDatabase();
  openid = 'resident_wx_01';
  activeDb.put('merchant', 'm_food', { name: '老城牛肉面', category_id: 'catering', category_name: '特色美食', status: 'APPROVED' });
  activeDb.put('user_coupon', 'uc_1', {
    user_id: hash(openid),
    merchant_id: 'm_food',
    merchant_name: '老城牛肉面',
    status: 'UNUSED',
    claimed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
    rule_snapshot: { title: '满38送凉菜', discount_amount: 10 }
  });

  const getMyCoupons = loadFunction('getMyCoupons');
  const res = await getMyCoupons({});
  assert.equal(res.success, true);
  assert.equal(res.list.length, 1);
  assert.equal(res.list[0].category_id, 'catering');
  assert.equal(res.list[0].category_name, '特色美食');
});

test('getPromoterRanking merchantDiagnostics enforces ownership, compares peer benchmarks, and builds suggestions', async () => {
  activeDb = new MemoryDatabase();
  const ownerOpenid = 'owner_shop_a';
  const strangerOpenid = 'stranger_01';
  const nowIso = new Date().toISOString();

  activeDb.put('merchant', 'shop_a', { owner_openid: ownerOpenid, name: 'A女装店', category_id: 'apparel', category_name: '服装女装', status: 'APPROVED' });
  activeDb.put('merchant', 'shop_b', { owner_openid: 'owner_shop_b', name: 'B女装店', category_id: 'apparel', category_name: '服装女装', status: 'APPROVED' });

  // B 店高转化样本（10次扫码 -> 8次领券 -> 6次核销）
  for (let i = 0; i < 10; i++) activeDb.put('scan_log', `sb_${i}`, { source_merchant_id: 'shop_b', user_hash: `ub_${i}`, scanned_at: nowIso });
  for (let i = 0; i < 8; i++) activeDb.put('user_coupon', `cb_${i}`, { merchant_id: 'shop_b', source_merchant_id: 'shop_b', claimed_at: nowIso });
  for (let i = 0; i < 6; i++) activeDb.put('verify_log', `vb_${i}`, { merchant_id: 'shop_b', verified_at: nowIso });

  // A 店低获客率与低核销率样本（10次扫码 -> 2次领券(加5张历史领券凑样本) -> 0核销）
  for (let i = 0; i < 10; i++) activeDb.put('scan_log', `sa_${i}`, { source_merchant_id: 'shop_a', user_hash: `ua_${i}`, scanned_at: nowIso });
  for (let i = 0; i < 2; i++) activeDb.put('user_coupon', `ca_${i}`, { merchant_id: 'shop_a', source_merchant_id: 'shop_a', claimed_at: nowIso });
  for (let i = 0; i < 5; i++) activeDb.put('user_coupon', `ca_cross_${i}`, { merchant_id: 'shop_a', source_merchant_id: 'shop_other', claimed_at: nowIso });

  const getPromoterRanking = loadFunction('getPromoterRanking');

  // 1. 陌生人访问应被拒绝
  openid = strangerOpenid;
  const denied = await getPromoterRanking({ action: 'merchantDiagnostics', merchantId: 'shop_a' });
  assert.equal(denied.success, false);
  assert.equal(denied.code, 'FORBIDDEN');

  // 2. 店主访问应成功拿到诊断及同行基准对比
  openid = ownerOpenid;
  const res = await getPromoterRanking({ action: 'merchantDiagnostics', merchantId: 'shop_a' });
  assert.equal(res.success, true);
  const d = res.diagnostics;
  assert.equal(d.metrics.scans, 10);
  assert.equal(d.metrics.selfClaims, 2);
  assert.equal(d.metrics.totalClaims, 7);
  assert.equal(d.metrics.acquireRate, 20);
  assert.equal(d.metrics.verifyRate, 0);
  assert.equal(d.peer.peerCount, 2);
  assert.equal(d.peer.hasEnoughPeerSample, true);
  assert.equal(d.peer.peerAvgAcquireRate, 50); // (2 + 8) / (10 + 10) = 50%
  assert.equal(d.peer.beatAcquirePercent, 50); // 2个店中有1个<=20%
  assert.ok(d.suggestions.some(s => s.kind === 'IMPROVE_HOOK'));
  assert.ok(d.suggestions.some(s => s.kind === 'IMPROVE_VERIFY'));
  assert.ok(d.suggestions.some(s => s.kind === 'EXPAND_ALLIANCE'));
});

test('coupon summary computes saved amount, expiring countdowns and category counts', () => {
  const filePath = path.join(__dirname, '..', 'src', 'api', 'coupon.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;

  const mockStub = id => {
    if (id === './adapter') return { USE_MOCK: true, callCloudFunction: async () => ({}) };
    if (id === './mockState') return { nextMockId: () => 'x', readMockState: () => ({}), writeMockState: () => {} };
    if (id.startsWith('@/')) return {};
    if (id === './cooperation') return { reservableCooperation: () => null, recordVerifiedCooperationResult: () => {} };
    return require(id);
  };
  const mod = { exports: {} };
  vm.runInNewContext(transpiled, { exports: mod.exports, module: mod, require: mockStub });

  const now = new Date('2026-11-25T12:00:00+08:00').getTime();
  const coupons = [
    {
      _id: 'u1', status: 'USED', category_id: 'catering',
      expires_at: '2026-11-26T23:59:59+08:00',
      rule_snapshot: { title: '满50减12', discount_amount: 12 }
    },
    {
      _id: 'u2', status: 'USED', category_id: 'apparel',
      expires_at: '2026-11-26T23:59:59+08:00',
      rule_snapshot: { title: '满128减25', discount_amount: 25 }
    },
    {
      _id: 'u3', status: 'UNUSED', category_id: 'catering',
      expires_at: new Date(now + 10 * 3600000).toISOString(),
      rule_snapshot: { title: '10小时过期券', discount_amount: 8 }
    },
    {
      _id: 'u4', status: 'UNUSED', category_id: 'beauty',
      expires_at: new Date(now + 10 * 86400000).toISOString(),
      rule_snapshot: { title: '10天后过期券', discount_amount: 20 }
    }
  ];

  const summary = mod.exports.summarizeMyCoupons(coupons, now);
  assert.equal(summary.usedCount, 2);
  assert.equal(summary.totalSavedYuan, 37);
  assert.equal(summary.unusedCount, 2);
  assert.equal(summary.expiringSoonList.length, 1);
  assert.equal(summary.nearestExpiring._id, 'u3');
  assert.equal(summary.categoryCounts.catering, 1);
  assert.equal(summary.categoryCounts.beauty, 1);

  const cdText = mod.exports.formatCountdown(coupons[2].expires_at, now);
  assert.equal(cdText, '10:00:00');
});
