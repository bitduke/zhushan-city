const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

exports.main = async () => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  try {
    const coupons = [];
    for (let offset = 0; ; offset += 100) {
      const response = await db.collection('user_coupon').where({ user_id: hash(openid) }).orderBy('claimed_at', 'desc').skip(offset).limit(100).get();
      const batch = response.data || [];
      coupons.push(...batch);
      if (batch.length < 100) break;
    }
    const merchantIds = [...new Set(coupons.map(item => item.merchant_id))];
    const merchantStatuses = new Map(await Promise.all(merchantIds.map(async id => {
      const response = await db.collection('merchant').doc(id).get();
      return [id, response.data?.status];
    })));
    const now = Date.now();
    return { success: true, list: coupons.map(item => ({
      ...item,
      status: item.status === 'UNUSED' && new Date(item.expires_at).getTime() <= now ? 'EXPIRED' : item.status,
      merchant_suspended: merchantStatuses.get(item.merchant_id) !== 'APPROVED'
    })) };
  } catch (error) {
    console.error('[getMyCoupons] failed', { message: error.message });
    return { success: false, code: 'COUPON_LIST_FAILED', message: '券包暂不可用' };
  }
};
