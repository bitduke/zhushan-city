import { USE_MOCK, callCloudFunction } from './adapter';
import { activePlacementCouponIds } from './cooperation';
import { readMockState } from './mockState';
import { writeMockState } from './mockState';
import { useUserStore } from '@/store/user';

export async function getShopBenefitData(shopId: string) {
  if (USE_MOCK) {
    const state = readMockState();
    const merchant = state.merchants.find(item => item._id === shopId && item.status === 'APPROVED');
    if (!merchant) throw new Error('该门店不存在、未审核通过或已停用');
    const now = Date.now();
    const available = state.couponTemplates.filter(item => item.status === 'ACTIVE'
      && now >= new Date(`${item.start_time.slice(0, 10)}T00:00:00+08:00`).getTime()
      && now <= new Date(`${item.end_time.slice(0, 10)}T23:59:59+08:00`).getTime());
    const ownCoupons = available.filter(item => item.merchant_id === shopId);
    const selfCoupon = ownCoupons.find(item => item.usage_mode === 'INSTANT' && item.type === 'FULL_REDUCTION') || null;
    const activeCouponIds = activePlacementCouponIds(shopId);
    return { merchant, self_coupon: selfCoupon, own_coupons: ownCoupons.filter(item => item._id !== selfCoupon?._id), cross_coupons: available.filter(item => activeCouponIds.includes(item._id)) };
  }
  const result = await callCloudFunction<any>('getShopBenefitData', { shopId });
  if (!result.success) throw new Error(result.message || '门店福利暂不可用');
  return result;
}

export async function resolveScanToken(token: string): Promise<{ merchantId: string }> {
  if (USE_MOCK) {
    if (!token || token.length > 32) throw new Error('门店码无效');
    const merchant = readMockState().merchants.find(item => item.qrcode_token === token && item.status === 'APPROVED');
    if (!merchant) throw new Error('门店码不存在、已失效或门店停用');
    return { merchantId: merchant._id };
  }
  const result = await callCloudFunction<{ success: boolean; merchantId?: string; message?: string }>('scanResolve', { action: 'resolve', token });
  if (!result.success || !result.merchantId) throw new Error(result.message || '门店码无效');
  return { merchantId: result.merchantId };
}

export async function reportScanLog(token: string): Promise<{ merchantId: string; deduped: boolean }> {
  if (USE_MOCK) {
    const { merchantId } = await resolveScanToken(token);
    const state = readMockState();
    const userId = useUserStore().profile?._id || 'u_guest_demo';
    const recent = state.scanLogs.some(item => item.token === token && item.user_id === userId && Date.now() - new Date(item.scanned_at).getTime() < 5 * 60000);
    if (!recent) {
      state.scanLogs.push({ token, source_merchant_id: merchantId, user_id: userId, scanned_at: new Date().toISOString() });
      writeMockState(state);
    }
    return { merchantId, deduped: recent };
  }
  const result = await callCloudFunction<{ success: boolean; merchantId?: string; deduped?: boolean; message?: string }>('scanResolve', { action: 'enter', token });
  if (!result.success || !result.merchantId) throw new Error(result.message || '扫码记录失败');
  return { merchantId: result.merchantId, deduped: !!result.deduped };
}
