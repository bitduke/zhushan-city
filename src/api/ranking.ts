import { USE_MOCK, callCloudFunction } from './adapter';
import { readMockState } from './mockState';
import { DEMO_MERCHANTS } from '@/store/merchant';
import type { MerchantRankingItem } from '@/types/stat';

export async function getPromoterRanking(): Promise<MerchantRankingItem[]> {
  if (USE_MOCK) {
    const state = readMockState();
    const cutoff = Date.now() - 30 * 86400000;
    const promoters = [...new Set(state.cooperations.map(item => item.promoter_merchant_id))];
    return promoters.map(id => {
      const merchant = DEMO_MERCHANTS.find(item => item._id === id)!;
      const cooperationIds = state.cooperations.filter(item => item.promoter_merchant_id === id).map(item => item._id);
      const claims = state.coupons.filter(item => item.cooperation_contract_id && cooperationIds.includes(item.cooperation_contract_id) && new Date(item.claimed_at).getTime() >= cutoff);
      const results = state.cooperationResults.filter(item => cooperationIds.includes(item.cooperation_id) && item.status === 'CONFIRMED' && new Date(item.verified_at).getTime() >= cutoff);
      return {
        merchant_id: id,
        merchant_name: merchant.name,
        category_name: merchant.category_name,
        town: merchant.town,
        avatar: merchant.avatar,
        total_brought_guests: results.length,
        coop_merchants_count: new Set(results.map(item => item.buyer_merchant_id)).size,
        conversion_rate: claims.length ? Math.round(results.length / claims.length * 1000) / 10 : 0,
        sample_size: claims.length,
        is_new_partner: claims.length < 5
      };
    }).filter(item => item.total_brought_guests > 0).sort((a, b) => b.total_brought_guests - a.total_brought_guests);
  }
  const result = await callCloudFunction<{ success: boolean; list?: MerchantRankingItem[]; message?: string }>('getPromoterRanking');
  if (!result.success) throw new Error(result.message || '榜单加载失败');
  return result.list || [];
}
