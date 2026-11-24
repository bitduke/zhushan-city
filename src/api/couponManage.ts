import { USE_MOCK, callCloudFunction } from './adapter';
import { nextMockId, readMockState, writeMockState } from './mockState';
import { useUserStore } from '@/store/user';
import type { CouponTemplate, CouponType, CouponUsageMode } from '@/types/coupon';

export interface CouponDraftInput {
  title: string;
  type: CouponType;
  usage_mode: CouponUsageMode;
  condition_amount: string;
  discount_amount: string;
  total_count: string;
  per_user_limit: string;
  start_time: string;
  end_time: string;
  instructions: string;
}

function requireMock(): void {
  if (!USE_MOCK) throw new Error('模拟数据操作仅在本地模式可用');
}

async function cloudCoupon(action: string, payload: Record<string, unknown> = {}) {
  const result = await callCloudFunction<any>('couponManage', { action, ...payload });
  if (!result.success) throw new Error(result.message || '券管理暂不可用');
  return result;
}

function currentUserId(): string {
  return useUserStore().profile?._id || 'u_guest_demo';
}

function dateMs(value: string): number {
  return new Date(`${value.slice(0, 10)}T00:00:00+08:00`).getTime();
}

export async function getMerchantCouponTemplates(merchantId: string): Promise<CouponTemplate[]> {
  if (!USE_MOCK) return (await cloudCoupon('merchantList', { merchantId })).list || [];
  requireMock();
  const state = readMockState();
  const merchant = state.merchants.find(item => item._id === merchantId && item.owner_id === currentUserId());
  if (!merchant) throw new Error('无权查看该店券模板');
  let changed = false;
  for (const item of state.couponTemplates) {
    if (item.merchant_id === merchantId && item.status === 'ACTIVE' && dateMs(item.end_time) + 86400000 <= Date.now()) {
      item.status = 'ENDED';
      changed = true;
    }
  }
  if (changed) writeMockState(state);
  return state.couponTemplates.filter(item => item.merchant_id === merchantId).map(item => ({
    ...item,
    claimed_count: state.coupons.filter(coupon => coupon.coupon_id === item._id && coupon.status !== 'VOID').length,
    redeemed_count: state.coupons.filter(coupon => coupon.coupon_id === item._id && coupon.status === 'USED').length
  }));
}

export async function getPublicCouponTemplates(merchantId: string): Promise<CouponTemplate[]> {
  if (!USE_MOCK) return (await cloudCoupon('publicByMerchant', { merchantId })).list || [];
  requireMock();
  const state = readMockState();
  if (!state.merchants.some(item => item._id === merchantId && item.status === 'APPROVED')) return [];
  const now = Date.now();
  return state.couponTemplates.filter(item => item.merchant_id === merchantId && item.status === 'ACTIVE'
    && now >= dateMs(item.start_time)
    && now < dateMs(item.end_time) + 86400000
    && state.coupons.filter(coupon => coupon.coupon_id === item._id && coupon.status !== 'VOID').length < item.total_count);
}

export async function createCouponTemplate(merchantId: string, input: CouponDraftInput): Promise<CouponTemplate> {
  if (!USE_MOCK) return (await cloudCoupon('create', { merchantId, data: input })).template;
  requireMock();
  const state = readMockState();
  const merchant = state.merchants.find(item => item._id === merchantId && item.owner_id === currentUserId() && item.status === 'APPROVED');
  if (!merchant) throw new Error('只有已审核店铺的所有者可建券');
  const title = input.title.trim();
  const instructions = input.instructions.trim();
  const conditionAmount = Number(input.condition_amount || 0);
  const discountAmount = Number(input.discount_amount);
  const totalCount = Number(input.total_count);
  const perUserLimit = Number(input.per_user_limit);
  if (title.length < 4 || title.length > 40) throw new Error('券标题须为 4–40 字');
  if (instructions.length < 10) throw new Error('请写明至少 10 字的使用规则');
  if (!['FULL_REDUCTION', 'EXPERIENCE'].includes(input.type)) throw new Error('当前仅支持满减和体验券');
  if (!['INSTANT', 'WALK_IN', 'BOOKING'].includes(input.usage_mode)) throw new Error('券使用方式无效');
  if (!Number.isFinite(conditionAmount) || conditionAmount < 0 || !Number.isFinite(discountAmount) || discountAmount <= 0) throw new Error('优惠金额无效');
  if (input.type === 'FULL_REDUCTION' && conditionAmount <= discountAmount) throw new Error('满减门槛须大于优惠金额');
  if (!Number.isInteger(totalCount) || totalCount < 1 || totalCount > 10000) throw new Error('总数量须为 1–10000');
  if (!Number.isInteger(perUserLimit) || perUserLimit < 1 || perUserLimit > Math.min(5, totalCount)) throw new Error('每人限领须为 1–5 且不超过总量');
  if (input.usage_mode === 'BOOKING' && (!merchant.daily_booking_limit || merchant.daily_booking_limit < 1)) throw new Error('预约券要求门店先设置每日接待上限');
  const start = dateMs(input.start_time);
  const end = dateMs(input.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end + 86400000 <= Date.now()) throw new Error('请选择有效的起止日期');
  const template: CouponTemplate = {
    _id: nextMockId(state, 'cp'), merchant_id: merchantId, merchant_name: merchant.name, merchant_address: merchant.address, merchant_phone: merchant.phone,
    title, type: input.type, usage_mode: input.usage_mode,
    condition_amount: conditionAmount, discount_amount: discountAmount,
    booking_required: input.usage_mode === 'BOOKING',
    total_count: totalCount, claimed_count: 0, redeemed_count: 0, per_user_limit: perUserLimit,
    start_time: input.start_time, end_time: input.end_time, status: 'DRAFT', instructions
  };
  state.couponTemplates.push(template);
  writeMockState(state);
  return template;
}

export async function activateCouponTemplate(id: string, merchantId: string): Promise<void> {
  if (!USE_MOCK) { await cloudCoupon('activate', { id, merchantId }); return; }
  requireMock();
  const state = readMockState();
  const merchant = state.merchants.find(item => item._id === merchantId && item.owner_id === currentUserId() && item.status === 'APPROVED');
  const template = state.couponTemplates.find(item => item._id === id && item.merchant_id === merchantId);
  if (!merchant || !template || !['DRAFT', 'PAUSED'].includes(template.status)) throw new Error('无权上架或券状态已变化');
  if (dateMs(template.end_time) + 86400000 <= Date.now()) throw new Error('券已过有效期');
  template.status = 'ACTIVE';
  writeMockState(state);
}

export async function pauseCouponTemplate(id: string, merchantId: string): Promise<void> {
  if (!USE_MOCK) { await cloudCoupon('pause', { id, merchantId }); return; }
  requireMock();
  const state = readMockState();
  const merchant = state.merchants.find(item => item._id === merchantId && item.owner_id === currentUserId());
  const template = state.couponTemplates.find(item => item._id === id && item.merchant_id === merchantId && item.status === 'ACTIVE');
  if (!merchant || !template) throw new Error('无权暂停或券状态已变化');
  template.status = 'PAUSED';
  writeMockState(state);
}

export async function adminAllCouponTemplates(): Promise<CouponTemplate[]> {
  if (!USE_MOCK) return (await cloudCoupon('adminAll')).list || [];
  requireMock();
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  return readMockState().couponTemplates;
}

export async function adminForcePauseCouponTemplate(id: string, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudCoupon('adminForcePause', { id, reason }); return; }
  requireMock();
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  if (reason.trim().length < 3) throw new Error('请填写停用原因');
  const state = readMockState();
  const template = state.couponTemplates.find(item => item._id === id && item.status === 'ACTIVE');
  if (!template) throw new Error('券不存在或已停止新领取');
  template.status = 'PAUSED';
  state.merchantAuditLogs.unshift({ _id: nextMockId(state, 'merchant_audit'), actor_id: 'demo_admin', action: 'COUPON_FORCE_PAUSE', target_id: id, reason: reason.trim(), created_at: new Date().toISOString() });
  writeMockState(state);
}
