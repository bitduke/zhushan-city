<template>
  <view class="benefit-page" v-if="merchant">
    <!-- 顶部门店专属身份背书 -->
    <view class="shop-hero">
      <view class="shop-brand">
        <image class="shop-logo" :src="merchant.avatar" mode="aspectFill" />
        <view class="brand-text">
          <view class="badge-row">
            <text class="source-tag">本店专属福利码</text>
            <text class="town-tag">{{ merchant.town }}</text>
          </view>
          <view class="name">{{ merchant.name }}</view>
          <view class="hours">营业时间：{{ merchant.business_hours }}</view>
        </view>
      </view>

      <view class="address-bar">
        <text class="addr-text">📍 {{ merchant.address }}</text>
        <button class="call-small" @tap="callShop">电话</button>
      </view>
    </view>

    <!-- 第一核心模块：A店当场可用的立减券 -->
    <view class="section-box" v-if="selfCoupon">
      <view class="section-title-bar">
        <text class="title-bold">🎁 本店当场福利</text>
        <text class="title-tip">结账直接出示抵扣</text>
      </view>

      <view class="self-coupon-card">
        <view class="left-val">
          <text class="unit">¥</text>
          <text class="num">{{ selfCoupon.discount_amount }}</text>
          <text class="cond">满{{ selfCoupon.condition_amount }}可用</text>
        </view>
        <view class="mid-desc">
          <view class="coupon-tag">进店当场立减</view>
          <view class="coupon-name">{{ selfCoupon.title }}</view>
          <view class="rules">{{ selfCoupon.instructions }}</view>
        </view>
        <view class="right-act">
          <button 
            v-if="!selfCouponClaimed" 
            class="claim-btn pulse" 
            @tap="handleClaimSelf"
          >
            领券立减
          </button>
          <button 
            v-else 
            class="use-btn" 
            @tap="showCodeModal"
          >
            出示核销
          </button>
        </view>
      </view>
    </view>

    <!-- 第二核心模块：A店甄选引荐·合作好店专属福利 (限时/新客体验) -->
    <view class="section-box" v-if="crossCoupons.length > 0">
      <view class="section-title-bar">
        <view class="left-title">
          <text class="title-bold">💎 雅致老客专享·商圈好店直通</text>
          <text class="title-tip">本周合作好店特惠礼遇</text>
        </view>
      </view>

      <view class="cross-list">
        <CouponCard 
          v-for="item in crossCoupons" 
          :key="item._id" 
          :coupon="item" 
          action-text="免费领取" 
          @action="handleClaimCross(item)" 
        />
      </view>
    </view>

    <!-- 底部保障声明 -->
    <view class="trust-footer">
      <text class="trust-text">🛡️ 竹山同城商圈联盟认证 · 真实优惠 · 进店保兑</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getShopBenefitData, reportScanLog } from '@/api/shop';
import { claimCoupon } from '@/api/coupon';
import { requestAppointmentSubscription } from '@/utils/subscribe';
import CouponCard from '@/components/CouponCard.vue';

const merchant = ref<any>(null);
const selfCoupon = ref<any>(null);
const crossCoupons = ref<any[]>([]);
const selfCouponClaimed = ref(false);
const claimedSelfCouponCode = ref('');

onLoad(async (options) => {
  const shopId = options?.shopId || 'shop_001';
  const token = options?.scene || 'tk_demo';

  // 1. 上报扫码日志
  reportScanLog(token, shopId);

  // 2. 加载门店福利页数据
  try {
    const data = await getShopBenefitData(shopId);
    merchant.value = data.merchant;
    selfCoupon.value = data.self_coupon;
    crossCoupons.value = data.cross_coupons;
  } catch (err) {
    console.error('Failed to load shop benefit:', err);
  }
});

const callShop = () => {
  if (merchant.value?.phone) {
    uni.makePhoneCall({ phoneNumber: merchant.value.phone });
  }
};

const handleClaimSelf = async () => {
  uni.showLoading({ title: '领券中...' });
  try {
    const res = await claimCoupon({ couponId: selfCoupon.value._id, sourceMerchantId: merchant.value._id });
    selfCouponClaimed.value = true;
    claimedSelfCouponCode.value = res.code;
    uni.hideLoading();
    uni.showToast({ title: '领取成功！结账请向店员出示', icon: 'success' });
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: '领券失败', icon: 'none' });
  }
};

const showCodeModal = () => {
  uni.navigateTo({
    url: `/pages/coupon/code?code=${claimedSelfCouponCode.value || 'ZS2026112001'}`
  });
};

const handleClaimCross = async (coupon: any) => {
  uni.showLoading({ title: '领取中...' });
  try {
    // 若服务券需预约，申请订阅消息
    if (coupon.booking_required) {
      await requestAppointmentSubscription();
    }
    const res = await claimCoupon({
      couponId: coupon._id,
      sourceMerchantId: merchant.value._id // 严格绑定引流店 ID
    });
    uni.hideLoading();
    uni.showModal({
      title: '领取成功！',
      content: coupon.booking_required
        ? `您已成功领取【${coupon.merchant_name}】专属券，该服务需预约时段，是否立即前往预约？`
        : `您已成功领取【${coupon.merchant_name}】专属券，已存入您的卡券包。`,
      confirmText: coupon.booking_required ? '立即预约' : '去券包查看',
      cancelText: '留在本店',
      success: (mRes) => {
        if (mRes.confirm) {
          uni.navigateTo({ url: `/pages/coupon/code?code=${res.code}` });
        }
      }
    });
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: '领券失败', icon: 'none' });
  }
};
</script>

<style scoped>
.benefit-page {
  min-height: 100vh;
  background-color: #F3F4F6;
  padding-bottom: 60rpx;
}

.shop-hero {
  background: linear-gradient(180deg, #1E3A8A 0%, #2563EB 100%);
  color: #ffffff;
  padding: 30rpx 28rpx 36rpx;
  border-bottom-left-radius: 32rpx;
  border-bottom-right-radius: 32rpx;
}

.shop-brand {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.shop-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 20rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.brand-text {
  flex: 1;
}

.badge-row {
  display: flex;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.source-tag {
  background: #F59E0B;
  color: #ffffff;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 600;
}

.town-tag {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.name {
  font-size: 32rpx;
  font-weight: bold;
  line-height: 1.3;
}

.hours {
  font-size: 20rpx;
  opacity: 0.85;
  margin-top: 6rpx;
}

.address-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.12);
  padding: 14rpx 20rpx;
  border-radius: 12rpx;
  margin-top: 24rpx;
}

.addr-text {
  font-size: 22rpx;
  opacity: 0.95;
  max-width: 520rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.call-small {
  background: #10B981;
  color: #ffffff;
  font-size: 20rpx;
  padding: 0 18rpx;
  height: 44rpx;
  line-height: 44rpx;
  border-radius: 22rpx;
  border: none;
}

.section-box {
  padding: 24rpx;
}

.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.title-bold {
  font-size: 30rpx;
  font-weight: bold;
  color: #111827;
}

.title-tip {
  font-size: 20rpx;
  color: #6B7280;
}

.self-coupon-card {
  background: #ffffff;
  border-radius: 20rpx;
  display: flex;
  box-shadow: 0 6rpx 20rpx rgba(220, 38, 38, 0.12);
  border: 2rpx solid #FCA5A5;
  overflow: hidden;
}

.left-val {
  width: 200rpx;
  background: #FEF2F2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24rpx 10rpx;
  color: #DC2626;
  border-right: 2rpx dashed #FCA5A5;
}

.unit {
  font-size: 26rpx;
  font-weight: bold;
}

.num {
  font-size: 56rpx;
  font-weight: 900;
  line-height: 1;
}

.cond {
  font-size: 20rpx;
  margin-top: 6rpx;
  color: #991B1B;
}

.mid-desc {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.coupon-tag {
  display: inline-block;
  align-self: flex-start;
  font-size: 18rpx;
  background: #DC2626;
  color: #ffffff;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.coupon-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #111827;
  margin: 6rpx 0;
}

.rules {
  font-size: 20rpx;
  color: #6B7280;
}

.right-act {
  width: 170rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 16rpx;
}

.claim-btn {
  background: #DC2626;
  color: #ffffff;
  font-size: 24rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  font-weight: bold;
  border: none;
}

.use-btn {
  background: #059669;
  color: #ffffff;
  font-size: 24rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 20rpx;
  border-radius: 32rpx;
  font-weight: bold;
  border: none;
}

.trust-footer {
  text-align: center;
  padding: 30rpx 20rpx;
}

.trust-text {
  font-size: 20rpx;
  color: #9CA3AF;
}
</style>
