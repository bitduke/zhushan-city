const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

exports.main = async (event = {}) => {
  // This function must be callable only through the Mini Program cloud-function channel.
  const openid = cloud.getWXContext().OPENID;
  const token = typeof event.token === 'string' ? event.token.trim() : '';
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(token)) return { success: false, code: 'INVALID_TOKEN', message: '门店码无效' };

  try {
    if (event.action === 'enter' && (await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    const tokenResult = await db.collection('scan_token').doc(token).get();
    const mapping = tokenResult.data;
    if (!mapping || mapping.status !== 'ACTIVE' || mapping.type !== 'MERCHANT') {
      return { success: false, code: 'TOKEN_INACTIVE', message: '门店码不存在或已失效' };
    }
    const merchantResult = await db.collection('merchant').doc(mapping.target_id).get();
    const merchant = merchantResult.data;
    if (!merchant || merchant.status !== 'APPROVED') {
      return { success: false, code: 'MERCHANT_INACTIVE', message: '门店暂不可用' };
    }
    if (event.action === 'resolve') return { success: true, merchantId: merchant._id };
    if (event.action !== 'enter') return { success: false, code: 'INVALID_ACTION', message: '操作无效' };

    const userHash = hash(openid);
    const lastId = `last_${hash(`${token}:${openid}`)}`;
    const attributionId = `source_${userHash}`;
    const result = await db.runTransaction(async transaction => {
      const lastResult = await transaction.collection('scan_last').doc(lastId).get();
      const now = Date.now();
      if (lastResult.data && now - new Date(lastResult.data.scanned_at).getTime() < 5 * 60000) {
        return { merchantId: merchant._id, deduped: true };
      }
      const logId = `scan_${hash(`${token}:${openid}:${now}`)}`;
      await transaction.collection('scan_log').doc(logId).set({ data: {
        token, source_merchant_id: merchant._id, user_hash: userHash,
        scanned_at: new Date(now).toISOString()
      } });
      await transaction.collection('scan_last').doc(lastId).set({ data: { token, user_hash: userHash, scanned_at: new Date(now).toISOString() } });
      await transaction.collection('scan_attribution').doc(attributionId).set({ data: {
        source_merchant_id: merchant._id, token, scanned_at: new Date(now).toISOString()
      } });
      return { merchantId: merchant._id, deduped: false };
    });
    return { success: true, ...result };
  } catch (error) {
    console.error('[scanResolve] failed', { message: error.message });
    return { success: false, code: 'SCAN_FAILED', message: '门店码暂不可用，请稍后重试' };
  }
};
