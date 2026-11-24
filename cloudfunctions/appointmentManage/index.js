const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
class BusinessError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new BusinessError(code, message); };

async function authorizedStaff(reader, merchantId, openid) {
  const merchant = (await reader.collection('merchant').doc(merchantId).get()).data;
  if (!merchant || merchant.status !== 'APPROVED') fail('MERCHANT_INACTIVE', '门店不可处理预约');
  if (merchant.owner_openid === openid) return merchant;
  const staff = (await reader.collection('merchant_staff').doc(`staff_${hash(`${merchantId}:${openid}`)}`).get()).data;
  if (!staff || staff.status !== 'ACTIVE' || !staff.can_handle_appointment) fail('FORBIDDEN', '无本店预约处理权限');
  return merchant;
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const action = event.action;
  try {
    if ((await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    if (action === 'request') {
      const couponId = String(event.userCouponId || '');
      const contactName = String(event.contactName || '').trim();
      const contactPhone = String(event.contactPhone || '').trim();
      const slot = String(event.requestedTimeSlot || '').trim();
      if (!couponId || contactName.length < 2 || contactName.length > 20 || !/^1[3-9]\d{9}$/.test(contactPhone) || event.contactConsent !== true) fail('INVALID_CONTACT', '请填写并同意提供预约联系方式');
      const slotTime = new Date(`${slot.replace(' ', 'T')}:00+08:00`).getTime();
      if (!Number.isFinite(slotTime) || slotTime <= Date.now()) fail('INVALID_SLOT', '请选择未来预约时段');
      const appointment = await db.runTransaction(async transaction => {
        const coupon = (await transaction.collection('user_coupon').doc(couponId).get()).data;
        if (!coupon || coupon.user_id !== hash(openid) || coupon.status !== 'UNUSED' || !coupon.rule_snapshot?.booking_required) fail('COUPON_UNAVAILABLE', '当前券不可预约');
        if (slotTime > new Date(coupon.expires_at).getTime()) fail('INVALID_SLOT', '预约时段超出券有效期');
        const merchant = (await transaction.collection('merchant').doc(coupon.merchant_id).get()).data;
        if (!merchant || merchant.status !== 'APPROVED') fail('MERCHANT_INACTIVE', '门店暂不可预约');
        const dailyLimit = Number(merchant.daily_booking_limit);
        if (!Number.isInteger(dailyLimit) || dailyLimit < 1) fail('CAPACITY_NOT_CONFIGURED', '门店未配置每日接待上限');
        const existing = (await transaction.collection('appointment').doc(couponId).get()).data;
        if (existing && ['REQUESTED', 'CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(existing.status)) fail('APPOINTMENT_EXISTS', '已有预约记录');
        const slotDate = slot.slice(0, 10);
        const capacityId = `capacity_${hash(`${coupon.merchant_id}:${slotDate}`)}`;
        const capacity = (await transaction.collection('appointment_capacity').doc(capacityId).get()).data;
        const booked = Number(capacity?.booked || 0);
        if (booked >= dailyLimit) fail('CAPACITY_FULL', '该日预约名额已满');
        await transaction.collection('appointment_capacity').doc(capacityId).set({ data: { merchant_id: coupon.merchant_id, date: slotDate, booked: booked + 1, daily_limit: dailyLimit } });
        const now = new Date().toISOString();
        const record = {
          _id: couponId, user_coupon_id: couponId, user_id: hash(openid),
          merchant_id: coupon.merchant_id, merchant_name: coupon.merchant_name,
          coupon_title: coupon.rule_snapshot.title, contact_name: contactName,
          contact_phone: contactPhone, contact_consent_at: now,
          requested_time_slot: slot, status: 'REQUESTED', requested_at: now
        };
        await transaction.collection('appointment').doc(couponId).set({ data: record });
        return record;
      });
      return { success: true, appointment, notificationSent: false };
    }

    if (action === 'mine') {
      const couponId = String(event.userCouponId || '');
      const coupon = (await db.collection('user_coupon').doc(couponId).get()).data;
      if (!coupon || coupon.user_id !== hash(openid)) fail('FORBIDDEN', '无权查看该预约');
      const appointment = (await db.collection('appointment').doc(couponId).get()).data;
      return { success: true, appointment: appointment || null };
    }

    if (action === 'merchantList') {
      const merchantId = String(event.merchantId || '');
      await authorizedStaff(db, merchantId, openid);
      const page = Math.max(1, Math.floor(Number(event.page) || 1));
      const pageSize = Math.max(1, Math.min(30, Math.floor(Number(event.pageSize) || 20)));
      const response = await db.collection('appointment').where({ merchant_id: merchantId }).orderBy('requested_at', 'desc').skip((page - 1) * pageSize).limit(pageSize).get();
      return { success: true, list: response.data || [], page, pageSize };
    }

    const id = String(event.id || '');
    if (!id) fail('INVALID_ID', '预约参数无效');
    const result = await db.runTransaction(async transaction => {
      const item = (await transaction.collection('appointment').doc(id).get()).data;
      if (!item) fail('NOT_FOUND', '预约不存在');
      const now = new Date().toISOString();
      const patch = {};
      if (action === 'cancel') {
        if (item.user_id !== hash(openid)) fail('FORBIDDEN', '只能取消自己的预约');
        if (!['REQUESTED', 'CONFIRMED'].includes(item.status)) fail('INVALID_STATUS', '当前状态不可取消');
        patch.status = 'CANCELLED'; patch.cancelled_at = now;
      } else {
        await authorizedStaff(transaction, item.merchant_id, openid);
        if (action === 'confirm') {
          if (item.status !== 'REQUESTED') fail('INVALID_STATUS', '预约状态已变化');
          patch.status = 'CONFIRMED'; patch.confirmed_time_slot = item.requested_time_slot; patch.confirmed_at = now;
        } else if (action === 'reject') {
          if (item.status !== 'REQUESTED') fail('INVALID_STATUS', '预约状态已变化');
          const reason = String(event.reason || '').trim();
          if (reason.length < 3) fail('INVALID_REASON', '请填写拒绝原因');
          patch.status = 'REJECTED'; patch.reject_reason = reason; patch.rejected_at = now;
        } else if (action === 'markArrival') {
          if (item.status !== 'CONFIRMED') fail('INVALID_STATUS', '请先确认预约');
          patch.status = 'ARRIVED'; patch.arrived_at = now;
        } else if (action === 'markNoShow') {
          if (item.status !== 'CONFIRMED') fail('INVALID_STATUS', '预约状态已变化');
          patch.status = 'NO_SHOW'; patch.no_show_at = now;
        } else fail('INVALID_ACTION', '操作无效');
      }
      if (['REJECTED', 'CANCELLED'].includes(patch.status)) {
        const date = item.requested_time_slot.slice(0, 10);
        const capacityId = `capacity_${hash(`${item.merchant_id}:${date}`)}`;
        const capacity = (await transaction.collection('appointment_capacity').doc(capacityId).get()).data;
        if (capacity) await transaction.collection('appointment_capacity').doc(capacityId).update({ data: { booked: Math.max(0, Number(capacity.booked || 0) - 1) } });
      }
      await transaction.collection('appointment').doc(id).update({ data: patch });
      return { ...item, ...patch };
    });
    return { success: true, appointment: result, notificationSent: false };
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[appointmentManage] failed', { message: error.message });
    return { success: false, code: 'APPOINTMENT_FAILED', message: '预约服务暂不可用' };
  }
};
