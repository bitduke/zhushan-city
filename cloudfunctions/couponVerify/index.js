const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const VERIFY_ERROR_CODES = {
  NOT_FOUND: 4001,
  WRONG_MERCHANT: 4002,
  ALREADY_USED: 4003,
  EXPIRED: 4004,
  NOT_ACTIVE: 4005,
  BOOKING_REQUIRED: 4007
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const operatorOpenid = wxContext.OPENID;
  const { code, operatorMerchantId } = event;

  if (!code || !operatorMerchantId) {
    return { success: false, code: 4000, message: '参数不完整' };
  }

  // 1. 查找用户券
  const queryRes = await db.collection('user_coupon').where({ code: code.trim() }).get();
  if (queryRes.data.length === 0) {
    return { success: false, code: VERIFY_ERROR_CODES.NOT_FOUND, message: '核销失败：券码不存在' };
  }

  const userCoupon = queryRes.data[0];

  // 2. 校验商户归属
  if (userCoupon.merchant_id !== operatorMerchantId) {
    return { success: false, code: VERIFY_ERROR_CODES.WRONG_MERCHANT, message: '核销失败：此券不属于本店' };
  }

  // 3. 校验状态
  if (userCoupon.status === 'USED') {
    return { success: false, code: VERIFY_ERROR_CODES.ALREADY_USED, message: '核销失败：该券此前已被核销使用' };
  }

  // 4. 校验过期
  const now = new Date();
  if (userCoupon.expires_at && new Date(userCoupon.expires_at) < now) {
    return { success: false, code: VERIFY_ERROR_CODES.EXPIRED, message: '核销失败：该券已超过有效期' };
  }

  // 5. 校验预约 (若需预约)
  if (userCoupon.rule_snapshot?.booking_required) {
    const appointRes = await db.collection('appointment').where({
      user_coupon_id: userCoupon._id,
      status: 'CONFIRMED'
    }).get();
    if (appointRes.data.length === 0) {
      // 检查是否免预约
    }
  }

  // 6. 原子更新为 USED (防止并发双击双核销)
  const updateRes = await db.collection('user_coupon').where({
    _id: userCoupon._id,
    status: 'UNUSED'
  }).update({
    data: {
      status: 'USED',
      used_at: now
    }
  });

  if (updateRes.stats.updated === 0) {
    return { success: false, code: VERIFY_ERROR_CODES.ALREADY_USED, message: '核销失败：已被核销，请勿重复操作' };
  }

  // 7. 写入核销日志
  await db.collection('verify_log').add({
    data: {
      user_coupon_id: userCoupon._id,
      coupon_id: userCoupon.coupon_id,
      merchant_id: operatorMerchantId,
      source_merchant_id: userCoupon.source_merchant_id || '',
      operator_openid: operatorOpenid,
      verify_time: now
    }
  });

  return {
    success: true,
    message: '核销成功！',
    coupon: userCoupon
  };
};
