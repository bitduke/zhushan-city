const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const uuid = () => crypto.randomUUID().replace(/-/g, '');
const dayStart = value => new Date(`${String(value).slice(0, 10)}T00:00:00+08:00`).getTime();
const dayEnd = value => new Date(`${String(value).slice(0, 10)}T23:59:59+08:00`).getTime();
class BusinessError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new BusinessError(code, message); };

async function owner(reader, merchantId, openid) {
  const merchant = (await reader.collection('merchant').doc(merchantId).get()).data;
  if (!merchant || merchant.owner_openid !== openid || merchant.status !== 'APPROVED') fail('FORBIDDEN', '只有已审核店主可操作合作');
  return merchant;
}
async function admin(reader, openid) {
  const user = (await reader.collection('user').doc(`user_${hash(openid)}`).get()).data;
  if (!user || user.status !== 'ACTIVE' || user.role !== 'ADMIN') fail('FORBIDDEN', '无管理员权限');
}
function cents(value, label, allowZero = false) {
  const text = String(value || '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) fail('INVALID_PRICE', `${label}最多保留两位小数`);
  const amount = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(amount) || (allowZero ? amount < 0 : amount <= 0)) fail('INVALID_PRICE', `${label}无效`);
  return amount;
}
function terms(input = {}, coupon) {
  const model = input.pricingModel;
  if (!['PER_RESULT', 'BY_SLOT'].includes(model)) fail('INVALID_MODEL', '请选择计费方式');
  const unit = model === 'PER_RESULT' ? cents(input.unitPriceYuan, '有效结果报价') : 0;
  const slot = model === 'BY_SLOT' ? cents(input.slotPriceYuan, '周期展位报价') : 0;
  const fee = cents(input.platformFeeYuan, '平台费用', true);
  const budget = model === 'PER_RESULT' ? cents(input.budgetYuan, '总预算') : slot;
  if (fee > (model === 'PER_RESULT' ? unit : slot) || (model === 'PER_RESULT' && budget < unit)) fail('INVALID_BUDGET', '平台费用或预算无效');
  const startDate = String(input.startDate || '');
  const endDate = String(input.endDate || '');
  if (!Number.isFinite(dayStart(startDate)) || !Number.isFinite(dayEnd(endDate)) || dayEnd(endDate) < dayStart(startDate) || dayEnd(endDate) <= Date.now() || dayStart(startDate) < dayStart(coupon.start_time) || dayEnd(endDate) > dayEnd(coupon.end_time)) fail('INVALID_PERIOD', '合作周期须在券有效期内且包含未来日期');
  const windowDays = Number(input.newCustomerWindowDays);
  const rule = String(input.newCustomerRule || '').trim();
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365 || rule.length < 8) fail('INVALID_RULE', '请写明新客排重期和有效结果条件');
  return { pricing_model: model, unit_price_cents: unit, slot_price_cents: slot, platform_fee_cents: fee, budget_cents: budget, start_date: startDate, end_date: endDate, new_customer_window_days: windowDays, new_customer_rule: rule };
}
const markerId = (promoterId, couponId) => `coop_open_${hash(`${promoterId}:${couponId}`)}`;
const placementId = (promoterId, couponId) => `placement_${hash(`${promoterId}:${couponId}`)}`;
async function party(reader, cooperationId, openid) {
  const offer = (await reader.collection('cooperation').doc(cooperationId).get()).data;
  if (!offer) fail('NOT_FOUND', '合作不存在');
  const buyer = (await reader.collection('merchant').doc(offer.buyer_merchant_id).get()).data;
  const promoter = (await reader.collection('merchant').doc(offer.promoter_merchant_id).get()).data;
  if (buyer?.owner_openid !== openid && promoter?.owner_openid !== openid) fail('FORBIDDEN', '无权查看该合作');
  return offer;
}
const emptyBill = id => ({ cooperation_id: id, confirmed_results: 0, payable_cents: 0, platform_fee_cents: 0, promoter_due_cents: 0, confirmed_paid_cents: 0, pending_receipt_cents: 0 });

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const action = event.action;
  try {
    if ((await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    if (action === 'publish') {
      const buyerId = String(event.buyerMerchantId || '');
      const input = event.data || {};
      const promoterId = String(input.promoterMerchantId || '');
      const couponId = String(input.targetCouponId || '');
      const offer = await db.runTransaction(async transaction => {
        const buyer = await owner(transaction, buyerId, openid);
        const promoter = (await transaction.collection('merchant').doc(promoterId).get()).data;
        if (!promoter || promoter.status !== 'APPROVED' || promoterId === buyerId) fail('INVALID_PROMOTER', '入口店不可用');
        const coupon = (await transaction.collection('coupon').doc(couponId).get()).data;
        if (!coupon || coupon.merchant_id !== buyerId || coupon.status !== 'ACTIVE') fail('INVALID_COUPON', '只能用本店有效券发布');
        const conditions = terms(input, coupon);
        const marker = (await transaction.collection('cooperation_open').doc(markerId(promoterId, couponId)).get()).data;
        if (marker && ['OFFERED', 'PENDING_ADMIN', 'ACTIVE'].includes(marker.status)) fail('ALREADY_OPEN', '该券已有待处理或进行中的合作');
        const id = `coop_${uuid()}`;
        const record = { _id: id, buyer_merchant_id: buyerId, buyer_merchant_name: buyer.name, promoter_merchant_id: promoterId, promoter_merchant_name: promoter.name, target_coupon_id: couponId, target_coupon_title: coupon.title, ...conditions,
          version: 1, status: 'OFFERED', reserved_count: 0, published_at: new Date().toISOString() };
        await transaction.collection('cooperation').doc(id).set({ data: record });
        await transaction.collection('cooperation_bill').doc(id).set({ data: emptyBill(id) });
        await transaction.collection('cooperation_open').doc(markerId(promoterId, couponId)).set({ data: { cooperation_id: id, status: 'OFFERED' } });
        return record;
      });
      return { success: true, offer };
    }
    if (action === 'list') {
      const merchantId = String(event.merchantId || '');
      await owner(db, merchantId, openid);
      const [bought, promoted] = await Promise.all([
        db.collection('cooperation').where({ buyer_merchant_id: merchantId }).limit(100).get(),
        db.collection('cooperation').where({ promoter_merchant_id: merchantId }).limit(100).get()
      ]);
      const merged = new Map([...(bought.data || []), ...(promoted.data || [])].map(item => [item._id, item]));
      return { success: true, list: [...merged.values()].sort((a, b) => b.published_at.localeCompare(a.published_at)) };
    }
    if (action === 'accept') {
      const id = String(event.id || '');
      const offer = await db.runTransaction(async transaction => {
        const item = (await transaction.collection('cooperation').doc(id).get()).data;
        if (!item || item.status !== 'OFFERED') fail('INVALID_STATUS', '合作已变化');
        await owner(transaction, item.promoter_merchant_id, openid);
        if (dayEnd(item.end_date) <= Date.now()) fail('EXPIRED', '合作周期已结束');
        const patch = { status: 'PENDING_ADMIN', accepted_at: new Date().toISOString() };
        await transaction.collection('cooperation').doc(id).update({ data: patch });
        await transaction.collection('cooperation_open').doc(markerId(item.promoter_merchant_id, item.target_coupon_id)).update({ data: { status: 'PENDING_ADMIN' } });
        return { ...item, ...patch };
      });
      return { success: true, offer };
    }
    if (action === 'adminPending') {
      await admin(db, openid);
      return { success: true, list: (await db.collection('cooperation').where({ status: 'PENDING_ADMIN' }).limit(100).get()).data || [] };
    }
    if (action === 'adminPlacements') {
      await admin(db, openid);
      const response = await db.collection('benefit_placement').where({}).limit(100).get();
      const list = [];
      for (const placement of response.data || []) {
        const offer = (await db.collection('cooperation').doc(placement.cooperation_id).get()).data;
        if (!offer || offer.status !== 'ACTIVE') continue;
        const [source, coupon] = await Promise.all([
          db.collection('merchant').doc(placement.source_merchant_id).get(),
          db.collection('coupon').doc(placement.target_coupon_id).get()
        ]);
        list.push({ ...placement, source_merchant_name: source.data?.name || placement.source_merchant_id, target_coupon_title: coupon.data?.title || placement.target_coupon_id });
      }
      return { success: true, list };
    }
    if (action === 'adminReview') {
      const id = String(event.id || '');
      const approve = event.approve === true;
      const reason = String(event.reason || '').trim();
      if (!approve && reason.length < 3) fail('INVALID_REASON', '拒绝时须填写原因');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const item = (await transaction.collection('cooperation').doc(id).get()).data;
        if (!item || item.status !== 'PENDING_ADMIN') fail('INVALID_STATUS', '合作已不在待审队列');
        const coupon = (await transaction.collection('coupon').doc(item.target_coupon_id).get()).data;
        const buyer = (await transaction.collection('merchant').doc(item.buyer_merchant_id).get()).data;
        const promoter = (await transaction.collection('merchant').doc(item.promoter_merchant_id).get()).data;
        if (approve && (!coupon || coupon.status !== 'ACTIVE' || buyer?.status !== 'APPROVED' || promoter?.status !== 'APPROVED' || dayEnd(item.end_date) <= Date.now())) fail('INACTIVE', '合作对象或优惠券不可用');
        await transaction.collection('cooperation').doc(id).update({ data: { status: approve ? 'ACTIVE' : 'REJECTED', admin_review_reason: reason, admin_reviewed_at: new Date().toISOString() } });
        await transaction.collection('cooperation_open').doc(markerId(item.promoter_merchant_id, item.target_coupon_id)).update({ data: { status: approve ? 'ACTIVE' : 'CLOSED' } });
        if (approve) await transaction.collection('benefit_placement').doc(placementId(item.promoter_merchant_id, item.target_coupon_id)).set({ data: { source_merchant_id: item.promoter_merchant_id, target_coupon_id: item.target_coupon_id, cooperation_id: id, status: 'ACTIVE', sort: 1 } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'COOPERATION', target_id: id, actor_id: hash(openid), action: approve ? 'COOP_APPROVE' : 'COOP_REJECT', reason: reason || '审核通过', created_at: new Date().toISOString() } });
      });
      return { success: true };
    }
    if (action === 'adminSetPlacement') {
      const id = String(event.id || '');
      const sort = Number(event.sort);
      const active = event.active === true;
      const reason = String(event.reason || '').trim();
      if (!/^placement_[a-f0-9]{32}$/.test(id) || !Number.isInteger(sort) || sort < 1 || sort > 5 || reason.length < 3) fail('INVALID_PLACEMENT', '请选择 1–5 的展示顺序并填写调整依据');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const placement = (await transaction.collection('benefit_placement').doc(id).get()).data;
        if (!placement) fail('NOT_FOUND', '福利位不存在');
        const offer = (await transaction.collection('cooperation').doc(placement.cooperation_id).get()).data;
        if (!offer || offer.status !== 'ACTIVE') fail('COOPERATION_INACTIVE', '合作已不可展示');
        if (active) {
          const [coupon, source, buyer] = await Promise.all([
            transaction.collection('coupon').doc(placement.target_coupon_id).get(),
            transaction.collection('merchant').doc(placement.source_merchant_id).get(),
            transaction.collection('merchant').doc(offer.buyer_merchant_id).get()
          ]);
          if (coupon.data?.status !== 'ACTIVE' || source.data?.status !== 'APPROVED' || buyer.data?.status !== 'APPROVED') fail('INACTIVE', '优惠券或门店不可展示');
        }
        const status = active ? 'ACTIVE' : 'PAUSED';
        await transaction.collection('benefit_placement').doc(id).update({ data: { sort, status, updated_at: new Date().toISOString() } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'COOPERATION', target_id: placement.cooperation_id, actor_id: hash(openid), action: 'PLACEMENT_SET', reason, before: { sort: placement.sort, status: placement.status }, after: { sort, status }, created_at: new Date().toISOString() } });
      });
      return { success: true };
    }
    if (action === 'pause') {
      const id = String(event.id || '');
      await db.runTransaction(async transaction => {
        const offer = await party(transaction, id, openid);
        if (offer.status !== 'ACTIVE') fail('INVALID_STATUS', '合作不可暂停');
        await transaction.collection('cooperation').doc(id).update({ data: { status: 'PAUSED', paused_at: new Date().toISOString() } });
        await transaction.collection('cooperation_open').doc(markerId(offer.promoter_merchant_id, offer.target_coupon_id)).update({ data: { status: 'CLOSED' } });
        await transaction.collection('benefit_placement').doc(placementId(offer.promoter_merchant_id, offer.target_coupon_id)).update({ data: { status: 'PAUSED' } });
      });
      return { success: true };
    }
    if (action === 'results' || action === 'bill' || action === 'payments') {
      const id = String(event.id || '');
      await party(db, id, openid);
      if (action === 'results') return { success: true, list: (await db.collection('cooperation_result').where({ cooperation_id: id }).orderBy('verified_at', 'desc').limit(100).get()).data || [] };
      if (action === 'payments') return { success: true, list: (await db.collection('cooperation_payment').where({ cooperation_id: id }).orderBy('submitted_at', 'desc').limit(100).get()).data || [] };
      const bill = (await db.collection('cooperation_bill').doc(id).get()).data || emptyBill(id);
      return { success: true, bill: { ...bill, remaining_cents: Math.max(0, bill.promoter_due_cents - bill.confirmed_paid_cents - bill.pending_receipt_cents), overpaid_cents: Math.max(0, bill.confirmed_paid_cents + bill.pending_receipt_cents - bill.promoter_due_cents) } };
    }
    if (action === 'buyerReview') {
      const id = String(event.id || '');
      const valid = event.validNewCustomer === true;
      const note = String(event.note || '').trim();
      if (note.length < 3) fail('INVALID_NOTE', '请填写新客核对依据或无效原因');
      const result = await db.runTransaction(async transaction => {
        const item = (await transaction.collection('cooperation_result').doc(id).get()).data;
        if (!item || item.status !== 'PENDING_BUYER') fail('INVALID_STATUS', '结果已变化');
        const offer = (await transaction.collection('cooperation').doc(item.cooperation_id).get()).data;
        if (!offer || offer.buyer_merchant_id !== item.buyer_merchant_id) fail('NOT_FOUND', '合作不存在');
        await owner(transaction, item.buyer_merchant_id, openid);
        const patch = { status: valid ? 'PENDING_PROMOTER' : 'INELIGIBLE', buyer_note: note, buyer_reviewed_at: new Date().toISOString() };
        await transaction.collection('cooperation_result').doc(id).update({ data: patch });
        return { ...item, ...patch };
      });
      return { success: true, result };
    }
    if (action === 'promoterReview') {
      const id = String(event.id || '');
      const accept = event.accept === true;
      const note = String(event.note || '').trim();
      if (!accept && note.length < 3) fail('INVALID_NOTE', '请填写争议原因');
      const result = await db.runTransaction(async transaction => {
        const item = (await transaction.collection('cooperation_result').doc(id).get()).data;
        if (!item || item.status !== 'PENDING_PROMOTER') fail('INVALID_STATUS', '结果已变化');
        const offer = (await transaction.collection('cooperation').doc(item.cooperation_id).get()).data;
        if (!offer || offer.promoter_merchant_id !== item.promoter_merchant_id) fail('NOT_FOUND', '合作不存在');
        await owner(transaction, item.promoter_merchant_id, openid);
        const now = new Date().toISOString();
        let status = accept ? 'CONFIRMED' : 'DISPUTED';
        let reason = note;
        if (accept) {
          const lockId = `new_customer_${hash(`${item.user_id}:${item.buyer_merchant_id}`)}`;
          const lock = (await transaction.collection('new_customer_lock').doc(lockId).get()).data;
          if (lock && lock.status === 'ACTIVE' && Date.now() - new Date(lock.confirmed_at).getTime() < offer.new_customer_window_days * 86400000) {
            status = 'INELIGIBLE'; reason = '新客排重期内已有已确认记录';
          } else {
            await transaction.collection('new_customer_lock').doc(lockId).set({ data: { result_id: id, confirmed_at: now, status: 'ACTIVE' } });
            if (offer.pricing_model === 'PER_RESULT') {
              const bill = (await transaction.collection('cooperation_bill').doc(offer._id).get()).data || emptyBill(offer._id);
              await transaction.collection('cooperation_bill').doc(offer._id).set({ data: {
                ...bill, confirmed_results: bill.confirmed_results + 1,
                payable_cents: bill.payable_cents + offer.unit_price_cents,
                platform_fee_cents: bill.platform_fee_cents + offer.platform_fee_cents,
                promoter_due_cents: bill.promoter_due_cents + offer.unit_price_cents - offer.platform_fee_cents
              } });
            } else {
              const bill = (await transaction.collection('cooperation_bill').doc(offer._id).get()).data || emptyBill(offer._id);
              await transaction.collection('cooperation_bill').doc(offer._id).update({ data: { confirmed_results: bill.confirmed_results + 1 } });
            }
          }
        }
        const patch = { status, promoter_note: reason, promoter_reviewed_at: now, ...(status === 'CONFIRMED' ? { confirmed_at: now } : {}) };
        await transaction.collection('cooperation_result').doc(id).update({ data: patch });
        return { ...item, ...patch };
      });
      return { success: true, result };
    }
    if (action === 'confirmSlotDelivery') {
      const id = String(event.id || '');
      const note = String(event.note || '').trim();
      if (note.length < 5) fail('INVALID_NOTE', '请填写展位履约核对依据');
      const offer = await db.runTransaction(async transaction => {
        const item = (await transaction.collection('cooperation').doc(id).get()).data;
        if (!item || item.pricing_model !== 'BY_SLOT' || !item.accepted_at || item.status === 'PAUSED') fail('INVALID_STATUS', '展位合作不可确认');
        await owner(transaction, item.buyer_merchant_id, openid);
        if (item.slot_delivery_confirmed_at) return item;
        if (Date.now() <= dayEnd(item.end_date)) fail('PERIOD_ACTIVE', '展示期未结束，不能生成应付');
        const bill = (await transaction.collection('cooperation_bill').doc(id).get()).data || emptyBill(id);
        const now = new Date().toISOString();
        await transaction.collection('cooperation').doc(id).update({ data: { status: 'ENDED', slot_delivery_confirmed_at: now, slot_delivery_note: note } });
        await transaction.collection('cooperation_bill').doc(id).set({ data: {
          ...bill, payable_cents: item.slot_price_cents,
          platform_fee_cents: item.platform_fee_cents,
          promoter_due_cents: item.slot_price_cents - item.platform_fee_cents
        } });
        return { ...item, status: 'ENDED', slot_delivery_confirmed_at: now, slot_delivery_note: note };
      });
      return { success: true, offer };
    }
    if (action === 'submitPayment') {
      const id = String(event.id || '');
      const reference = String(event.reference || '').trim();
      if (reference.length < 4) fail('INVALID_REFERENCE', '请填写可核对的线下付款凭据');
      const payment = await db.runTransaction(async transaction => {
        const offer = (await transaction.collection('cooperation').doc(id).get()).data;
        if (!offer) fail('NOT_FOUND', '合作不存在');
        await owner(transaction, offer.buyer_merchant_id, openid);
        const bill = (await transaction.collection('cooperation_bill').doc(id).get()).data || emptyBill(id);
        const remaining = bill.promoter_due_cents - bill.confirmed_paid_cents - bill.pending_receipt_cents;
        if (remaining <= 0) fail('NOTHING_DUE', '当前没有待付金额');
        const markerId = `payment_ref_${hash(`${id}:${reference}`)}`;
        const marker = (await transaction.collection('cooperation_payment_ref').doc(markerId).get()).data;
        if (marker) fail('DUPLICATE_REFERENCE', '该付款凭据已登记');
        const paymentId = `payment_${uuid()}`;
        const item = { _id: paymentId, cooperation_id: id, amount_cents: remaining, payment_reference: reference, status: 'PENDING_RECEIPT', submitted_at: new Date().toISOString() };
        await transaction.collection('cooperation_payment').doc(paymentId).set({ data: item });
        await transaction.collection('cooperation_payment_ref').doc(markerId).set({ data: { payment_id: paymentId } });
        await transaction.collection('cooperation_bill').doc(id).update({ data: { pending_receipt_cents: bill.pending_receipt_cents + remaining } });
        return item;
      });
      return { success: true, payment };
    }
    if (action === 'confirmReceipt') {
      const paymentId = String(event.id || '');
      const payment = await db.runTransaction(async transaction => {
        const item = (await transaction.collection('cooperation_payment').doc(paymentId).get()).data;
        if (!item || item.status !== 'PENDING_RECEIPT') fail('INVALID_STATUS', '付款记录已变化');
        const offer = (await transaction.collection('cooperation').doc(item.cooperation_id).get()).data;
        if (!offer) fail('NOT_FOUND', '合作不存在');
        await owner(transaction, offer.promoter_merchant_id, openid);
        const bill = (await transaction.collection('cooperation_bill').doc(offer._id).get()).data;
        if (!bill || bill.pending_receipt_cents < item.amount_cents) fail('BILL_MISMATCH', '账单与付款记录不一致');
        const now = new Date().toISOString();
        await transaction.collection('cooperation_payment').doc(paymentId).update({ data: { status: 'CONFIRMED', confirmed_at: now } });
        await transaction.collection('cooperation_bill').doc(offer._id).update({ data: { pending_receipt_cents: bill.pending_receipt_cents - item.amount_cents, confirmed_paid_cents: bill.confirmed_paid_cents + item.amount_cents } });
        return { ...item, status: 'CONFIRMED', confirmed_at: now };
      });
      return { success: true, payment };
    }
    if (action === 'adminResults') {
      await admin(db, openid);
      const [disputed, confirmed] = await Promise.all([
        db.collection('cooperation_result').where({ status: 'DISPUTED' }).limit(100).get(),
        db.collection('cooperation_result').where({ status: 'CONFIRMED' }).limit(100).get()
      ]);
      return { success: true, list: [...(disputed.data || []), ...(confirmed.data || [])] };
    }
    if (action === 'adminResolveResult') {
      const id = String(event.id || '');
      const valid = event.valid === true;
      const reason = String(event.reason || '').trim();
      if (reason.length < 3) fail('INVALID_REASON', '请填写争议或退款处理依据');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const result = (await transaction.collection('cooperation_result').doc(id).get()).data;
        if (!result || !['DISPUTED', 'CONFIRMED'].includes(result.status) || (result.status === 'CONFIRMED' && valid)) fail('INVALID_STATUS', '结果不可更正');
        const offer = (await transaction.collection('cooperation').doc(result.cooperation_id).get()).data;
        if (!offer) fail('NOT_FOUND', '合作不存在');
        const bill = (await transaction.collection('cooperation_bill').doc(offer._id).get()).data || emptyBill(offer._id);
        const lockId = `new_customer_${hash(`${result.user_id}:${result.buyer_merchant_id}`)}`;
        const lock = (await transaction.collection('new_customer_lock').doc(lockId).get()).data;
        const now = new Date().toISOString();
        let status;
        if (result.status === 'CONFIRMED') {
          status = 'INVALIDATED';
          if (lock && lock.result_id === id) await transaction.collection('new_customer_lock').doc(lockId).update({ data: { status: 'RELEASED', released_at: now } });
          const adjustment = offer.pricing_model === 'PER_RESULT' ? { payable_cents: Math.max(0, bill.payable_cents - offer.unit_price_cents), platform_fee_cents: Math.max(0, bill.platform_fee_cents - offer.platform_fee_cents), promoter_due_cents: Math.max(0, bill.promoter_due_cents - offer.unit_price_cents + offer.platform_fee_cents) } : {};
          await transaction.collection('cooperation_bill').doc(offer._id).update({ data: { confirmed_results: Math.max(0, bill.confirmed_results - 1), ...adjustment } });
          if (result.confirmed_at) {
            const date = new Date(new Date(result.confirmed_at).getTime() + 8 * 3600000).toISOString().slice(0, 10);
            for (const [merchantId, field] of [[result.promoter_merchant_id, 'bring_new_guest_count'], [result.buyer_merchant_id, 'received_guest_count']]) {
              const statId = `${date}_${merchantId}`;
              const stat = (await transaction.collection('merchant_daily_stat').doc(statId).get()).data;
              if (stat) await transaction.collection('merchant_daily_stat').doc(statId).update({ data: { [field]: Math.max(0, Number(stat[field] || 0) - 1) } });
            }
          }
        } else if (!valid) status = 'INELIGIBLE';
        else if (lock && lock.status === 'ACTIVE' && Date.now() - new Date(lock.confirmed_at).getTime() < offer.new_customer_window_days * 86400000) status = 'INELIGIBLE';
        else {
          status = 'CONFIRMED';
          await transaction.collection('new_customer_lock').doc(lockId).set({ data: { result_id: id, confirmed_at: now, status: 'ACTIVE' } });
          const adjustment = offer.pricing_model === 'PER_RESULT' ? { payable_cents: bill.payable_cents + offer.unit_price_cents, platform_fee_cents: bill.platform_fee_cents + offer.platform_fee_cents, promoter_due_cents: bill.promoter_due_cents + offer.unit_price_cents - offer.platform_fee_cents } : {};
          await transaction.collection('cooperation_bill').doc(offer._id).update({ data: { confirmed_results: bill.confirmed_results + 1, ...adjustment } });
        }
        await transaction.collection('cooperation_result').doc(id).update({ data: { status, admin_resolution_reason: reason, admin_resolved_at: now, ...(status === 'CONFIRMED' ? { confirmed_at: now } : {}) } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'COOPERATION', target_id: id, actor_id: hash(openid), action: status === 'INVALIDATED' ? 'COOP_RESULT_INVALIDATE' : 'COOP_DISPUTE_RESOLVE', reason, created_at: now } });
      });
      return { success: true };
    }
    fail('INVALID_ACTION', '操作无效');
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[cooperationManage] failed', { message: error.message });
    return { success: false, code: 'COOPERATION_FAILED', message: '合作服务暂不可用' };
  }
};
