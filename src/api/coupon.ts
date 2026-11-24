import { USE_MOCK, callCloudFunction } from './adapter';
import { nextMockId, readMockState, writeMockState } from './mockState';
import shopDetailMock from '@/mock/shopDetail_A.json';
import type { UserCoupon } from '@/types/coupon';
import { VERIFY_ERROR_CODES, VERIFY_ERROR_MESSAGES } from '@/constants/errCodes';
import { useUserStore } from '@/store/user';
import { reservableCooperation, recordVerifiedCooperationResult } from './cooperation';

function currentUserId(): string {
  return useUserStore().profile?._id || 'u_guest_demo';
}

function startOfDay(value: string): number {
  return new Date(`${value.slice(0, 10)}T00:00:00+08:00`).getTime();
}

function endOfDay(value: string): number {
  return new Date(`${value.slice(0, 10)}T23:59:59+08:00`).getTime();
}

function refreshExpiry(coupons: UserCoupon[]): boolean {
  let changed = false;
  for (const coupon of coupons) {
    if (coupon.status === 'UNUSED' && new Date(coupon.expires_at).getTime() < Date.now()) {
      coupon.status = 'EXPIRED';
      changed = true;
    }
  }
  return changed;
}

export async function claimCoupon(params: { couponId: string; sourceMerchantId?: string }): Promise<UserCoupon> {
  if (!USE_MOCK) {
    const result = await callCloudFunction<{ success: boolean; message?: string; coupon?: UserCoupon }>('couponClaim', { couponId: params.couponId });
    if (!result.success || !result.coupon) throw new Error(result.message || '领券失败');
    return result.coupon;
  }

  const state = readMockState();
  const template = state.couponTemplates.find(item => item._id === params.couponId);
  if (!template) throw new Error('优惠券不存在');
  const sourceMerchantId = params.sourceMerchantId || template.merchant_id;
  if (!state.merchants.some(item => item._id === sourceMerchantId && item.status === 'APPROVED')) throw new Error('来源门店无效');

  const now = Date.now();
  if (template.status && template.status !== 'ACTIVE') throw new Error('优惠券暂不可领取');
  if (now < startOfDay(template.start_time) || now > endOfDay(template.end_time)) {
    throw new Error('优惠券不在领取时间内');
  }

  if (!state.merchants.some(item => item._id === template.merchant_id && item.status === 'APPROVED')) {
    throw new Error('发券商家尚未审核通过或已停用');
  }
  const isCrossStore = template.merchant_id !== sourceMerchantId;
  const cooperation = isCrossStore
    ? reservableCooperation(state, sourceMerchantId, template._id)
    : null;
  if (isCrossStore && !cooperation) throw new Error('合作未生效或预算名额已满');
  const userId = currentUserId();
  const claimed = state.coupons.filter(item => item.user_id === userId && item.coupon_id === params.couponId && item.status !== 'VOID');
  if (claimed.length >= (template.per_user_limit || 1)) throw new Error('已达到该券领取上限');
  if (state.coupons.filter(item => item.coupon_id === params.couponId && item.status !== 'VOID').length >= template.total_count) {
    throw new Error('优惠券已领完');
  }

  const code = `ZS${String(state.nextId).padStart(10, '0')}`;
  const expiresAt = `${template.end_time.slice(0, 10)}T23:59:59+08:00`;
  const coupon: UserCoupon = {
    _id: nextMockId(state, 'uc'),
    code,
    user_id: userId,
    coupon_id: template._id,
    merchant_id: template.merchant_id,
    merchant_name: template.merchant_name,
    merchant_address: template.merchant_address || shopDetailMock.merchant.address,
    merchant_phone: (template as any).merchant_phone || shopDetailMock.merchant.phone,
    source_merchant_id: sourceMerchantId,
    cooperation_contract_id: cooperation?._id,
    status: 'UNUSED',
    claimed_at: new Date(now).toISOString(),
    expires_at: expiresAt,
    rule_snapshot: {
      title: template.title,
      type: template.type,
      condition_amount: template.condition_amount || 0,
      discount_amount: template.discount_amount || 0,
      usage_mode: template.usage_mode,
      booking_required: !!template.booking_required,
      valid_days: Math.max(1, Math.ceil((endOfDay(template.end_time) - now) / 86400000)),
      instructions: template.instructions
    }
  };
  state.coupons.push(coupon);
  writeMockState(state);
  return coupon;
}

export async function getMyCoupons(): Promise<UserCoupon[]> {
  if (!USE_MOCK) {
    const result = await callCloudFunction<{ success: boolean; list?: UserCoupon[]; message?: string }>('getMyCoupons');
    if (!result.success) throw new Error(result.message || '券包加载失败');
    return result.list || [];
  }
  const state = readMockState();
  if (refreshExpiry(state.coupons)) writeMockState(state);
  return state.coupons.filter(item => item.user_id === currentUserId()).map(item => ({
    ...item,
    merchant_suspended: !state.merchants.some(merchant => merchant._id === item.merchant_id && merchant.status === 'APPROVED')
  }));
}

export async function getCouponByCode(code: string): Promise<UserCoupon | null> {
  const coupons = await getMyCoupons();
  return coupons.find(item => item.code === code) || null;
}

export async function verifyCoupon(params: { code: string; operatorMerchantId: string }): Promise<{ success: boolean; code?: number; message?: string; coupon?: UserCoupon }> {
  if (!USE_MOCK) return callCloudFunction('couponVerify', params);

  const fail = (code: number) => ({ success: false, code, message: VERIFY_ERROR_MESSAGES[code] });
  const state = readMockState();
  const coupon = state.coupons.find(item => item.code === params.code.trim());
  if (!coupon) return fail(VERIFY_ERROR_CODES.NOT_FOUND);
  if (coupon.merchant_id !== params.operatorMerchantId) return fail(VERIFY_ERROR_CODES.WRONG_MERCHANT);
  if (!state.merchants.some(item => item._id === coupon.merchant_id && item.status === 'APPROVED')) return fail(VERIFY_ERROR_CODES.SUSPENDED);
  if (coupon.status === 'USED') return fail(VERIFY_ERROR_CODES.ALREADY_USED);
  if (coupon.status === 'VOID') return fail(VERIFY_ERROR_CODES.SUSPENDED);
  if (coupon.status === 'EXPIRED' || new Date(coupon.expires_at).getTime() < Date.now()) return fail(VERIFY_ERROR_CODES.EXPIRED);

  const template = state.couponTemplates.find(item => item._id === coupon.coupon_id);
  if (template && Date.now() < startOfDay(template.start_time)) return fail(VERIFY_ERROR_CODES.NOT_ACTIVE);
  if (coupon.rule_snapshot.booking_required) {
    const appointment = state.appointments.find(item => item.user_coupon_id === coupon._id && item.status === 'ARRIVED');
    if (!appointment) return fail(VERIFY_ERROR_CODES.BOOKING_REQUIRED);
    appointment.status = 'COMPLETED';
    appointment.completed_at = new Date().toISOString();
  }

  coupon.status = 'USED';
  coupon.used_at = new Date().toISOString();
  state.verifyLogs.unshift({ coupon_code: coupon.code, coupon_title: coupon.rule_snapshot.title, merchant_id: params.operatorMerchantId, verified_at: coupon.used_at });
  recordVerifiedCooperationResult(state, coupon);
  writeMockState(state);
  return { success: true, message: '核销成功！优惠已兑现。', coupon: { ...coupon } };
}

export async function getVerifyLogs(merchantId: string) {
  if (!USE_MOCK) {
    const result = await callCloudFunction<{ success: boolean; list?: ReturnType<typeof readMockState>['verifyLogs']; message?: string }>('couponVerifyLogs', { merchantId });
    if (!result.success) throw new Error(result.message || '核销记录加载失败');
    return result.list || [];
  }
  return readMockState().verifyLogs.filter(item => item.merchant_id === merchantId);
}
