import { USE_MOCK, callCloudFunction } from './adapter';
import { nextMockId, readMockState, writeMockState, type MockCoreState } from './mockState';
import type { UserCoupon } from '@/types/coupon';
import type { CooperationBill, CooperationOffer, CooperationPayment, CooperationResult, PlacementConfig } from '@/types/cooperation';
import { useUserStore } from '@/store/user';

export interface PublishCooperationInput {
  promoterMerchantId: string;
  targetCouponId: string;
  pricingModel: 'PER_RESULT' | 'BY_SLOT';
  unitPriceYuan: string;
  slotPriceYuan: string;
  platformFeeYuan: string;
  budgetYuan: string;
  startDate: string;
  endDate: string;
  newCustomerRule: string;
  newCustomerWindowDays: string;
}

function requireMock(): void {
  if (!USE_MOCK) throw new Error('模拟数据操作仅在本地模式可用');
}

async function cloudCooperation(action: string, payload: Record<string, unknown> = {}) {
  const result = await callCloudFunction<any>('cooperationManage', { action, ...payload });
  if (!result.success) throw new Error(result.message || '合作服务暂不可用');
  return result;
}

function yuanToCents(value: string, field: string, allowZero = false): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error(`${field}须填写非负金额，最多两位小数`);
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || (allowZero ? cents < 0 : cents <= 0)) throw new Error(`${field}金额无效`);
  return cents;
}

function dateMs(value: string): number {
  return new Date(`${value}T00:00:00+08:00`).getTime();
}

function activeOnDate(offer: CooperationOffer, now = Date.now()): boolean {
  return offer.status === 'ACTIVE' && now >= dateMs(offer.start_date) && now < dateMs(offer.end_date) + 86400000;
}

export function getDemoTargetCoupons(buyerMerchantId: string) {
  return readMockState().couponTemplates.filter(item => item.merchant_id === buyerMerchantId && item.status === 'ACTIVE');
}

export function getDemoCouponTitle(id: string): string {
  return readMockState().couponTemplates.find(item => item._id === id)?.title || id;
}

export async function publishCooperation(buyerMerchantId: string, input: PublishCooperationInput): Promise<CooperationOffer> {
  if (!USE_MOCK) return (await cloudCooperation('publish', { buyerMerchantId, data: input })).offer;
  requireMock();
  const state = readMockState();
  const template = state.couponTemplates.find(item => item._id === input.targetCouponId && item.merchant_id === buyerMerchantId && item.status === 'ACTIVE');
  if (!template) throw new Error('只能用本店有效券发布合作');
  if (buyerMerchantId === input.promoterMerchantId || !state.merchants.some(item => item._id === input.promoterMerchantId && item.status === 'APPROVED')) throw new Error('请选择其他已审核门店作为入口店');
  const perResult = input.pricingModel === 'PER_RESULT';
  if (!perResult && input.pricingModel !== 'BY_SLOT') throw new Error('请选择计费方式');
  const unitPrice = perResult ? yuanToCents(input.unitPriceYuan, '每个有效结果报价') : 0;
  const slotPrice = perResult ? 0 : yuanToCents(input.slotPriceYuan, '周期展位总价');
  const platformFee = yuanToCents(input.platformFeeYuan, '平台费用', true);
  const budget = perResult ? yuanToCents(input.budgetYuan, '总预算') : slotPrice;
  if (platformFee > (perResult ? unitPrice : slotPrice)) throw new Error('平台费用不能高于合作报价');
  if (perResult && budget < unitPrice) throw new Error('预算至少覆盖一个有效结果');
  const windowDays = Number(input.newCustomerWindowDays);
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) throw new Error('新客排重期须为 1–365 天');
  if (input.newCustomerRule.trim().length < 8) throw new Error('请写明有效新客的核对条件');
  const start = dateMs(input.startDate);
  const end = dateMs(input.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end + 86400000 <= Date.now()) {
    throw new Error('合作周期须包含未来的有效日期');
  }
  if (start < dateMs(template.start_time.slice(0, 10)) || end > dateMs(template.end_time.slice(0, 10))) {
    throw new Error('合作周期不能超出优惠券有效期');
  }

  if (state.cooperations.some(item => item.buyer_merchant_id === buyerMerchantId && item.promoter_merchant_id === input.promoterMerchantId && item.target_coupon_id === input.targetCouponId && ['OFFERED', 'PENDING_ADMIN', 'ACTIVE'].includes(item.status))) {
    throw new Error('该券已有待接受或进行中的合作');
  }
  const offer: CooperationOffer = {
    _id: nextMockId(state, 'coop'),
    buyer_merchant_id: buyerMerchantId,
    buyer_merchant_name: state.merchants.find(item => item._id === buyerMerchantId)?.name || buyerMerchantId,
    promoter_merchant_id: input.promoterMerchantId,
    promoter_merchant_name: state.merchants.find(item => item._id === input.promoterMerchantId)?.name || input.promoterMerchantId,
    target_coupon_id: input.targetCouponId,
    target_coupon_title: template.title,
    pricing_model: input.pricingModel,
    unit_price_cents: unitPrice,
    slot_price_cents: slotPrice,
    platform_fee_cents: platformFee,
    budget_cents: budget,
    start_date: input.startDate,
    end_date: input.endDate,
    new_customer_rule: input.newCustomerRule.trim(),
    new_customer_window_days: windowDays,
    version: 1,
    status: 'OFFERED',
    published_at: new Date().toISOString()
  };
  state.cooperations.push(offer);
  writeMockState(state);
  return offer;
}

export async function listCooperations(merchantId: string): Promise<CooperationOffer[]> {
  if (!USE_MOCK) return (await cloudCooperation('list', { merchantId })).list || [];
  requireMock();
  const state = readMockState();
  let changed = false;
  for (const item of state.cooperations) {
    if (['OFFERED', 'ACTIVE'].includes(item.status) && dateMs(item.end_date) + 86400000 <= Date.now()) {
      item.status = 'ENDED';
      changed = true;
    }
  }
  if (changed) writeMockState(state);
  return state.cooperations.filter(item => item.buyer_merchant_id === merchantId || item.promoter_merchant_id === merchantId).reverse();
}

export async function acceptCooperation(id: string, promoterMerchantId: string): Promise<CooperationOffer> {
  if (!USE_MOCK) return (await cloudCooperation('accept', { id })).offer;
  requireMock();
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === id && item.promoter_merchant_id === promoterMerchantId);
  if (!offer || offer.status !== 'OFFERED') throw new Error('合作已变化或无权接受');
  if (dateMs(offer.end_date) + 86400000 <= Date.now()) throw new Error('合作周期已过期');
  offer.status = 'PENDING_ADMIN';
  offer.accepted_at = new Date().toISOString();
  writeMockState(state);
  return offer;
}

export async function adminPendingCooperations(): Promise<CooperationOffer[]> {
  if (!USE_MOCK) return (await cloudCooperation('adminPending')).list || [];
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  return readMockState().cooperations.filter(item => item.status === 'PENDING_ADMIN');
}

export async function adminReviewCooperation(id: string, approve: boolean, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudCooperation('adminReview', { id, approve, reason }); return; }
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  if (!approve && reason.trim().length < 3) throw new Error('拒绝时须填写原因');
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === id && item.status === 'PENDING_ADMIN');
  if (!offer) throw new Error('合作已变化或不在待审队列');
  if (approve && (!state.couponTemplates.some(item => item._id === offer.target_coupon_id && item.status === 'ACTIVE') || !state.merchants.some(item => item._id === offer.buyer_merchant_id && item.status === 'APPROVED') || !state.merchants.some(item => item._id === offer.promoter_merchant_id && item.status === 'APPROVED') || dateMs(offer.end_date) + 86400000 <= Date.now())) throw new Error('合作对象或优惠券不可用');
  offer.status = approve ? 'ACTIVE' : 'REJECTED';
  if (approve) { offer.placement_sort = 1; offer.placement_active = true; }
  offer.admin_review_reason = reason.trim();
  offer.admin_reviewed_at = new Date().toISOString();
  state.merchantAuditLogs.unshift({ _id: nextMockId(state, 'merchant_audit'), actor_id: 'demo_admin', action: approve ? 'COOP_APPROVE' : 'COOP_REJECT', target_id: id, reason: reason.trim() || '审核通过', created_at: offer.admin_reviewed_at });
  writeMockState(state);
}

export async function adminPlacements(): Promise<PlacementConfig[]> {
  if (!USE_MOCK) return (await cloudCooperation('adminPlacements')).list || [];
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  const state = readMockState();
  return state.cooperations.filter(item => item.status === 'ACTIVE').map(item => ({
    _id: item._id, cooperation_id: item._id, source_merchant_id: item.promoter_merchant_id,
    source_merchant_name: item.promoter_merchant_name || item.promoter_merchant_id,
    target_coupon_id: item.target_coupon_id, target_coupon_title: item.target_coupon_title || item.target_coupon_id,
    sort: item.placement_sort || 1, status: item.placement_active === false ? 'PAUSED' : 'ACTIVE'
  }));
}

export async function adminSetPlacement(id: string, sort: number, active: boolean, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudCooperation('adminSetPlacement', { id, sort, active, reason }); return; }
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  if (!Number.isInteger(sort) || sort < 1 || sort > 5 || reason.trim().length < 3) throw new Error('请选择 1–5 的展示顺序并填写调整依据');
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === id && item.status === 'ACTIVE');
  if (!offer) throw new Error('合作已不可展示');
  if (active && (!state.couponTemplates.some(item => item._id === offer.target_coupon_id && item.status === 'ACTIVE') || !state.merchants.some(item => item._id === offer.promoter_merchant_id && item.status === 'APPROVED') || !state.merchants.some(item => item._id === offer.buyer_merchant_id && item.status === 'APPROVED'))) throw new Error('优惠券或门店不可展示');
  offer.placement_sort = sort;
  offer.placement_active = active;
  state.merchantAuditLogs.unshift({ _id: nextMockId(state, 'merchant_audit'), actor_id: 'demo_admin', action: 'PLACEMENT_SET', target_id: id, reason: reason.trim(), created_at: new Date().toISOString() });
  writeMockState(state);
}

export async function adminActionableResults(): Promise<CooperationResult[]> {
  if (!USE_MOCK) return (await cloudCooperation('adminResults')).list || [];
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  return readMockState().cooperationResults.filter(item => ['DISPUTED', 'CONFIRMED'].includes(item.status));
}

export async function adminResolveResult(id: string, valid: boolean, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudCooperation('adminResolveResult', { id, valid, reason }); return; }
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  if (reason.trim().length < 3) throw new Error('请填写退款、争议或核对依据');
  const state = readMockState();
  const result = state.cooperationResults.find(item => item._id === id);
  if (!result || !['DISPUTED', 'CONFIRMED'].includes(result.status)) throw new Error('结果不可处理');
  if (result.status === 'CONFIRMED' && valid) throw new Error('结果已经确认');
  if (result.status === 'CONFIRMED') result.status = 'INVALIDATED';
  else if (valid) {
    const offer = state.cooperations.find(item => item._id === result.cooperation_id)!;
    const cutoff = new Date(result.verified_at).getTime() - offer.new_customer_window_days * 86400000;
    const duplicate = state.cooperationResults.some(item => item._id !== result._id && item.user_id === result.user_id && item.buyer_merchant_id === result.buyer_merchant_id && item.status === 'CONFIRMED' && new Date(item.verified_at).getTime() >= cutoff);
    result.status = duplicate ? 'INELIGIBLE' : 'CONFIRMED';
  } else result.status = 'INELIGIBLE';
  if (result.status === 'CONFIRMED') result.confirmed_at = new Date().toISOString();
  result.admin_resolution_reason = reason.trim();
  result.admin_resolved_at = new Date().toISOString();
  state.merchantAuditLogs.unshift({ _id: nextMockId(state, 'merchant_audit'), actor_id: 'demo_admin', action: result.status === 'INVALIDATED' ? 'COOP_RESULT_INVALIDATE' : 'COOP_DISPUTE_RESOLVE', target_id: id, reason: reason.trim(), created_at: result.admin_resolved_at });
  writeMockState(state);
}

export async function pauseCooperation(id: string, actorMerchantId: string): Promise<void> {
  if (!USE_MOCK) { await cloudCooperation('pause', { id }); return; }
  requireMock();
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === id && [item.buyer_merchant_id, item.promoter_merchant_id].includes(actorMerchantId));
  if (!offer || offer.status !== 'ACTIVE') throw new Error('合作已变化或无权暂停');
  offer.status = 'PAUSED';
  offer.paused_at = new Date().toISOString();
  writeMockState(state);
}

export function activePlacementCouponIds(sourceMerchantId: string): string[] {
  requireMock();
  const state = readMockState();
  return state.cooperations.filter(item => item.promoter_merchant_id === sourceMerchantId && activeOnDate(item))
    .filter(item => item.placement_active !== false)
    .filter(item => state.couponTemplates.some(coupon => coupon._id === item.target_coupon_id && coupon.status === 'ACTIVE') && state.merchants.some(merchant => merchant._id === item.buyer_merchant_id && merchant.status === 'APPROVED'))
    .filter(item => item.pricing_model === 'BY_SLOT' || state.coupons.filter(coupon => coupon.cooperation_contract_id === item._id && coupon.status !== 'VOID').length < Math.floor(item.budget_cents / item.unit_price_cents))
    .sort((a, b) => (a.placement_sort || 1) - (b.placement_sort || 1) || a._id.localeCompare(b._id))
    .map(item => item.target_coupon_id).slice(0, 5);
}

export function reservableCooperation(state: MockCoreState, sourceMerchantId: string, couponId: string): CooperationOffer | null {
  const offer = state.cooperations.find(item => item.promoter_merchant_id === sourceMerchantId && item.target_coupon_id === couponId && activeOnDate(item));
  if (!offer) return null;
  if (offer.placement_active === false) return null;
  if (!state.couponTemplates.some(item => item._id === couponId && item.status === 'ACTIVE')) return null;
  if (!state.merchants.some(item => item._id === offer.buyer_merchant_id && item.status === 'APPROVED')) return null;
  if (offer.pricing_model === 'BY_SLOT') return offer;
  const reserved = state.coupons.filter(item => item.cooperation_contract_id === offer._id && item.status !== 'VOID').length;
  return reserved < Math.floor(offer.budget_cents / offer.unit_price_cents) ? offer : null;
}

export function recordVerifiedCooperationResult(state: MockCoreState, coupon: UserCoupon): void {
  if (!coupon.cooperation_contract_id || state.cooperationResults.some(item => item.user_coupon_id === coupon._id)) return;
  const offer = state.cooperations.find(item => item._id === coupon.cooperation_contract_id);
  if (!offer) return;
  state.cooperationResults.push({
    _id: nextMockId(state, 'result'),
    cooperation_id: offer._id,
    user_coupon_id: coupon._id,
    user_id: coupon.user_id,
    buyer_merchant_id: offer.buyer_merchant_id,
    promoter_merchant_id: offer.promoter_merchant_id,
    coupon_code: coupon.code,
    status: 'PENDING_BUYER',
    verified_at: coupon.used_at || new Date().toISOString()
  });
}

export async function listCooperationResults(cooperationId: string, actorMerchantId: string): Promise<CooperationResult[]> {
  if (!USE_MOCK) return (await cloudCooperation('results', { id: cooperationId })).list || [];
  requireMock();
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === cooperationId);
  if (!offer || ![offer.buyer_merchant_id, offer.promoter_merchant_id].includes(actorMerchantId)) throw new Error('无权查看合作结果');
  return state.cooperationResults.filter(item => item.cooperation_id === cooperationId).reverse();
}

export async function buyerReviewResult(resultId: string, buyerMerchantId: string, validNewCustomer: boolean, note: string): Promise<CooperationResult> {
  if (!USE_MOCK) return (await cloudCooperation('buyerReview', { id: resultId, validNewCustomer, note })).result;
  requireMock();
  if (note.trim().length < 3) throw new Error('请填写核对依据或无效原因');
  const state = readMockState();
  const result = state.cooperationResults.find(item => item._id === resultId && item.buyer_merchant_id === buyerMerchantId);
  if (!result || result.status !== 'PENDING_BUYER') throw new Error('结果已变化或无权核对');
  const offer = state.cooperations.find(item => item._id === result.cooperation_id)!;
  const cutoff = new Date(result.verified_at).getTime() - offer.new_customer_window_days * 86400000;
  const duplicate = state.cooperationResults.some(item => item._id !== result._id && item.user_id === result.user_id && item.buyer_merchant_id === buyerMerchantId && ['PENDING_PROMOTER', 'CONFIRMED'].includes(item.status) && new Date(item.verified_at).getTime() >= cutoff);
  result.status = validNewCustomer && !duplicate ? 'PENDING_PROMOTER' : 'INELIGIBLE';
  result.buyer_note = duplicate ? `${note.trim()}（新客排重期内已有记录）` : note.trim();
  result.buyer_reviewed_at = new Date().toISOString();
  writeMockState(state);
  return result;
}

export async function promoterReviewResult(resultId: string, promoterMerchantId: string, accept: boolean, note: string): Promise<CooperationResult> {
  if (!USE_MOCK) return (await cloudCooperation('promoterReview', { id: resultId, accept, note })).result;
  requireMock();
  if (!accept && note.trim().length < 3) throw new Error('请填写争议原因');
  const state = readMockState();
  const result = state.cooperationResults.find(item => item._id === resultId && item.promoter_merchant_id === promoterMerchantId);
  if (!result || result.status !== 'PENDING_PROMOTER') throw new Error('结果已变化或无权核对');
  result.status = accept ? 'CONFIRMED' : 'DISPUTED';
  result.promoter_note = note.trim();
  result.promoter_reviewed_at = new Date().toISOString();
  if (result.status === 'CONFIRMED') result.confirmed_at = result.promoter_reviewed_at;
  writeMockState(state);
  return result;
}

export async function confirmSlotDelivery(cooperationId: string, buyerMerchantId: string, note: string): Promise<CooperationOffer> {
  if (!USE_MOCK) return (await cloudCooperation('confirmSlotDelivery', { id: cooperationId, note })).offer;
  requireMock();
  if (note.trim().length < 5) throw new Error('请填写展位履约核对依据');
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === cooperationId && item.buyer_merchant_id === buyerMerchantId);
  if (!offer || offer.pricing_model !== 'BY_SLOT' || !offer.accepted_at) throw new Error('无权确认展位履约');
  if (offer.slot_delivery_confirmed_at) return offer;
  if (offer.status === 'PAUSED') throw new Error('合作中途暂停，须先处理履约争议');
  if (Date.now() < dateMs(offer.end_date) + 86400000) throw new Error('展示期尚未结束，不能产生应付账单');
  offer.status = 'ENDED';
  offer.slot_delivery_confirmed_at = new Date().toISOString();
  offer.slot_delivery_note = note.trim();
  writeMockState(state);
  return offer;
}

export async function getCooperationBill(cooperationId: string, actorMerchantId: string): Promise<CooperationBill> {
  if (!USE_MOCK) return (await cloudCooperation('bill', { id: cooperationId })).bill;
  requireMock();
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === cooperationId);
  if (!offer || ![offer.buyer_merchant_id, offer.promoter_merchant_id].includes(actorMerchantId)) throw new Error('无权查看账单');
  const confirmedResults = state.cooperationResults.filter(item => item.cooperation_id === cooperationId && item.status === 'CONFIRMED').length;
  const slotPayable = offer.pricing_model === 'BY_SLOT' && offer.slot_delivery_confirmed_at ? (offer.slot_price_cents || 0) : 0;
  const payable = offer.pricing_model === 'PER_RESULT' ? confirmedResults * offer.unit_price_cents : slotPayable;
  const platformFee = offer.pricing_model === 'PER_RESULT' ? confirmedResults * offer.platform_fee_cents : slotPayable ? offer.platform_fee_cents : 0;
  const promoterDue = payable - platformFee;
  const confirmedPaid = state.cooperationPayments.filter(item => item.cooperation_id === cooperationId && item.status === 'CONFIRMED').reduce((sum, item) => sum + item.amount_cents, 0);
  const pendingReceipt = state.cooperationPayments.filter(item => item.cooperation_id === cooperationId && item.status === 'PENDING_RECEIPT').reduce((sum, item) => sum + item.amount_cents, 0);
  return {
    cooperation_id: cooperationId,
    confirmed_results: confirmedResults,
    payable_cents: payable,
    platform_fee_cents: platformFee,
    promoter_due_cents: promoterDue,
    confirmed_paid_cents: confirmedPaid,
    pending_receipt_cents: pendingReceipt,
    remaining_cents: Math.max(0, promoterDue - confirmedPaid - pendingReceipt),
    overpaid_cents: Math.max(0, confirmedPaid + pendingReceipt - promoterDue)
  };
}

export async function listCooperationPayments(cooperationId: string, actorMerchantId: string): Promise<CooperationPayment[]> {
  if (!USE_MOCK) return (await cloudCooperation('payments', { id: cooperationId })).list || [];
  requireMock();
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === cooperationId);
  if (!offer || ![offer.buyer_merchant_id, offer.promoter_merchant_id].includes(actorMerchantId)) throw new Error('无权查看付款记录');
  return state.cooperationPayments.filter(item => item.cooperation_id === cooperationId).reverse();
}

export async function submitOfflinePayment(cooperationId: string, buyerMerchantId: string, reference: string): Promise<CooperationPayment> {
  if (!USE_MOCK) return (await cloudCooperation('submitPayment', { id: cooperationId, reference })).payment;
  requireMock();
  if (reference.trim().length < 4) throw new Error('请填写可核对的线下付款凭据');
  const state = readMockState();
  const offer = state.cooperations.find(item => item._id === cooperationId && item.buyer_merchant_id === buyerMerchantId);
  if (!offer) throw new Error('无权登记付款');
  if (state.cooperationPayments.some(item => item.cooperation_id === cooperationId && item.payment_reference === reference.trim())) {
    throw new Error('该付款凭据已登记，请勿重复提交');
  }
  const bill = await getCooperationBill(cooperationId, buyerMerchantId);
  if (bill.remaining_cents <= 0) throw new Error('当前没有待付金额');
  const payment: CooperationPayment = {
    _id: nextMockId(state, 'payment'),
    cooperation_id: cooperationId,
    amount_cents: bill.remaining_cents,
    payment_reference: reference.trim(),
    status: 'PENDING_RECEIPT',
    submitted_at: new Date().toISOString()
  };
  state.cooperationPayments.push(payment);
  writeMockState(state);
  return payment;
}

export async function confirmOfflineReceipt(paymentId: string, promoterMerchantId: string): Promise<CooperationPayment> {
  if (!USE_MOCK) return (await cloudCooperation('confirmReceipt', { id: paymentId })).payment;
  requireMock();
  const state = readMockState();
  const payment = state.cooperationPayments.find(item => item._id === paymentId);
  const offer = state.cooperations.find(item => item._id === payment?.cooperation_id);
  if (!payment || !offer || offer.promoter_merchant_id !== promoterMerchantId || payment.status !== 'PENDING_RECEIPT') throw new Error('收款记录已变化或无权确认');
  payment.status = 'CONFIRMED';
  payment.confirmed_at = new Date().toISOString();
  writeMockState(state);
  return payment;
}
