import { USE_MOCK, callCloudFunction } from './adapter';
import { readMockState } from './mockState';
import { DEMO_MERCHANTS } from '@/store/merchant';
import type { DiagnosticSuggestion, MerchantDiagnostics, MerchantRankingItem } from '@/types/stat';

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

export async function getMerchantDiagnostics(merchantId: string): Promise<MerchantDiagnostics> {
  if (!USE_MOCK) {
    const result = await callCloudFunction<{ success: boolean; diagnostics?: MerchantDiagnostics; message?: string }>(
      'getPromoterRanking',
      { action: 'merchantDiagnostics', merchantId }
    );
    if (!result.success || !result.diagnostics) throw new Error(result.message || '经营诊断数据加载失败');
    return result.diagnostics;
  }

  const state = readMockState();
  const merchant = state.merchants.find(m => m._id === merchantId) || DEMO_MERCHANTS.find(m => m._id === merchantId);
  if (!merchant) throw new Error('未找到门店信息');

  const peers = state.merchants.filter(m => m.category_id === merchant.category_id && m.status === 'APPROVED');
  const calcShop = (id: string) => {
    const scans = new Set(state.scanLogs.filter(s => s.source_merchant_id === id).map(s => s.user_id)).size;
    const totalClaims = state.coupons.filter(c => c.merchant_id === id && c.status !== 'VOID').length;
    const selfClaims = state.coupons.filter(c => c.merchant_id === id && c.source_merchant_id === id && c.status !== 'VOID').length;
    const selfRedeems = state.coupons.filter(c => c.merchant_id === id && c.status === 'USED').length;
    const broughtGuests = state.cooperationResults.filter(r => r.promoter_merchant_id === id && r.status === 'CONFIRMED').length;
    const receivedGuests = state.cooperationResults.filter(r => r.buyer_merchant_id === id && r.status === 'CONFIRMED').length;
    const acquireRate = scans > 0 ? Math.min(100, Math.round((selfClaims / scans) * 1000) / 10) : 0;
    const verifyRate = totalClaims > 0 ? Math.min(100, Math.round((selfRedeems / totalClaims) * 1000) / 10) : 0;
    return { scans, selfClaims, totalClaims, selfRedeems, broughtGuests, receivedGuests, acquireRate, verifyRate };
  };

  const own = calcShop(merchant._id);
  let peerScans = 0;
  let peerSelfClaims = 0;
  let peerTotalClaims = 0;
  let peerRedeems = 0;
  const acqRates: number[] = [];
  const verRates: number[] = [];

  for (const p of peers) {
    const r = calcShop(p._id);
    peerScans += r.scans;
    peerSelfClaims += r.selfClaims;
    peerTotalClaims += r.totalClaims;
    peerRedeems += r.selfRedeems;
    if (r.scans >= 5) acqRates.push(r.acquireRate);
    if (r.totalClaims >= 5) verRates.push(r.verifyRate);
  }

  const hasEnoughPeerSample = peerScans >= 5 || peerTotalClaims >= 5;
  const peerAvgAcquireRate = peerScans >= 5 ? Math.min(100, Math.round((peerSelfClaims / peerScans) * 1000) / 10) : 0;
  const peerAvgVerifyRate = peerTotalClaims >= 5 ? Math.min(100, Math.round((peerRedeems / peerTotalClaims) * 1000) / 10) : 0;
  const beatAcquirePercent = own.scans >= 5 && acqRates.length >= 2 ? Math.round((acqRates.filter(x => x <= own.acquireRate).length / acqRates.length) * 100) : null;
  const beatVerifyPercent = own.totalClaims >= 5 && verRates.length >= 2 ? Math.round((verRates.filter(x => x <= own.verifyRate).length / verRates.length) * 100) : null;
  const pendingAppointmentsCount = state.appointments.filter(a => a.merchant_id === merchant._id && a.status === 'REQUESTED').length;

  const suggestions: DiagnosticSuggestion[] = [];
  if (own.scans >= 5 && hasEnoughPeerSample && own.acquireRate < peerAvgAcquireRate) {
    suggestions.push({
      kind: 'IMPROVE_HOOK',
      title: '领券获客率低于同类平均',
      detail: `本店扫码领券率 ${own.acquireRate}%，低于竹山「${merchant.category_name}」均值 ${peerAvgAcquireRate}%，建议改用低门槛体验礼拉高转化。`,
      actionLabel: '去拓客参谋调整',
      targetPage: '/pages/merchant/coupons'
    });
  } else if (own.scans > 0 && own.selfClaims === 0) {
    suggestions.push({
      kind: 'IMPROVE_HOOK',
      title: '已有扫码曝光，建议上新低门槛券',
      detail: '顾客已扫描门店码，可立即上架消费赠礼或满减券承接进店转化。',
      actionLabel: '去一键建券',
      targetPage: '/pages/merchant/coupons'
    });
  }
  if (own.totalClaims >= 5 && hasEnoughPeerSample && own.verifyRate < peerAvgVerifyRate) {
    suggestions.push({
      kind: 'IMPROVE_VERIFY',
      title: '到店核销转化有提升空间',
      detail: `本店核销率 ${own.verifyRate}%（同业均值 ${peerAvgVerifyRate}%），建议放宽门槛或加强收银员提醒。`,
      actionLabel: '去查看话术与规则',
      targetPage: '/pages/merchant/coupons'
    });
  }
  if (own.receivedGuests === 0) {
    suggestions.push({
      kind: 'EXPAND_ALLIANCE',
      title: '尚未开启盟友跨店互相带客',
      detail: '目前客源依赖自然扫码，可配对竹山互补业态（如餐饮配洗车、女装配美甲）挂名引流。',
      actionLabel: '去发起跨店合作',
      targetPage: '/pages/merchant/cooperation'
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      kind: 'KEEP_GROWING',
      title: '门店转换与合作节奏良好',
      detail: '继续保持桌牌引导顾客扫码，并留意待处理预约与有效结果核对。',
      actionLabel: '前往核销工作台',
      targetPage: '/pages/merchant/verify'
    });
  }

  return {
    merchantId: merchant._id,
    merchantName: merchant.name,
    categoryId: merchant.category_id,
    categoryName: merchant.category_name,
    periodDays: 30,
    pendingAppointmentsCount,
    hasEnoughOwnAcquireSample: own.scans >= 5,
    hasEnoughOwnVerifySample: own.totalClaims >= 5,
    metrics: own,
    peer: {
      categoryName: merchant.category_name,
      peerCount: peers.length,
      hasEnoughPeerSample,
      peerAvgAcquireRate,
      peerAvgVerifyRate,
      beatAcquirePercent,
      beatVerifyPercent
    },
    suggestions
  };
}
