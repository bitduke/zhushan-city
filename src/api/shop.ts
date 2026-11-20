import { USE_MOCK, callCloudFunction } from './adapter';
import shopDetailMock from '@/mock/shopDetail_A.json';

export async function getShopBenefitData(shopId: string) {
  if (USE_MOCK) {
    return shopDetailMock;
  }
  return callCloudFunction('getShopBenefitData', { shopId });
}

export async function reportScanLog(token: string, sourceMerchantId?: string) {
  if (USE_MOCK) {
    console.log('[MOCK ScanLog Reported]', { token, sourceMerchantId, time: new Date().toISOString() });
    return { success: true };
  }
  return callCloudFunction('scanResolve', { token, sourceMerchantId });
}
