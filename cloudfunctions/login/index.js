const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const id = `user_${hash(openid)}`;
  const agreementVersion = /^\d{4}-\d{2}-\d{2}$/.test(String(event.agreementVersion || '')) ? String(event.agreementVersion) : '';
  try {
    const user = await db.runTransaction(async transaction => {
      const existing = await transaction.collection('user').doc(id).get();
      if (existing.data) {
        if (!agreementVersion || existing.data.service_agreement_version === agreementVersion) return existing.data;
        const patch = { service_agreement_version: agreementVersion, service_agreement_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        await transaction.collection('user').doc(id).update({ data: patch });
        return { ...existing.data, ...patch };
      }
      const created = { _id: id, openid_hash: hash(openid), role: 'RESIDENT', status: 'ACTIVE', service_agreement_version: agreementVersion, service_agreement_at: agreementVersion ? new Date().toISOString() : '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await transaction.collection('user').doc(id).set({ data: created });
      return created;
    });
    return { success: true, user: { _id: user._id, role: user.role, status: user.status } };
  } catch (error) {
    console.error('[login] failed', { message: error.message });
    return { success: false, code: 'LOGIN_FAILED', message: '登录暂不可用' };
  }
};
