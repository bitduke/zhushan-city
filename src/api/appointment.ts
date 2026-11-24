import { USE_MOCK, callCloudFunction } from './adapter';
import { nextMockId, readMockState, writeMockState } from './mockState';
import { useUserStore } from '@/store/user';
import type { Appointment } from '@/types/appointment';

async function cloudAppointment(action: string, payload: Record<string, unknown>) {
  const result = await callCloudFunction<{ success: boolean; message?: string; appointment?: Appointment | null; list?: Appointment[] }>('appointmentManage', { action, ...payload });
  if (!result.success) throw new Error(result.message || '预约服务暂不可用');
  return result;
}

export async function getMyAppointment(userCouponId: string): Promise<Appointment | null> {
  if (!USE_MOCK) return (await cloudAppointment('mine', { userCouponId })).appointment || null;
  const userId = useUserStore().profile?._id || 'u_guest_demo';
  const matches = readMockState().appointments.filter(item => item.user_coupon_id === userCouponId && item.user_id === userId);
  return matches[matches.length - 1] || null;
}

export async function requestAppointment(userCouponId: string, requestedTimeSlot: string, contactName: string, contactPhone: string, contactConsent: boolean): Promise<Appointment> {
  if (!USE_MOCK) return (await cloudAppointment('request', { userCouponId, requestedTimeSlot, contactName, contactPhone, contactConsent })).appointment!;
  if (contactName.trim().length < 2 || contactName.trim().length > 20) throw new Error('请填写 2–20 字称呼');
  if (!/^1[3-9]\d{9}$/.test(contactPhone.trim())) throw new Error('请填写有效的 11 位联系手机');
  if (!contactConsent) throw new Error('请同意将预约联系方式提供给接待商家');
  const state = readMockState();
  const user = useUserStore().profile;
  const coupon = state.coupons.find(item => item._id === userCouponId && item.user_id === (user?._id || 'u_guest_demo'));
  if (!coupon || coupon.status !== 'UNUSED' || !coupon.rule_snapshot.booking_required) throw new Error('当前券不可预约');
  if (!state.merchants.some(item => item._id === coupon.merchant_id && item.status === 'APPROVED')) throw new Error('商家服务暂停，预约暂不可用');
  const dailyLimit = state.merchants.find(item => item._id === coupon.merchant_id)?.daily_booking_limit || 0;
  if (dailyLimit < 1) throw new Error('门店尚未设置每日接待上限');

  const slotTime = new Date(`${requestedTimeSlot.replace(' ', 'T')}:00+08:00`).getTime();
  if (!Number.isFinite(slotTime) || slotTime <= Date.now()) throw new Error('请选择未来的预约时段');
  const existing = state.appointments.find(item => item.user_coupon_id === userCouponId && ['REQUESTED', 'CONFIRMED', 'ARRIVED'].includes(item.status));
  if (existing) throw new Error('已有待处理或已确认的预约');
  const day = requestedTimeSlot.slice(0, 10);
  const booked = state.appointments.filter(item => item.merchant_id === coupon.merchant_id && item.requested_time_slot.slice(0, 10) === day && !['REJECTED', 'CANCELLED'].includes(item.status)).length;
  if (booked >= dailyLimit) throw new Error('该日预约名额已满');

  const appointment: Appointment = {
    _id: nextMockId(state, 'apt'),
    user_id: coupon.user_id,
    user_coupon_id: coupon._id,
    merchant_id: coupon.merchant_id,
    merchant_name: coupon.merchant_name,
    coupon_title: coupon.rule_snapshot.title,
    contact_name: contactName.trim(),
    contact_phone: contactPhone.trim(),
    contact_consent_at: new Date().toISOString(),
    requested_time_slot: requestedTimeSlot,
    status: 'REQUESTED',
    requested_at: new Date().toISOString()
  };
  state.appointments.push(appointment);
  writeMockState(state);
  return appointment;
}

export async function getMerchantAppointments(merchantId: string): Promise<Appointment[]> {
  if (!USE_MOCK) return (await cloudAppointment('merchantList', { merchantId })).list || [];
  return readMockState().appointments.filter(item => item.merchant_id === merchantId).reverse();
}

function updateAppointment(id: string, merchantId: string, expectedStatus: Appointment['status'], update: Partial<Appointment>): Appointment {
  const state = readMockState();
  const appointment = state.appointments.find(item => item._id === id && item.merchant_id === merchantId);
  if (!appointment || appointment.status !== expectedStatus) throw new Error('预约状态已变化，请刷新后重试');
  Object.assign(appointment, update);
  writeMockState(state);
  return appointment;
}

export async function confirmAppointment(id: string, merchantId: string): Promise<Appointment> {
  if (!USE_MOCK) return (await cloudAppointment('confirm', { id, merchantId })).appointment!;
  const state = readMockState();
  const item = state.appointments.find(appointment => appointment._id === id && appointment.merchant_id === merchantId);
  if (!item || item.status !== 'REQUESTED') throw new Error('预约状态已变化，请刷新后重试');
  item.status = 'CONFIRMED';
  item.confirmed_time_slot = item.requested_time_slot;
  item.confirmed_at = new Date().toISOString();
  writeMockState(state);
  return item;
}

export async function rejectAppointment(id: string, merchantId: string, reason: string): Promise<Appointment> {
  if (!USE_MOCK) return (await cloudAppointment('reject', { id, merchantId, reason })).appointment!;
  return updateAppointment(id, merchantId, 'REQUESTED', { status: 'REJECTED', reject_reason: reason });
}

export async function markAppointmentArrived(id: string, merchantId: string): Promise<Appointment> {
  if (!USE_MOCK) return (await cloudAppointment('markArrival', { id, merchantId })).appointment!;
  return updateAppointment(id, merchantId, 'CONFIRMED', { status: 'ARRIVED', arrived_at: new Date().toISOString() });
}

export async function markAppointmentNoShow(id: string, merchantId: string): Promise<Appointment> {
  if (!USE_MOCK) return (await cloudAppointment('markNoShow', { id, merchantId })).appointment!;
  return updateAppointment(id, merchantId, 'CONFIRMED', { status: 'NO_SHOW' });
}

export async function cancelAppointment(userCouponId: string): Promise<Appointment> {
  if (!USE_MOCK) return (await cloudAppointment('cancel', { id: userCouponId })).appointment!;
  const state = readMockState();
  const item = state.appointments.find(appointment => appointment.user_coupon_id === userCouponId && appointment.user_id === (useUserStore().profile?._id || 'u_guest_demo') && ['REQUESTED', 'CONFIRMED'].includes(appointment.status));
  if (!item) throw new Error('当前预约不可取消');
  item.status = 'CANCELLED';
  writeMockState(state);
  return item;
}
