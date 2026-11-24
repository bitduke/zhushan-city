const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');

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
        const matches = [...bucket.values()].filter(item => Object.entries(condition).every(([key, value]) => {
          return matchesValue(item[key], value);
        }));
        if (this.sortKey) matches.sort((a, b) => {
          const result = String(a[this.sortKey] || '').localeCompare(String(b[this.sortKey] || ''));
          return this.sortDirection === 'desc' ? -result : result;
        });
        return matches;
      },
      async count() { return { total: this.rows().length }; },
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
      limit: value => query({}).limit(value),
      count: () => query({}).count()
    };
  }
  async runTransaction(callback) {
    const copy = new Map([...this.data].map(([name, bucket]) => [name, new Map([...bucket].map(([id, item]) => [id, structuredClone(item)]))]));
    const result = await callback({ collection: name => this.collection(name, copy) });
    this.data = copy;
    return result;
  }
  put(name, id, item) { this.bucket(name).set(id, { ...item, _id: id }); }
  get(name, id) { return this.bucket(name).get(id); }
  all(name) { return [...this.bucket(name).values()]; }
}

let activeDb;
let openid;
const sdk = {
  DYNAMIC_CURRENT_ENV: 'test-env',
  init() {},
  database: () => activeDb,
  getWXContext: () => ({ OPENID: openid })
};
MemoryDatabase.prototype.command = {
  gt: value => ({ op: 'gt', value }),
  gte: value => ({ op: 'gte', value, and(other) { return { op: 'and', left: this, right: other }; } }),
  lt: value => ({ op: 'lt', value })
};
MemoryDatabase.prototype.RegExp = ({ regexp, options }) => new RegExp(regexp, options);
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
const cstDate = offset => new Date(Date.now() + 8 * 3600000 + offset * 86400000).toISOString().slice(0, 10);
const idHash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const template = (merchantId, overrides = {}) => ({
  merchant_id: merchantId, title: '测试满减券', type: 'FULL_REDUCTION', usage_mode: 'INSTANT',
  condition_amount: 100, discount_amount: 10, booking_required: false,
  instructions: '满一百元立减十元', total_count: 1, claimed_count: 0, per_user_limit: 1,
  start_time: cstDate(-1), end_time: cstDate(30), status: 'ACTIVE', ...overrides
});

test('login records the agreed service version without requiring a phone or profile', async () => {
  activeDb = new MemoryDatabase();
  openid = 'new-resident';
  const login = loadFunction('login');
  const response = await login({ agreementVersion: '2026-11-24' });
  assert.equal(response.success, true);
  const user = activeDb.get('user', `user_${idHash(openid)}`);
  assert.equal(user.service_agreement_version, '2026-11-24');
  assert.ok(user.service_agreement_at);
  assert.equal(user.phone, undefined);
  assert.equal(user.nickname, undefined);
});

test('claim ignores forged source, retries return the same coupon, and verification is permission checked', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mA', { name: 'A', address: 'A street', phone: '13900000000', owner_openid: 'ownerA', status: 'APPROVED' });
  activeDb.put('coupon', 'cpA', template('mA'));
  const claim = loadFunction('couponClaim');
  const verify = loadFunction('couponVerify');
  openid = 'resident1';
  const first = await claim({ couponId: 'cpA', sourceMerchantId: 'forged-shop', openid: 'forged-user' });
  assert.equal(first.success, true);
  assert.equal(first.coupon.source_merchant_id, 'mA');
  const second = await claim({ couponId: 'cpA' });
  assert.equal(second.coupon.code, first.coupon.code);
  assert.equal(activeDb.get('coupon', 'cpA').claimed_count, 1);
  openid = 'resident2';
  assert.equal((await claim({ couponId: 'cpA' })).code, 'OUT_OF_STOCK');
  openid = 'stranger';
  assert.equal((await verify({ code: first.coupon.code, operatorMerchantId: 'mA' })).code, 4008);
  openid = 'ownerA';
  assert.equal((await verify({ code: first.coupon.code, operatorMerchantId: 'mA' })).success, true);
  assert.equal((await verify({ code: first.coupon.code, operatorMerchantId: 'mA' })).code, 4003);
  assert.equal(activeDb.all('verify_log').length, 1);
});

test('scan token resolves server-side and repeated entry is deduplicated', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('scan_token', 'mA001', { target_id: 'mA', type: 'MERCHANT', status: 'ACTIVE' });
  activeDb.put('merchant', 'mA', { name: 'A', status: 'APPROVED' });
  const scan = loadFunction('scanResolve');
  openid = 'resident1';
  assert.equal((await scan({ action: 'resolve', token: 'mA001' })).merchantId, 'mA');
  assert.equal((await scan({ action: 'enter', token: 'mA001' })).deduped, false);
  assert.equal((await scan({ action: 'enter', token: 'mA001' })).deduped, true);
  assert.equal(activeDb.all('scan_log').length, 1);
  assert.equal((await scan({ action: 'resolve', token: 'bad' })).code, 'TOKEN_INACTIVE');
});

test('booking requires consent and arrival before redeeming a service coupon', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mB', { name: 'B', address: 'B street', phone: '13900000000', owner_openid: 'ownerB', status: 'APPROVED', daily_booking_limit: 1 });
  activeDb.put('coupon', 'cpB', template('mB', { title: '预约体验', usage_mode: 'BOOKING', booking_required: true, total_count: 2 }));
  const claim = loadFunction('couponClaim');
  const appointment = loadFunction('appointmentManage');
  const verify = loadFunction('couponVerify');
  openid = 'resident1';
  const coupon = (await claim({ couponId: 'cpB' })).coupon;
  const slot = `${cstDate(1)} 15:00`;
  assert.equal((await appointment({ action: 'request', userCouponId: coupon._id, requestedTimeSlot: slot, contactName: '测试顾客', contactPhone: '13900000000', contactConsent: false })).code, 'INVALID_CONTACT');
  assert.equal((await appointment({ action: 'request', userCouponId: coupon._id, requestedTimeSlot: slot, contactName: '测试顾客', contactPhone: '13900000000', contactConsent: true })).success, true);
  openid = 'ownerB';
  assert.equal((await verify({ code: coupon.code, operatorMerchantId: 'mB' })).code, 4007);
  assert.equal((await appointment({ action: 'confirm', id: coupon._id })).success, true);
  assert.equal((await verify({ code: coupon.code, operatorMerchantId: 'mB' })).code, 4007);
  assert.equal((await appointment({ action: 'markArrival', id: coupon._id })).success, true);
  assert.equal((await verify({ code: coupon.code, operatorMerchantId: 'mB' })).success, true);
  assert.equal(activeDb.get('appointment', coupon._id).status, 'COMPLETED');
});

test('daily booking capacity is released after the owner cancels', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mB', { name: 'B', address: 'B street', phone: '13900000000', owner_openid: 'ownerB', status: 'APPROVED', daily_booking_limit: 1 });
  activeDb.put('coupon', 'cpB', template('mB', { usage_mode: 'BOOKING', booking_required: true, total_count: 2 }));
  const claim = loadFunction('couponClaim');
  const appointment = loadFunction('appointmentManage');
  const slot = `${cstDate(1)} 15:00`;
  const details = { action: 'request', requestedTimeSlot: slot, contactName: '测试顾客', contactPhone: '13900000000', contactConsent: true };
  openid = 'resident1';
  const first = (await claim({ couponId: 'cpB' })).coupon;
  assert.equal((await appointment({ ...details, userCouponId: first._id })).success, true);
  openid = 'resident2';
  const second = (await claim({ couponId: 'cpB' })).coupon;
  assert.equal((await appointment({ ...details, userCouponId: second._id })).code, 'CAPACITY_FULL');
  openid = 'resident1';
  assert.equal((await appointment({ action: 'cancel', id: first._id })).success, true);
  openid = 'resident2';
  assert.equal((await appointment({ ...details, userCouponId: second._id })).success, true);
});

test('merchant application is hidden until an administrator approves it', async () => {
  activeDb = new MemoryDatabase();
  const merchant = loadFunction('merchantManage');
  openid = 'applicant';
  const application = await merchant({ action: 'apply', data: {
    name: '测试女装店', category_id: 'apparel', town: '城关镇', address: '人民路测试号十八号',
    contact_phone: '13900000000', business_hours: '09:00-20:00', daily_booking_limit: 0,
    qualification_note: '本地测试经营资料说明', qualification_images: []
  } });
  assert.equal(application.success, true);
  assert.equal((await merchant({ action: 'list', keyword: '测试女装店' })).total, 0);
  openid = 'stranger';
  assert.equal((await merchant({ action: 'adminReview', id: application.application._id, approve: true })).code, 'FORBIDDEN');
  openid = 'admin';
  activeDb.put('user', `user_${idHash(openid)}`, { role: 'ADMIN', status: 'ACTIVE' });
  assert.equal((await merchant({ action: 'adminReview', id: application.application._id, approve: true })).success, true);
  const listed = await merchant({ action: 'list', keyword: '测试女装店' });
  assert.equal(listed.total, 1);
  assert.equal((await merchant({ action: 'list', keyword: '服装女装' })).total, 1);
  assert.equal(activeDb.all('scan_token').length, 1);
  assert.equal(activeDb.all('merchant_staff').length, 1);
});

test('information stays private until review and a report needs administrator action', async () => {
  activeDb = new MemoryDatabase();
  const info = loadFunction('infoManage');
  openid = 'resident';
  const created = await info({ action: 'create', data: {
    category_id: 'housekeeping', town: '城关镇', title: '测试保洁服务',
    content: '本地测试保洁服务详情，请先联系确认时段。',
    contact_phone: '13900000000', contact_consent: true, images: []
  } });
  assert.equal(created.success, true);
  assert.equal((await info({ action: 'list', categoryId: 'housekeeping' })).total, 0);
  openid = 'admin';
  activeDb.put('user', `user_${idHash(openid)}`, { role: 'ADMIN', status: 'ACTIVE' });
  assert.equal((await info({ action: 'adminReview', id: created.item._id, approve: true })).success, true);
  assert.equal((await info({ action: 'list', categoryId: 'housekeeping', keyword: '保洁' })).total, 1);
  assert.equal((await info({ action: 'list', keyword: '家政保洁' })).total, 1);
  openid = 'resident';
  const report = await info({ action: 'report', id: created.item._id, reason: '信息已失效' });
  assert.equal(report.success, true);
  assert.equal((await info({ action: 'list', categoryId: 'housekeeping' })).total, 1);
  openid = 'admin';
  assert.equal((await info({ action: 'adminHandleReport', id: report.report._id, offline: true, reason: '审核确认已失效' })).success, true);
  assert.equal((await info({ action: 'list', categoryId: 'housekeeping' })).total, 0);
});

test('transfer and cooperation category can be published, reviewed and searched', async () => {
  activeDb = new MemoryDatabase();
  const info = loadFunction('infoManage');
  openid = 'resident';
  const data = {
    category_id: 'transfer', town: '城关镇', title: '城区临街店面转让',
    content: '店面设备齐全，转让条件可电话沟通。',
    contact_phone: '13900000000', contact_consent: true, images: []
  };
  const created = await info({ action: 'create', data });
  assert.equal(created.success, true);
  assert.equal((await info({ action: 'list', categoryId: 'transfer' })).total, 0);
  openid = 'admin';
  activeDb.put('user', `user_${idHash(openid)}`, { role: 'ADMIN', status: 'ACTIVE' });
  assert.equal((await info({ action: 'adminReview', id: created.item._id, approve: true })).success, true);
  assert.equal((await info({ action: 'list', categoryId: 'transfer', keyword: '转让/合作' })).total, 1);
  openid = 'resident';
  assert.equal((await info({ action: 'create', data: { ...data, category_id: 'turquoise' } })).success, false);
});

test('cooperation needs both stores and platform approval; bills wait for confirmed results or fulfilled slot period', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mA', { name: 'A', owner_openid: 'ownerA', status: 'APPROVED' });
  activeDb.put('merchant', 'mB', { name: 'B', owner_openid: 'ownerB', status: 'APPROVED' });
  activeDb.put('coupon', 'cpB', template('mB', { title: 'B店体验券', total_count: 10 }));
  const cooperation = loadFunction('cooperationManage');
  openid = 'ownerB';
  const offer = await cooperation({ action: 'publish', buyerMerchantId: 'mB', data: {
    promoterMerchantId: 'mA', targetCouponId: 'cpB', pricingModel: 'PER_RESULT',
    unitPriceYuan: '20', platformFeeYuan: '2', budgetYuan: '100',
    startDate: cstDate(0), endDate: cstDate(20), newCustomerWindowDays: '30',
    newCustomerRule: '首次到店完成服务且无退款'
  } });
  assert.equal(offer.success, true);
  openid = 'ownerA';
  assert.equal((await cooperation({ action: 'accept', id: offer.offer._id })).offer.status, 'PENDING_ADMIN');
  assert.equal((await cooperation({ action: 'bill', id: offer.offer._id })).bill.payable_cents, 0);
  openid = 'admin';
  activeDb.put('user', `user_${idHash(openid)}`, { role: 'ADMIN', status: 'ACTIVE' });
  assert.equal((await cooperation({ action: 'adminReview', id: offer.offer._id, approve: true })).success, true);
  assert.equal(activeDb.all('benefit_placement').length, 1);
  const benefit = loadFunction('getShopBenefitData');
  const placementId = activeDb.all('benefit_placement')[0]._id;
  assert.equal((await cooperation({ action: 'adminPlacements' })).list.length, 1);
  assert.equal((await benefit({ shopId: 'mA' })).cross_coupons.length, 1);
  assert.equal((await cooperation({ action: 'adminSetPlacement', id: placementId, sort: 3, active: false, reason: '人工调整展示' })).success, true);
  assert.equal((await benefit({ shopId: 'mA' })).cross_coupons.length, 0);
  assert.equal((await cooperation({ action: 'adminSetPlacement', id: placementId, sort: 2, active: true, reason: '确认恢复展示' })).success, true);
  assert.equal(activeDb.get('benefit_placement', placementId).sort, 2);
  assert.equal((await benefit({ shopId: 'mA' })).cross_coupons.length, 1);
  activeDb.put('cooperation_result', 'result1', { cooperation_id: offer.offer._id, user_coupon_id: 'uc1', user_id: 'user1', buyer_merchant_id: 'mB', promoter_merchant_id: 'mA', status: 'PENDING_BUYER', verified_at: new Date().toISOString() });
  openid = 'ownerB';
  assert.equal((await cooperation({ action: 'buyerReview', id: 'result1', validNewCustomer: true, note: '店员确认首次到店' })).result.status, 'PENDING_PROMOTER');
  assert.equal((await cooperation({ action: 'bill', id: offer.offer._id })).bill.payable_cents, 0);
  openid = 'ownerA';
  assert.equal((await cooperation({ action: 'promoterReview', id: 'result1', accept: true })).result.status, 'CONFIRMED');
  const bill = (await cooperation({ action: 'bill', id: offer.offer._id })).bill;
  assert.deepEqual([bill.payable_cents, bill.platform_fee_cents, bill.promoter_due_cents], [2000, 200, 1800]);
  openid = 'ownerB';
  const payment = await cooperation({ action: 'submitPayment', id: offer.offer._id, reference: 'DEMO-TRANSFER-001' });
  assert.equal(payment.payment.amount_cents, 1800);
  openid = 'ownerA';
  assert.equal((await cooperation({ action: 'confirmReceipt', id: payment.payment._id })).payment.status, 'CONFIRMED');
  assert.equal((await cooperation({ action: 'bill', id: offer.offer._id })).bill.confirmed_paid_cents, 1800);
  openid = 'admin';
  assert.equal((await cooperation({ action: 'adminResolveResult', id: 'result1', valid: false, reason: '演示退款后结果作废' })).success, true);
  openid = 'ownerB';
  const corrected = (await cooperation({ action: 'bill', id: offer.offer._id })).bill;
  assert.deepEqual([corrected.payable_cents, corrected.confirmed_paid_cents, corrected.overpaid_cents], [0, 1800, 1800]);

  activeDb.put('coupon', 'cpSlot', template('mB', { title: 'B店展位券', total_count: 10 }));
  const slot = await cooperation({ action: 'publish', buyerMerchantId: 'mB', data: {
    promoterMerchantId: 'mA', targetCouponId: 'cpSlot', pricingModel: 'BY_SLOT',
    slotPriceYuan: '50', platformFeeYuan: '5', startDate: cstDate(0), endDate: cstDate(1),
    newCustomerWindowDays: '30', newCustomerRule: '按约在入口店福利页展示'
  } });
  assert.equal(slot.success, true);
  openid = 'ownerA'; await cooperation({ action: 'accept', id: slot.offer._id });
  openid = 'admin'; await cooperation({ action: 'adminReview', id: slot.offer._id, approve: true });
  openid = 'ownerB';
  assert.equal((await cooperation({ action: 'confirmSlotDelivery', id: slot.offer._id, note: '展位展示记录已核对' })).code, 'PERIOD_ACTIVE');
  assert.equal((await cooperation({ action: 'bill', id: slot.offer._id })).bill.payable_cents, 0);
  activeDb.get('cooperation', slot.offer._id).end_date = cstDate(-1); // Only the in-memory test clock is advanced.
  assert.equal((await cooperation({ action: 'confirmSlotDelivery', id: slot.offer._id, note: '展位展示记录已核对' })).success, true);
  const slotBill = (await cooperation({ action: 'bill', id: slot.offer._id })).bill;
  assert.deepEqual([slotBill.payable_cents, slotBill.platform_fee_cents, slotBill.promoter_due_cents], [5000, 500, 4500]);
});

test('a store owner invites a separate staff identity and can revoke its permissions', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mA', { name: 'A', owner_openid: 'ownerA', status: 'APPROVED' });
  const staff = loadFunction('staffManage');
  openid = 'ownerA';
  const invitation = await staff({ action: 'createInvite', merchantId: 'mA', canVerify: true, canAppointment: false });
  assert.equal(invitation.success, true);
  assert.equal((await staff({ action: 'acceptInvite', token: invitation.invite.token })).code, 'OWNER_ALREADY_BOUND');
  openid = 'employee1';
  const accepted = await staff({ action: 'acceptInvite', token: invitation.invite.token });
  assert.equal(accepted.staff.can_verify, true);
  assert.equal(accepted.staff.can_handle_appointment, false);
  assert.equal((await staff({ action: 'acceptInvite', token: invitation.invite.token })).code, 'INVITE_EXPIRED');
  openid = 'ownerA';
  assert.equal((await staff({ action: 'list', merchantId: 'mA' })).list.length, 1);
  assert.equal((await staff({ action: 'disable', merchantId: 'mA', staffId: accepted.staff._id })).success, true);
  assert.equal(activeDb.get('merchant_staff', accepted.staff._id).status, 'DISABLED');
});

test('administrator can disable a town for new submissions without deleting stored records', async () => {
  activeDb = new MemoryDatabase();
  const config = loadFunction('configManage');
  const info = loadFunction('infoManage');
  openid = 'resident';
  assert.equal((await config({ action: 'list' })).config.towns.length, 17);
  const original = await info({ action: 'create', data: {
    category_id: 'housekeeping', town: '潘口乡', title: '潘口测试保洁',
    content: '本地测试保洁服务详情，请先联系确认时段。',
    contact_phone: '13900000000', contact_consent: true, images: []
  } });
  assert.equal(original.success, true);
  openid = 'admin';
  activeDb.put('user', `user_${idHash(openid)}`, { role: 'ADMIN', status: 'ACTIVE' });
  assert.equal((await config({ action: 'setActive', section: 'towns', id: '420323200', active: false })).success, true);
  assert.equal((await config({ action: 'list' })).config.towns.length, 16);
  openid = 'resident';
  const rejected = await info({ action: 'create', data: {
    category_id: 'housekeeping', town: '潘口乡', title: '再次测试保洁',
    content: '本地测试保洁服务详情，请先联系确认时段。',
    contact_phone: '13900000000', contact_consent: true, images: []
  } });
  assert.equal(rejected.code, 'INVALID_FORM');
  assert.equal(activeDb.get('info', original.item._id).status, 'PENDING');
});

test('administrator suspends a user with audit; suspended identity cannot write core records', async () => {
  activeDb = new MemoryDatabase();
  const adminId = `user_${idHash('platformAdmin')}`;
  const residentId = `user_${idHash('residentBan')}`;
  activeDb.put('user', adminId, { role: 'ADMIN', status: 'ACTIVE', created_at: new Date().toISOString() });
  activeDb.put('user', residentId, { role: 'RESIDENT', status: 'ACTIVE', created_at: new Date().toISOString() });
  activeDb.put('merchant', 'mA', { name: 'A', owner_openid: 'ownerA', status: 'APPROVED' });
  activeDb.put('coupon', 'cpA', template('mA'));
  const manage = loadFunction('userManage');
  const claim = loadFunction('couponClaim');
  const appointment = loadFunction('appointmentManage');
  const info = loadFunction('infoManage');
  const scan = loadFunction('scanResolve');
  activeDb.put('scan_token', 'mA001', { target_id: 'mA', type: 'MERCHANT', status: 'ACTIVE' });

  openid = 'residentBan';
  assert.equal((await manage({ action: 'list' })).code, 'FORBIDDEN');
  openid = 'platformAdmin';
  const listed = await manage({ action: 'list' });
  assert.equal(listed.success, true);
  assert.equal(listed.list.length, 2);
  assert.equal((await manage({ action: 'setStatus', userId: adminId, status: 'SUSPENDED', reason: 'test reason' })).code, 'SELF_ACTION');
  assert.equal((await manage({ action: 'setStatus', userId: residentId, status: 'SUSPENDED', reason: 'test reason' })).success, true);
  assert.equal(activeDb.get('user', residentId).status, 'SUSPENDED');
  assert.equal(activeDb.all('audit_log').length, 1);
  assert.equal((await manage({ action: 'audit' })).list[0].action, 'USER_SUSPEND');

  openid = 'residentBan';
  assert.equal((await claim({ couponId: 'cpA' })).code, 'USER_SUSPENDED');
  assert.equal((await appointment({ action: 'request' })).code, 'USER_SUSPENDED');
  assert.equal((await info({ action: 'create' })).code, 'USER_SUSPENDED');
  assert.equal((await scan({ action: 'enter', token: 'mA001' })).code, 'USER_SUSPENDED');
  assert.equal(activeDb.all('user_coupon').length, 0);

  openid = 'platformAdmin';
  assert.equal((await manage({ action: 'setStatus', userId: residentId, status: 'ACTIVE', reason: 'appeal accepted' })).success, true);
  openid = 'residentBan';
  assert.equal((await claim({ couponId: 'cpA' })).success, true);
});

test('merchant code uses a trusted short token, owner permission and cached versioned image', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mA', { name: 'A', owner_openid: 'ownerA', status: 'APPROVED', qrcode_token: 'mA001' });
  activeDb.put('scan_token', 'mA001', { target_id: 'mA', type: 'MERCHANT', status: 'ACTIVE' });
  const previousVersion = process.env.WXACODE_ENV_VERSION;
  process.env.WXACODE_ENV_VERSION = 'develop';
  let generated = 0;
  sdk.openapi = { wxacode: { getUnlimited: async input => {
    assert.equal(input.scene, 't=mA001');
    assert.equal(input.page, 'pages/index/index');
    assert.equal(input.envVersion, 'develop');
    generated++;
    return { buffer: Buffer.from('png') };
  } } };
  sdk.uploadFile = async input => ({ fileID: `cloud://test/${input.cloudPath}` });
  try {
    const code = loadFunction('merchantCode');
    openid = 'stranger';
    assert.equal((await code({ merchantId: 'mA' })).code, 'FORBIDDEN');
    openid = 'ownerA';
    const first = await code({ merchantId: 'mA' });
    assert.equal(first.success, true);
    assert.equal(first.envVersion, 'develop');
    assert.equal((await code({ merchantId: 'mA' })).fileID, first.fileID);
    assert.equal(generated, 1);
    activeDb.put('scan_token', 'mA001', { target_id: 'mA', type: 'MERCHANT', status: 'PAUSED' });
    assert.equal((await code({ merchantId: 'mA' })).code, 'TOKEN_INACTIVE');
  } finally {
    if (previousVersion === undefined) delete process.env.WXACODE_ENV_VERSION;
    else process.env.WXACODE_ENV_VERSION = previousVersion;
    delete sdk.openapi;
    delete sdk.uploadFile;
  }
});

test('daily stats keep scans, own coupons, cross coupons, arrivals and confirmed guests separate', async () => {
  activeDb = new MemoryDatabase();
  activeDb.put('merchant', 'mA', { name: 'A', status: 'APPROVED' });
  activeDb.put('merchant', 'mB', { name: 'B', status: 'APPROVED' });
  const yesterday = cstDate(-1);
  const at = new Date(`${yesterday}T12:00:00+08:00`).toISOString();
  activeDb.put('scan_log', 's1', { source_merchant_id: 'mA', user_hash: 'same', scanned_at: at });
  activeDb.put('scan_log', 's2', { source_merchant_id: 'mA', user_hash: 'same', scanned_at: at });
  activeDb.put('user_coupon', 'u1', { merchant_id: 'mA', source_merchant_id: 'mA', claimed_at: at });
  activeDb.put('user_coupon', 'u2', { merchant_id: 'mB', source_merchant_id: 'mA', claimed_at: at });
  activeDb.put('verify_log', 'v1', { merchant_id: 'mA', source_merchant_id: 'mA', verified_at: at });
  activeDb.put('cooperation_result', 'r1', { status: 'CONFIRMED', promoter_merchant_id: 'mA', buyer_merchant_id: 'mB', confirmed_at: at });
  activeDb.put('appointment', 'a1', { merchant_id: 'mB', arrived_at: at });
  const sync = loadFunction('statSync');
  const ranking = loadFunction('getPromoterRanking');
  assert.equal((await sync()).success, true);
  const a = activeDb.get('merchant_daily_stat', `${yesterday}_mA`);
  const b = activeDb.get('merchant_daily_stat', `${yesterday}_mB`);
  assert.deepEqual([a.scan_count, a.claim_self_count, a.redeem_self_count, a.claim_cross_count, a.bring_new_guest_count], [1, 1, 1, 1, 1]);
  assert.deepEqual([b.received_guest_count, b.arrived_count, b.claim_cross_count], [1, 1, 0]);
  const list = (await ranking()).list;
  assert.equal(list.length, 1);
  assert.equal(list[0].merchant_id, 'mA');
  assert.equal(list[0].is_new_partner, true);
  assert.equal(list[0].conversion_rate, 0);
});
