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
    const merchantMetaMap = new Map(await Promise.all(merchantIds.map(async id => {
      const response = await db.collection('merchant').doc(id).get();
      const m = response.data;
      return [id, {
        status: m?.status,
        category_id: m?.category_id || '',
        category_name: m?.category_name || ''
      }];
    })));
    const now = Date.now();
    return {
      success: true,
      list: coupons.map(item => {
        const meta = merchantMetaMap.get(item.merchant_id);
        return {
          ...item,
          category_id: item.category_id || meta?.category_id || '',
          category_name: item.category_name || meta?.category_name || '',
          status: item.status === 'UNUSED' && new Date(item.expires_at).getTime() <= now ? 'EXPIRED' : item.status,
          merchant_suspended: meta?.status !== 'APPROVED'
        };
      })
    };
  } catch (error) {
    console.error('[getMyCoupons] failed', { message: error.message });
    return { success: false, code: 'COUPON_LIST_FAILED', message: '券包暂不可用' };
  }
};
