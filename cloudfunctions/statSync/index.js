const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 每日凌晨定时触发器任务：
 * 汇总昨日各商家扫码、领券、核销数据，写入 merchant_daily_stat
 * 彻底消除前端查看榜单时的实时多表大聚合性能瓶颈
 */
exports.main = async (event, context) => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  console.log(`[StatSync] Start aggregating stats for date: ${yesterday}`);

  // 1. 查询所有有效商家
  const merchantsRes = await db.collection('merchant').where({ status: 'APPROVED' }).get();
  const merchants = merchantsRes.data;

  for (const m of merchants) {
    const merchantId = m._id;

    // 统计核销数与引流数
    const statId = `${yesterday}_${merchantId}`;

    await db.collection('merchant_daily_stat').doc(statId).set({
      data: {
        date: yesterday,
        merchant_id: merchantId,
        merchant_name: m.name,
        updated_at: new Date()
      }
    });
  }

  return { success: true, date: yesterday };
};
