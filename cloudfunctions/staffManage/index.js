const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const uuid = () => crypto.randomUUID().replace(/-/g, '');
class BusinessError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new BusinessError(code, message); };

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const action = event.action;
  const merchantId = String(event.merchantId || '');
  try {
    if ((await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    if (action === 'myStaff') {
      const response = await db.collection('merchant_staff').where({ user_id: hash(openid), status: 'ACTIVE' }).limit(100).get();
      return { success: true, list: (response.data || []).filter(item => item.role !== 'OWNER') };
    }
    if (action === 'acceptInvite') {
      const token = String(event.token || '').trim();
      if (!/^si_[a-f0-9]{24}$/.test(token)) fail('INVALID_INVITE', '邀请口令无效');
      const staff = await db.runTransaction(async transaction => {
        const invite = (await transaction.collection('staff_invite').doc(token).get()).data;
        if (!invite || invite.status !== 'ACTIVE' || new Date(invite.expires_at).getTime() <= Date.now()) fail('INVITE_EXPIRED', '邀请已失效');
        const merchant = (await transaction.collection('merchant').doc(invite.merchant_id).get()).data;
        if (!merchant || merchant.status !== 'APPROVED') fail('MERCHANT_INACTIVE', '门店不可邀请员工');
        if (merchant.owner_openid === openid) fail('OWNER_ALREADY_BOUND', '店主无需接受员工邀请');
        const staffId = `staff_${hash(`${invite.merchant_id}:${openid}`)}`;
        const existing = (await transaction.collection('merchant_staff').doc(staffId).get()).data;
        if (existing && existing.status === 'ACTIVE') fail('ALREADY_BOUND', '你已是该店员工');
        const record = { _id: staffId, merchant_id: invite.merchant_id, user_id: hash(openid), role: 'STAFF', status: 'ACTIVE', can_verify: !!invite.can_verify, can_handle_appointment: !!invite.can_handle_appointment, accepted_at: new Date().toISOString() };
        await transaction.collection('merchant_staff').doc(staffId).set({ data: record });
        await transaction.collection('staff_invite').doc(token).update({ data: { status: 'USED', accepted_by: hash(openid), accepted_at: new Date().toISOString() } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'MERCHANT', target_id: invite.merchant_id, actor_id: hash(openid), action: 'STAFF_ACCEPT', reason: '员工接受邀请', created_at: new Date().toISOString() } });
        return record;
      });
      return { success: true, staff };
    }
    const merchant = (await db.collection('merchant').doc(merchantId).get()).data;
    if (!merchant || merchant.owner_openid !== openid) fail('FORBIDDEN', '只有店主可管理员工');
    if (action === 'list') {
      const response = await db.collection('merchant_staff').where({ merchant_id: merchantId }).limit(100).get();
      return { success: true, list: response.data || [] };
    }
    if (action === 'createInvite') {
      if (merchant.status !== 'APPROVED') fail('MERCHANT_INACTIVE', '门店尚未审核通过');
      const canVerify = event.canVerify === true;
      const canAppointment = event.canAppointment === true;
      if (!canVerify && !canAppointment) fail('INVALID_SCOPE', '至少选择一项员工权限');
      const token = `si_${crypto.randomBytes(12).toString('hex')}`;
      const invite = { _id: token, merchant_id: merchantId, status: 'ACTIVE', can_verify: canVerify, can_handle_appointment: canAppointment, created_by: hash(openid), created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 3600000).toISOString() };
      await db.collection('staff_invite').doc(token).set({ data: invite });
      return { success: true, invite: { token, expires_at: invite.expires_at, can_verify: canVerify, can_handle_appointment: canAppointment } };
    }
    if (action === 'disable') {
      const staffId = String(event.staffId || '');
      await db.runTransaction(async transaction => {
        const currentMerchant = (await transaction.collection('merchant').doc(merchantId).get()).data;
        if (!currentMerchant || currentMerchant.owner_openid !== openid) fail('FORBIDDEN', '只有店主可停用员工');
        const staff = (await transaction.collection('merchant_staff').doc(staffId).get()).data;
        if (!staff || staff.merchant_id !== merchantId || staff.role === 'OWNER' || staff.status !== 'ACTIVE') fail('INVALID_STAFF', '员工不可停用');
        await transaction.collection('merchant_staff').doc(staffId).update({ data: { status: 'DISABLED', disabled_at: new Date().toISOString() } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'MERCHANT', target_id: merchantId, actor_id: hash(openid), action: 'STAFF_DISABLE', reason: staffId, created_at: new Date().toISOString() } });
      });
      return { success: true };
    }
    fail('INVALID_ACTION', '操作无效');
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[staffManage] failed', { message: error.message });
    return { success: false, code: 'STAFF_FAILED', message: '员工管理暂不可用' };
  }
};
