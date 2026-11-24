const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const ERRORS = {
  4001: '核销失败：券码不存在或无效',
  4002: '核销失败：此券不属于本店',
  4003: '核销失败：该券已被核销',
  4004: '核销失败：该券已过有效期',
  4005: '核销失败：该券未到生效时间',
  4006: '核销失败：商家或券服务已暂停',
  4007: '核销失败：请先完成预约并由商家确认到店',
  4008: '核销失败：当前账号无本店核销权限'
};
class BusinessError extends Error {
  constructor(code) { super(ERRORS[code]); this.code = code; }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  const code = typeof event.code === 'string' ? event.code.trim().toUpperCase() : '';
  const merchantId = typeof event.operatorMerchantId === 'string' ? event.operatorMerchantId.trim() : '';
  if (!openid) return { success: false, code: 4008, message: ERRORS[4008] };
  if (!/^ZS[A-Z0-9]{10,30}$/.test(code) || !/^[A-Za-z0-9_-]{1,96}$/.test(merchantId)) {
    return { success: false, code: 4001, message: ERRORS[4001] };
  }

  try {
    if ((await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 4008, message: ERRORS[4008] };
    const lookup = await db.collection('user_coupon').where({ code }).limit(1).get();
    const found = lookup.data && lookup.data[0];
    if (!found) throw new BusinessError(4001);
    const result = await db.runTransaction(async transaction => {
      const couponResult = await transaction.collection('user_coupon').doc(found._id).get();
      const coupon = couponResult.data;
      if (!coupon) throw new BusinessError(4001);
      if (coupon.merchant_id !== merchantId) throw new BusinessError(4002);
      const merchantResult = await transaction.collection('merchant').doc(merchantId).get();
      const merchant = merchantResult.data;
      if (!merchant || merchant.status !== 'APPROVED') throw new BusinessError(4006);
      const staffResult = await transaction.collection('merchant_staff').doc(`staff_${hash(`${merchantId}:${openid}`)}`).get();
      const staff = staffResult.data;
      const userResult = await transaction.collection('user').doc(`user_${hash(openid)}`).get();
      const admin = userResult.data && userResult.data.status === 'ACTIVE' && userResult.data.role === 'ADMIN';
      if (merchant.owner_openid !== openid && !admin && !(staff && staff.status === 'ACTIVE' && staff.can_verify)) throw new BusinessError(4008);
      if (coupon.status === 'USED') throw new BusinessError(4003);
      if (coupon.status === 'VOID') throw new BusinessError(4006);
      if (coupon.status === 'EXPIRED' || new Date(coupon.expires_at).getTime() <= Date.now()) throw new BusinessError(4004);
      if (coupon.status !== 'UNUSED') throw new BusinessError(4006);
      if (coupon.rule_snapshot && coupon.rule_snapshot.start_time && new Date(coupon.rule_snapshot.start_time).getTime() > Date.now()) throw new BusinessError(4005);

      let appointment;
      if (coupon.rule_snapshot && coupon.rule_snapshot.booking_required) {
        const appointmentResult = await transaction.collection('appointment').doc(coupon._id).get();
        appointment = appointmentResult.data;
        if (!appointment || appointment.status !== 'ARRIVED') throw new BusinessError(4007);
      }
      const logResult = await transaction.collection('verify_log').doc(coupon._id).get();
      if (logResult.data) throw new BusinessError(4003);
      const now = new Date().toISOString();
      await transaction.collection('user_coupon').doc(coupon._id).update({ data: { status: 'USED', used_at: now } });
      const templateResult = await transaction.collection('coupon').doc(coupon.coupon_id).get();
      if (templateResult.data) await transaction.collection('coupon').doc(coupon.coupon_id).update({ data: { redeemed_count: (templateResult.data.redeemed_count || 0) + 1 } });
      if (appointment) await transaction.collection('appointment').doc(coupon._id).update({ data: { status: 'COMPLETED', completed_at: now } });
      await transaction.collection('verify_log').doc(coupon._id).set({ data: {
        user_coupon_id: coupon._id, coupon_id: coupon.coupon_id,
        coupon_code: coupon.code, coupon_title: coupon.rule_snapshot?.title || '',
        merchant_id: merchantId, source_merchant_id: coupon.source_merchant_id || '',
        operator_hash: hash(openid), verified_at: now
      } });
      if (coupon.cooperation_contract_id) {
        await transaction.collection('cooperation_result').doc(coupon._id).set({ data: {
          cooperation_id: coupon.cooperation_contract_id,
          user_coupon_id: coupon._id,
          user_id: coupon.user_id,
          buyer_merchant_id: merchantId,
          promoter_merchant_id: coupon.source_merchant_id,
          coupon_code: coupon.code,
          status: 'PENDING_BUYER', verified_at: now
        } });
      }
      return { ...coupon, status: 'USED', used_at: now };
    });
    return { success: true, message: '核销成功', coupon: result };
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[couponVerify] failed', { message: error.message });
    return { success: false, code: 'VERIFY_FAILED', message: '核销暂不可用，请稍后重试' };
  }
};
