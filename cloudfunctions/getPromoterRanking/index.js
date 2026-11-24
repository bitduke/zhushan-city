const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const _ = db.command;

exports.main = async () => {
  try {
    const cutoff = new Date(Date.now() + 8 * 3600000 - 30 * 86400000).toISOString().slice(0, 10);
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const response = await db.collection('merchant_daily_stat').where({ date: _.gte(cutoff) }).skip(offset).limit(100).get();
      const batch = response.data || [];
      rows.push(...batch);
      if (batch.length < 100) break;
    }
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
    return { success: false, message: '榜单暂不可用' };
  }
};
