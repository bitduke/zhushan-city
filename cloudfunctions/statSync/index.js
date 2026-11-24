const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV });
const _ = db.command;

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

const inDay = (field, start, end) => ({ [field]: _.gte(start).and(_.lt(end)) });

exports.main = async () => {
  // Runs after 02:00 China Standard Time; the date boundary is always CST.
  const cstNow = new Date(Date.now() + 8 * 3600000);
  const yesterday = new Date(cstNow.getTime() - 86400000).toISOString().slice(0, 10);
  const start = new Date(`${yesterday}T00:00:00+08:00`).toISOString();
  const end = new Date(new Date(`${yesterday}T00:00:00+08:00`).getTime() + 86400000).toISOString();

  try {
    const [merchants, scans, claims, verifications, confirmedResults, arrivals] = await Promise.all([
      fetchAll('merchant'),
      fetchAll('scan_log', inDay('scanned_at', start, end)),
      fetchAll('user_coupon', inDay('claimed_at', start, end)),
      fetchAll('verify_log', inDay('verified_at', start, end)),
      fetchAll('cooperation_result', { status: 'CONFIRMED', ...inDay('confirmed_at', start, end) }),
      fetchAll('appointment', inDay('arrived_at', start, end))
    ]);
    for (const merchant of merchants) {
      const id = merchant._id;
      const uniqueScans = new Set(scans.filter(item => item.source_merchant_id === id).map(item => item.user_hash));
      const stat = {
        date: yesterday,
        merchant_id: id,
        merchant_name: merchant.name,
        scan_count: uniqueScans.size,
        claim_self_count: claims.filter(item => item.merchant_id === id && item.source_merchant_id === id).length,
        redeem_self_count: verifications.filter(item => item.merchant_id === id && item.source_merchant_id === id).length,
        claim_cross_count: claims.filter(item => item.source_merchant_id === id && item.merchant_id !== id).length,
        bring_new_guest_count: confirmedResults.filter(item => item.promoter_merchant_id === id).length,
        received_guest_count: confirmedResults.filter(item => item.buyer_merchant_id === id).length,
        cooperation_target_ids: [...new Set(confirmedResults.filter(item => item.promoter_merchant_id === id).map(item => item.buyer_merchant_id))],
        arrived_count: arrivals.filter(item => item.merchant_id === id).length,
        updated_at: new Date().toISOString()
      };
      await db.collection('merchant_daily_stat').doc(`${yesterday}_${id}`).set({ data: stat });
    }
    return { success: true, date: yesterday, merchantCount: merchants.length };
  } catch (error) {
    console.error('[statSync] failed', { message: error.message });
    return { success: false, code: 'STAT_SYNC_FAILED', message: '统计任务失败，请查看云函数日志' };
  }
};
