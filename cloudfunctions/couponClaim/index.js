const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const dayStart = value => new Date(`${String(value).slice(0, 10)}T00:00:00+08:00`).getTime();
const dayEnd = value => new Date(`${String(value).slice(0, 10)}T23:59:59+08:00`).getTime();

class BusinessError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

exports.main = async (event = {}) => {
  // Only Mini Program cloud-function calls may invoke this function. Never use event.openid as identity.
  const openid = cloud.getWXContext().OPENID;
  const couponId = typeof event.couponId === 'string' ? event.couponId.trim() : '';
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '请重新进入小程序' };
  if (!/^[A-Za-z0-9_-]{1,96}$/.test(couponId)) return { success: false, code: 'INVALID_COUPON', message: '优惠券参数无效' };

  try {
    if ((await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    const userHash = hash(openid);
    const coupon = await db.runTransaction(async transaction => {
      const templateResult = await transaction.collection('coupon').doc(couponId).get();
      const template = templateResult.data;
      if (!template) throw new BusinessError('COUPON_NOT_FOUND', '优惠券不存在');
      const now = Date.now();
      const perUserLimit = Number(template.per_user_limit || 1);
      if (!Number.isInteger(perUserLimit) || perUserLimit < 1 || perUserLimit > 5) throw new BusinessError('COUPON_CONFIG', '优惠券限领设置无效');

      let requestId = '';
      let markerId = '';
      if (perUserLimit > 1) {
        requestId = typeof event.requestId === 'string' ? event.requestId.trim() : '';
        if (!/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) throw new BusinessError('REQUEST_ID_REQUIRED', '请重试领取操作');
        markerId = `claim_${hash(`${openid}:${couponId}:${requestId}`)}`;
        const markerResult = await transaction.collection('claim_request').doc(markerId).get();
        if (markerResult.data) {
          const previous = await transaction.collection('user_coupon').doc(markerResult.data.user_coupon_id).get();
          if (previous.data) return previous.data;
        }
      }

      let slotId = '';
      for (let slot = 0; slot < perUserLimit; slot++) {
        const candidate = `uc_${hash(`${openid}:${couponId}:${slot}`)}`;
        const existing = await transaction.collection('user_coupon').doc(candidate).get();
        if (!existing.data) { slotId = candidate; break; }
        if (perUserLimit === 1) return existing.data; // A retry returns the same promise and code.
      }
      if (!slotId) throw new BusinessError('LIMIT_REACHED', '已达到该券领取上限');
      const merchantResult = await transaction.collection('merchant').doc(template.merchant_id).get();
      const merchant = merchantResult.data;
      if (!merchant || merchant.status !== 'APPROVED') throw new BusinessError('MERCHANT_INACTIVE', '门店暂不可发券');
      if (template.status !== 'ACTIVE' || now < dayStart(template.start_time) || now > dayEnd(template.end_time)) {
        throw new BusinessError('COUPON_INACTIVE', '优惠券不在领取时间内');
      }
      if ((template.claimed_count || 0) >= template.total_count) throw new BusinessError('OUT_OF_STOCK', '优惠券已领完');

      const attributionResult = await transaction.collection('scan_attribution').doc(`source_${userHash}`).get();
      const attribution = attributionResult.data;
      let sourceMerchantId = template.merchant_id;
      if (attribution && now - new Date(attribution.scanned_at).getTime() <= 30 * 60000) {
        sourceMerchantId = attribution.source_merchant_id;
      }
      let cooperationId = '';
      if (sourceMerchantId !== template.merchant_id) {
        const sourceMerchantResult = await transaction.collection('merchant').doc(sourceMerchantId).get();
        if (!sourceMerchantResult.data || sourceMerchantResult.data.status !== 'APPROVED') throw new BusinessError('SOURCE_INACTIVE', '来源门店不可用');
        const placementId = `placement_${hash(`${sourceMerchantId}:${couponId}`)}`;
        const placementResult = await transaction.collection('benefit_placement').doc(placementId).get();
        const placement = placementResult.data;
        if (!placement || placement.status !== 'ACTIVE') throw new BusinessError('PLACEMENT_INACTIVE', '合作优惠已结束');
        const cooperationResult = await transaction.collection('cooperation').doc(placement.cooperation_id).get();
        const cooperation = cooperationResult.data;
        if (!cooperation || cooperation.status !== 'ACTIVE' || cooperation.promoter_merchant_id !== sourceMerchantId || cooperation.target_coupon_id !== couponId || now < dayStart(cooperation.start_date) || now > dayEnd(cooperation.end_date)) {
          throw new BusinessError('COOPERATION_INACTIVE', '合作优惠暂不可领取');
        }
        const reserved = Number(cooperation.reserved_count || 0);
        if (cooperation.pricing_model === 'PER_RESULT') {
          const capacity = Math.floor(cooperation.budget_cents / cooperation.unit_price_cents);
          if (!Number.isFinite(capacity) || reserved >= capacity) throw new BusinessError('COOPERATION_FULL', '合作优惠名额已满');
        }
        cooperationId = cooperation._id;
        if (cooperation.pricing_model === 'PER_RESULT') {
          await transaction.collection('cooperation').doc(cooperation._id).update({ data: { reserved_count: reserved + 1 } });
        }
      }

      const code = `ZS${hash(slotId).slice(0, 20).toUpperCase()}`;
      const userCoupon = {
        _id: slotId, code, user_id: userHash, coupon_id: couponId,
        merchant_id: template.merchant_id, merchant_name: merchant.name,
        merchant_address: merchant.address || '', merchant_phone: merchant.phone || '',
        source_merchant_id: sourceMerchantId, cooperation_contract_id: cooperationId,
        status: 'UNUSED', claimed_at: new Date(now).toISOString(),
        expires_at: `${String(template.end_time).slice(0, 10)}T23:59:59+08:00`,
        rule_snapshot: {
          title: template.title, type: template.type, usage_mode: template.usage_mode,
          start_time: `${String(template.start_time).slice(0, 10)}T00:00:00+08:00`,
          condition_amount: template.condition_amount || 0, discount_amount: template.discount_amount || 0,
          booking_required: !!template.booking_required, instructions: template.instructions || ''
        }
      };
      await transaction.collection('user_coupon').doc(slotId).set({ data: userCoupon });
      await transaction.collection('coupon').doc(couponId).update({ data: { claimed_count: (template.claimed_count || 0) + 1 } });
      if (markerId) await transaction.collection('claim_request').doc(markerId).set({ data: { user_coupon_id: slotId } });
      return userCoupon;
    });
    return { success: true, coupon };
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[couponClaim] failed', { message: error.message });
    return { success: false, code: 'CLAIM_FAILED', message: '领券暂不可用，请稍后重试' };
  }
};
