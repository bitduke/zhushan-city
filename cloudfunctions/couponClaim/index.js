const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { couponId, sourceMerchantId } = event;

  if (!openid || !couponId) {
    return { success: false, message: '参数缺失' };
  }

  // 1. 查找券模板
  const couponDoc = await db.collection('coupon').doc(couponId).get();
  if (!couponDoc || !couponDoc.data) {
    return { success: false, message: '优惠券不存在或已下架' };
  }
  const coupon = couponDoc.data;

  // 2. 校验限领
  const claimedCountRes = await db.collection('user_coupon').where({
    openid,
    coupon_id: couponId
  }).count();

  if (claimedCountRes.total >= (coupon.per_user_limit || 1)) {
    return { success: false, message: '您已达到该券领取上限' };
  }

  // 3. 原子扣库存: where claimed_count < total_count
  const updateRes = await db.collection('coupon').where({
    _id: couponId,
    claimed_count: _.lt(coupon.total_count)
  }).update({
    data: {
      claimed_count: _.inc(1)
    }
  });

  if (updateRes.stats.updated === 0) {
    return { success: false, message: '手慢了，该优惠券已被抢光' };
  }

  // 4. 生成唯一券码 ZS + 时间戳后6位 + 4位随机数
  const uniqueCode = 'ZS' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);

  // 5. 写入 user_coupon 表并固化规则快照
  const newUserCoupon = {
    code: uniqueCode,
    openid,
    coupon_id: couponId,
    merchant_id: coupon.merchant_id,
    merchant_name: coupon.merchant_name,
    merchant_address: coupon.merchant_address || '',
    merchant_phone: coupon.merchant_phone || '',
    source_merchant_id: sourceMerchantId || '',
    status: 'UNUSED',
    claimed_at: new Date(),
    expires_at: coupon.end_time || new Date(Date.now() + 30 * 86400000).toISOString(),
    rule_snapshot: {
      title: coupon.title,
      type: coupon.type,
      condition_amount: coupon.condition_amount,
      discount_amount: coupon.discount_amount,
      usage_mode: coupon.usage_mode || 'WALK_IN',
      booking_required: !!coupon.booking_required,
      instructions: coupon.instructions || ''
    }
  };

  const addRes = await db.collection('user_coupon').add({
    data: newUserCoupon
  });

  return {
    success: true,
    userCouponId: addRes._id,
    code: uniqueCode,
    coupon: newUserCoupon
  };
};
