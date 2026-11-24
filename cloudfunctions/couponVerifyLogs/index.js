const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  const merchantId = String(event.merchantId || '');
  if (!openid || !merchantId) return { success: false, message: '无权查看核销记录' };
  try {
    if ((await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, message: '账号已停用' };
    const merchant = (await db.collection('merchant').doc(merchantId).get()).data;
    const staff = (await db.collection('merchant_staff').doc(`staff_${hash(`${merchantId}:${openid}`)}`).get()).data;
    if (!merchant || (merchant.owner_openid !== openid && !(staff && staff.status === 'ACTIVE' && staff.can_verify))) return { success: false, message: '无权查看核销记录' };
    const response = await db.collection('verify_log').where({ merchant_id: merchantId }).orderBy('verified_at', 'desc').limit(100).get();
    return { success: true, list: response.data || [] };
  } catch (error) {
    console.error('[couponVerifyLogs] failed', { message: error.message });
    return { success: false, message: '核销记录暂不可用' };
  }
};
