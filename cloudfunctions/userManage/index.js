const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const uuid = () => crypto.randomUUID().replace(/-/g, '');
const publicUser = user => ({ _id: user._id, role: user.role, status: user.status, created_at: user.created_at, updated_at: user.updated_at, status_reason: user.status_reason || '' });

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const actorId = `user_${hash(openid)}`;
  try {
    if (event.action === 'list' || event.action === 'audit') {
      const actor = (await db.collection('user').doc(actorId).get()).data;
      if (!actor || actor.status !== 'ACTIVE' || actor.role !== 'ADMIN') return { success: false, code: 'FORBIDDEN', message: '无管理员权限' };
      if (event.action === 'audit') {
        const response = await db.collection('audit_log').where({}).orderBy('created_at', 'desc').limit(100).get();
        return { success: true, list: response.data || [] };
      }
      const page = Math.max(1, Math.floor(Number(event.page) || 1));
      const pageSize = Math.max(1, Math.min(30, Math.floor(Number(event.pageSize) || 20)));
      const collection = db.collection('user');
      const [count, response] = await Promise.all([collection.count(), collection.where({}).orderBy('created_at', 'desc').skip((page - 1) * pageSize).limit(pageSize).get()]);
      return { success: true, list: (response.data || []).map(publicUser), page, pageSize, total: count.total, hasMore: page * pageSize < count.total };
    }
    if (event.action === 'setStatus') {
      const targetId = String(event.userId || '');
      const status = String(event.status || '');
      const reason = String(event.reason || '').trim();
      if (!/^user_[a-f0-9]{32}$/.test(targetId) || !['ACTIVE', 'SUSPENDED'].includes(status) || reason.length < 4 || reason.length > 200) return { success: false, code: 'INVALID_INPUT', message: '请选择用户、状态并填写处理依据' };
      const result = await db.runTransaction(async transaction => {
        const actor = (await transaction.collection('user').doc(actorId).get()).data;
        if (!actor || actor.status !== 'ACTIVE' || actor.role !== 'ADMIN') return { success: false, code: 'FORBIDDEN', message: '无管理员权限' };
        if (targetId === actorId) return { success: false, code: 'SELF_ACTION', message: '不可停用自己的管理员账号' };
        const target = (await transaction.collection('user').doc(targetId).get()).data;
        if (!target) return { success: false, code: 'NOT_FOUND', message: '用户不存在' };
        if (target.role === 'ADMIN') return { success: false, code: 'ADMIN_PROTECTED', message: '管理员身份变更需由环境所有者核验' };
        if (target.status === status) return { success: true, user: publicUser(target), unchanged: true };
        const now = new Date().toISOString();
        await transaction.collection('user').doc(targetId).update({ data: { status, status_reason: reason, updated_at: now } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'USER', target_id: targetId, actor_id: actorId, action: status === 'SUSPENDED' ? 'USER_SUSPEND' : 'USER_RESTORE', reason, before: { status: target.status }, after: { status }, created_at: now } });
        return { success: true, user: publicUser({ ...target, status, status_reason: reason, updated_at: now }) };
      });
      return result;
    }
    return { success: false, code: 'INVALID_ACTION', message: '操作无效' };
  } catch (error) {
    console.error('[userManage] failed', { message: error.message });
    return { success: false, code: 'USER_MANAGE_FAILED', message: '用户管理暂不可用' };
  }
};
