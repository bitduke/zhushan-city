const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const dayStart = value => new Date(`${String(value).slice(0, 10)}T00:00:00+08:00`).getTime();
const dayEnd = value => new Date(`${String(value).slice(0, 10)}T23:59:59+08:00`).getTime();
const available = item => item && item.status === 'ACTIVE' && Date.now() >= dayStart(item.start_time) && Date.now() <= dayEnd(item.end_time) && (item.claimed_count || 0) < item.total_count;

exports.main = async (event = {}) => {
  const shopId = String(event.shopId || '');
  if (!/^[A-Za-z0-9_-]{1,96}$/.test(shopId)) return { success: false, message: '门店参数无效' };
  try {
    const merchant = (await db.collection('merchant').doc(shopId).get()).data;
    if (!merchant || merchant.status !== 'APPROVED') return { success: false, message: '门店不存在、未审核通过或已停用' };
    const ownResponse = await db.collection('coupon').where({ merchant_id: shopId, status: 'ACTIVE' }).limit(100).get();
    const own = (ownResponse.data || []).filter(available);
    const selfCoupon = own.find(item => item.usage_mode === 'INSTANT' && item.type === 'FULL_REDUCTION') || null;
    const placementsResponse = await db.collection('benefit_placement').where({ source_merchant_id: shopId, status: 'ACTIVE' }).orderBy('sort', 'asc').limit(100).get();
    const cross = [];
    for (const placement of placementsResponse.data || []) {
      const [contractResult, couponResult] = await Promise.all([
        db.collection('cooperation').doc(placement.cooperation_id).get(),
        db.collection('coupon').doc(placement.target_coupon_id).get()
      ]);
      const contract = contractResult.data;
      const coupon = couponResult.data;
      if (!contract || contract.status !== 'ACTIVE' || contract.promoter_merchant_id !== shopId || contract.target_coupon_id !== placement.target_coupon_id || Date.now() < dayStart(contract.start_date) || Date.now() > dayEnd(contract.end_date) || !available(coupon)) continue;
      const target = (await db.collection('merchant').doc(coupon.merchant_id).get()).data;
      if (!target || target.status !== 'APPROVED') continue;
      if (contract.pricing_model === 'PER_RESULT' && (contract.reserved_count || 0) >= Math.floor(contract.budget_cents / contract.unit_price_cents)) continue;
      cross.push(coupon);
      if (cross.length >= 5) break;
    }
    const { owner_openid, owner_id, ...safeMerchant } = merchant;
    return { success: true, merchant: safeMerchant, self_coupon: selfCoupon, own_coupons: own.filter(item => item._id !== selfCoupon?._id), cross_coupons: cross };
  } catch (error) {
    console.error('[getShopBenefitData] failed', { message: error.message });
    return { success: false, message: '门店福利暂不可用' };
  }
};
