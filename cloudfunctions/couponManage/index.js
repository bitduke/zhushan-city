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
  if (!merchant || merchant.owner_openid !== openid || merchant.status !== 'APPROVED') fail('FORBIDDEN', '只有已审核店铺所有者可管理券');
  return merchant;
}
async function admin(reader, openid) {
  const user = (await reader.collection('user').doc(`user_${hash(openid)}`).get()).data;
  if (!user || user.status !== 'ACTIVE' || user.role !== 'ADMIN') fail('FORBIDDEN', '无管理员权限');
}
function validate(input = {}, merchant) {
  const title = String(input.title || '').trim();
  const instructions = String(input.instructions || '').trim();
  const type = String(input.type || '');
  const mode = String(input.usage_mode || '');
  const condition = Number(input.condition_amount || 0);
  const discount = Number(input.discount_amount);
  const total = Number(input.total_count);
  const limit = Number(input.per_user_limit);
  const start = String(input.start_time || '');
  const end = String(input.end_time || '');
  if (title.length < 4 || title.length > 40 || instructions.length < 10) fail('INVALID_RULE', '请填写完整券标题和规则');
  if (!['FULL_REDUCTION', 'EXPERIENCE'].includes(type) || !['INSTANT', 'WALK_IN', 'BOOKING'].includes(mode)) fail('INVALID_TYPE', '券类型或使用方式无效');
  if (!Number.isFinite(condition) || condition < 0 || !Number.isFinite(discount) || discount <= 0 || (type === 'FULL_REDUCTION' && condition <= discount)) fail('INVALID_AMOUNT', '优惠金额或门槛无效');
  if (!Number.isInteger(total) || total < 1 || total > 10000 || !Number.isInteger(limit) || limit < 1 || limit > Math.min(5, total)) fail('INVALID_LIMIT', '库存或限领数量无效');
  if (!Number.isFinite(dayStart(start)) || !Number.isFinite(dayEnd(end)) || dayEnd(end) < dayStart(start) || dayEnd(end) <= Date.now()) fail('INVALID_TIME', '券有效期无效');
  if (mode === 'BOOKING' && (!merchant.daily_booking_limit || merchant.daily_booking_limit < 1)) fail('CAPACITY_NOT_CONFIGURED', '预约券要求门店先设置每日接待上限');
  return { title, instructions, type, usage_mode: mode, condition_amount: condition, discount_amount: discount, total_count: total, per_user_limit: limit, start_time: start, end_time: end, booking_required: mode === 'BOOKING' };
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const action = event.action;
  const merchantId = String(event.merchantId || '');
  try {
    if (action !== 'publicByMerchant' && (await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    if (action === 'publicByMerchant') {
      const merchant = (await db.collection('merchant').doc(merchantId).get()).data;
      if (!merchant || merchant.status !== 'APPROVED') return { success: true, list: [] };
      const response = await db.collection('coupon').where({ merchant_id: merchantId, status: 'ACTIVE' }).limit(100).get();
      return { success: true, list: (response.data || []).filter(item => Date.now() >= dayStart(item.start_time) && Date.now() <= dayEnd(item.end_time) && (item.claimed_count || 0) < item.total_count) };
    }
    if (action === 'merchantList') {
      await owner(db, merchantId, openid);
      const response = await db.collection('coupon').where({ merchant_id: merchantId }).limit(100).get();
      return { success: true, list: response.data || [] };
    }
    if (action === 'create') {
      const merchant = await owner(db, merchantId, openid);
      const clean = validate(event.data, merchant);
      const template = { _id: `cp_${uuid()}`, merchant_id: merchantId, merchant_name: merchant.name, merchant_address: merchant.address, merchant_phone: merchant.phone,
        ...clean, claimed_count: 0, redeemed_count: 0, status: 'DRAFT', created_at: new Date().toISOString() };
      await db.collection('coupon').doc(template._id).set({ data: template });
      return { success: true, template };
    }
    if (action === 'activate' || action === 'pause') {
      const id = String(event.id || '');
      await db.runTransaction(async transaction => {
        await owner(transaction, merchantId, openid);
        const template = (await transaction.collection('coupon').doc(id).get()).data;
        if (!template || template.merchant_id !== merchantId) fail('FORBIDDEN', '无权操作该券');
        if (action === 'activate') {
          if (!['DRAFT', 'PAUSED'].includes(template.status) || dayEnd(template.end_time) <= Date.now()) fail('INVALID_STATUS', '券不可上架');
          await transaction.collection('coupon').doc(id).update({ data: { status: 'ACTIVE' } });
        } else {
          if (template.status !== 'ACTIVE') fail('INVALID_STATUS', '券不可暂停');
          await transaction.collection('coupon').doc(id).update({ data: { status: 'PAUSED' } });
        }
      });
      return { success: true };
    }
    if (action === 'adminAll' || action === 'adminForcePause') {
      await admin(db, openid);
      if (action === 'adminAll') return { success: true, list: (await db.collection('coupon').limit(100).get()).data || [] };
      const id = String(event.id || '');
      const reason = String(event.reason || '').trim();
      if (reason.length < 3) fail('INVALID_REASON', '请填写停用原因');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const template = (await transaction.collection('coupon').doc(id).get()).data;
        if (!template || template.status !== 'ACTIVE') fail('INVALID_STATUS', '券已不可新领');
        await transaction.collection('coupon').doc(id).update({ data: { status: 'PAUSED' } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'COUPON', target_id: id, actor_id: hash(openid), action: 'COUPON_FORCE_PAUSE', reason, created_at: new Date().toISOString() } });
      });
      return { success: true };
    }
    fail('INVALID_ACTION', '操作无效');
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[couponManage] failed', { message: error.message });
    return { success: false, code: 'COUPON_MANAGE_FAILED', message: '券管理暂不可用' };
  }
};
