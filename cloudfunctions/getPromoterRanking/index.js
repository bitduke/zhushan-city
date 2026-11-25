const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const _ = db.command;
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

async function fetchAll(collection, condition = {}) {
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const response = await db.collection(collection).where(condition).skip(offset).limit(100).get();
    const batch = response.data || [];
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

function buildDiagnosticsSuggestions(metrics, peerMetrics, merchant) {
  const suggestions = [];
  const hasOwnSample = metrics.scans >= 5;
  const hasClaimSample = metrics.totalClaims >= 5;

  if (hasOwnSample && peerMetrics.hasEnoughPeerSample && metrics.acquireRate < peerMetrics.peerAvgAcquireRate) {
    suggestions.push({
      kind: 'IMPROVE_HOOK',
      title: '领券获客率低于同类平均',
      detail: `本店扫码领券率 ${metrics.acquireRate}%，低于竹山「${merchant.category_name || '同业'}」均值 ${peerMetrics.peerAvgAcquireRate}%，建议改用更低门槛的引流礼或破冰券。`,
      actionLabel: '去拓客参谋调整',
      targetPage: '/pages/merchant/coupons'
    });
  } else if (metrics.scans > 0 && metrics.selfClaims === 0) {
    suggestions.push({
      kind: 'IMPROVE_HOOK',
      title: '已有扫码曝光，建议上新低门槛券',
      detail: '顾客已扫描门店码，可立即上架低门槛消费赠礼或满减券承接进店转化。',
      actionLabel: '去一键建券',
      targetPage: '/pages/merchant/coupons'
    });
  }

  if (hasClaimSample && peerMetrics.hasEnoughPeerSample && metrics.verifyRate < peerMetrics.peerAvgVerifyRate) {
    suggestions.push({
      kind: 'IMPROVE_VERIFY',
      title: '到店核销转化有提升空间',
      detail: `本店核销转化率 ${metrics.verifyRate}%（同业均值 ${peerMetrics.peerAvgVerifyRate}%），建议放宽使用门槛或嘱咐收银员结账前主动提醒出示券码。`,
      actionLabel: '去查看话术与规则',
      targetPage: '/pages/merchant/coupons'
    });
  }

  if (metrics.receivedGuests === 0) {
    suggestions.push({
      kind: 'EXPAND_ALLIANCE',
      title: '尚未开启盟友跨店互相带客',
      detail: '目前客源主要依赖本店自然扫码，可配对竹山互补业态（如餐饮配洗车、女装配美甲）挂名引流。',
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
  return suggestions;
}

async function handleDiagnostics(merchantId, openid) {
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  if (!merchantId) return { success: false, code: 'INVALID_MERCHANT', message: '请提供门店编号' };

  const merchant = (await db.collection('merchant').doc(merchantId).get()).data;
  if (!merchant || merchant.status !== 'APPROVED') {
    return { success: false, code: 'FORBIDDEN', message: '门店不存在或未审核通过' };
  }

  const staff = (await db.collection('merchant_staff').doc(`staff_${hash(`${merchantId}:${openid}`)}`).get()).data;
  const user = (await db.collection('user').doc(`user_${hash(openid)}`).get()).data;
  const isAdmin = user && user.status === 'ACTIVE' && user.role === 'ADMIN';
  if (merchant.owner_openid !== openid && !isAdmin && !(staff && staff.status === 'ACTIVE')) {
    return { success: false, code: 'FORBIDDEN', message: '无权查看该门店经营诊断' };
  }

  const cstNow = new Date(Date.now() + 8 * 3600000);
  const today = cstNow.toISOString().slice(0, 10);
  const cutoff = new Date(cstNow.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00+08:00`).toISOString();

  const [peerMerchants, statRows, todayScans, todayClaims, todayVerifies, todayConfirmed, pendingAppointments] = await Promise.all([
    fetchAll('merchant', { category_id: merchant.category_id, status: 'APPROVED' }),
    fetchAll('merchant_daily_stat', { date: _.gte(cutoff) }),
    fetchAll('scan_log', { scanned_at: _.gte(todayStart) }),
    fetchAll('user_coupon', { claimed_at: _.gte(todayStart) }),
    fetchAll('verify_log', { verified_at: _.gte(todayStart) }),
    fetchAll('cooperation_result', { status: 'CONFIRMED', confirmed_at: _.gte(todayStart) }),
    fetchAll('appointment', { merchant_id: merchantId, status: 'REQUESTED' })
  ]);

  const peerIds = new Set(peerMerchants.map(item => item._id));
  const statsByMerchant = new Map();
  const ensure = id => {
    if (!statsByMerchant.has(id)) {
      statsByMerchant.set(id, { scans: 0, selfClaims: 0, totalClaims: 0, selfRedeems: 0, broughtGuests: 0, receivedGuests: 0 });
    }
    return statsByMerchant.get(id);
  };

  for (const row of statRows) {
    if (!peerIds.has(row.merchant_id) && row.merchant_id !== merchantId) continue;
    if (row.date === today) continue; // 避免与今日实时重合
    const bucket = ensure(row.merchant_id);
    bucket.scans += Number(row.scan_count || 0);
    bucket.selfClaims += Number(row.claim_self_count || 0);
    bucket.totalClaims += Number(row.claim_self_count || 0);
    bucket.selfRedeems += Number(row.redeem_self_count || 0);
    bucket.broughtGuests += Number(row.bring_new_guest_count || 0);
    bucket.receivedGuests += Number(row.received_guest_count || 0);
  }

  // 叠加今日实时数据（仅限目标商家与同业商家，防止冷启动当天看不到实时数字）
  const todayScanUsersByShop = new Map();
  for (const log of todayScans) {
    if (!peerIds.has(log.source_merchant_id) && log.source_merchant_id !== merchantId) continue;
    if (!todayScanUsersByShop.has(log.source_merchant_id)) todayScanUsersByShop.set(log.source_merchant_id, new Set());
    todayScanUsersByShop.get(log.source_merchant_id).add(log.user_hash);
  }
  for (const [id, set] of todayScanUsersByShop) ensure(id).scans += set.size;

  for (const claim of todayClaims) {
    if (!peerIds.has(claim.merchant_id) && claim.merchant_id !== merchantId) continue;
    const bucket = ensure(claim.merchant_id);
    bucket.totalClaims += 1;
    if (claim.source_merchant_id === claim.merchant_id) bucket.selfClaims += 1;
  }
  for (const log of todayVerifies) {
    if (!peerIds.has(log.merchant_id) && log.merchant_id !== merchantId) continue;
    ensure(log.merchant_id).selfRedeems += 1;
  }
  for (const res of todayConfirmed) {
    if (peerIds.has(res.promoter_merchant_id) || res.promoter_merchant_id === merchantId) ensure(res.promoter_merchant_id).broughtGuests += 1;
    if (peerIds.has(res.buyer_merchant_id) || res.buyer_merchant_id === merchantId) ensure(res.buyer_merchant_id).receivedGuests += 1;
  }

  // 也统计近 30 天跨店领取到本店的数量（排除今日避免双算）
  const pastStart = new Date(`${cutoff}T00:00:00+08:00`).toISOString();
  const pastCrossClaims = await fetchAll('user_coupon', { claimed_at: _.gte(pastStart).and(_.lt(todayStart)) });
  for (const claim of pastCrossClaims) {
    if ((peerIds.has(claim.merchant_id) || claim.merchant_id === merchantId) && claim.source_merchant_id !== claim.merchant_id) {
      ensure(claim.merchant_id).totalClaims += 1;
    }
  }

  const calcRates = bucket => ({
    ...bucket,
    acquireRate: bucket.scans > 0 ? Math.min(100, Math.round((bucket.selfClaims / bucket.scans) * 1000) / 10) : 0,
    verifyRate: bucket.totalClaims > 0 ? Math.min(100, Math.round((bucket.selfRedeems / bucket.totalClaims) * 1000) / 10) : 0
  });

  const own = calcRates(ensure(merchantId));

  // 计算脱敏的同行平均基准线（至少5个扫码/领券行为的门店才计入率值均值）
  let peerTotalScans = 0;
  let peerTotalSelfClaims = 0;
  let peerTotalClaims = 0;
  let peerTotalRedeems = 0;
  const qualifiedAcquireRates = [];
  const qualifiedVerifyRates = [];

  for (const peer of peerMerchants) {
    const r = calcRates(ensure(peer._id));
    peerTotalScans += r.scans;
    peerTotalSelfClaims += r.selfClaims;
    peerTotalClaims += r.totalClaims;
    peerTotalRedeems += r.selfRedeems;
    if (r.scans >= 5) qualifiedAcquireRates.push(r.acquireRate);
    if (r.totalClaims >= 5) qualifiedVerifyRates.push(r.verifyRate);
  }

  const hasEnoughPeerSample = peerTotalScans >= 5 || peerTotalClaims >= 5;
  const peerAvgAcquireRate = peerTotalScans >= 5 ? Math.min(100, Math.round((peerTotalSelfClaims / peerTotalScans) * 1000) / 10) : 0;
  const peerAvgVerifyRate = peerTotalClaims >= 5 ? Math.min(100, Math.round((peerTotalRedeems / peerTotalClaims) * 1000) / 10) : 0;

  let beatAcquirePercent = null;
  if (own.scans >= 5 && qualifiedAcquireRates.length >= 2) {
    const below = qualifiedAcquireRates.filter(rate => rate <= own.acquireRate).length;
    beatAcquirePercent = Math.round((below / qualifiedAcquireRates.length) * 100);
  }
  let beatVerifyPercent = null;
  if (own.totalClaims >= 5 && qualifiedVerifyRates.length >= 2) {
    const below = qualifiedVerifyRates.filter(rate => rate <= own.verifyRate).length;
    beatVerifyPercent = Math.round((below / qualifiedVerifyRates.length) * 100);
  }

  const peerMetrics = {
    categoryName: merchant.category_name || '本地门店',
    peerCount: peerMerchants.length,
    hasEnoughPeerSample,
    peerAvgAcquireRate,
    peerAvgVerifyRate,
    beatAcquirePercent,
    beatVerifyPercent
  };

  return {
    success: true,
    diagnostics: {
      merchantId,
      merchantName: merchant.name,
      categoryId: merchant.category_id,
      categoryName: merchant.category_name,
      periodDays: 30,
      pendingAppointmentsCount: pendingAppointments.length,
      hasEnoughOwnAcquireSample: own.scans >= 5,
      hasEnoughOwnVerifySample: own.totalClaims >= 5,
      metrics: own,
      peer: peerMetrics,
      suggestions: buildDiagnosticsSuggestions(own, peerMetrics, merchant)
    }
  };
}

exports.main = async (event = {}) => {
  try {
    if (event.action === 'merchantDiagnostics') {
      const openid = cloud.getWXContext().OPENID;
      return await handleDiagnostics(String(event.merchantId || ''), openid);
    }

    const cutoff = new Date(Date.now() + 8 * 3600000 - 30 * 86400000).toISOString().slice(0, 10);
    const rows = await fetchAll('merchant_daily_stat', { date: _.gte(cutoff) });
    const grouped = new Map();
    for (const row of rows) {
      const entry = grouped.get(row.merchant_id) || { confirmed: 0, claims: 0, targets: new Set() };
      entry.confirmed += Number(row.bring_new_guest_count || 0);
      entry.claims += Number(row.claim_cross_count || 0);
      for (const id of row.cooperation_target_ids || []) entry.targets.add(id);
      grouped.set(row.merchant_id, entry);
    }
    const ranking = [];
    for (const [id, values] of grouped) {
      if (values.confirmed < 1) continue;
      const merchant = (await db.collection('merchant').doc(id).get()).data;
      if (!merchant || merchant.status !== 'APPROVED') continue;
      ranking.push({
        merchant_id: id, merchant_name: merchant.name, category_name: merchant.category_name,
        town: merchant.town, avatar: merchant.avatar || '', total_brought_guests: values.confirmed,
        coop_merchants_count: values.targets.size, sample_size: values.claims,
        conversion_rate: values.claims >= 5 ? Math.round(values.confirmed / values.claims * 1000) / 10 : 0,
        is_new_partner: values.claims < 5
      });
    }
    ranking.sort((a, b) => b.total_brought_guests - a.total_brought_guests);
    return { success: true, list: ranking, periodDays: 30 };
  } catch (error) {
    console.error('[getPromoterRanking] failed', { message: error.message });
    return { success: false, message: '数据服务暂不可用' };
  }
};
