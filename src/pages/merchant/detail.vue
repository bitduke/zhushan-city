<template>
  <view class="detail-page" v-if="merchant">
    <view class="shop-cover">
      <image v-if="showImage" class="cover-photo" :src="merchant.avatar" mode="aspectFill" @error="imageFailed = true" />
      <view v-else class="cover-fallback">
        <view class="cover-ring"></view>
        <image :src="'/static/icons/store.png'" mode="aspectFit" />
        <text>竹山好店</text>
      </view>
    </view>
    <view class="detail-content">
      <view class="main-card">
        <view class="badge-row">
          <text class="verified-badge">已审核商家</text>
          <text class="town-badge">{{ merchant.town }}</text>
        </view>
        <view class="name">{{ merchant.name }}</view>
        <view class="category">{{ merchant.category_name }}</view>
        <view class="divider"></view>
        <view class="detail-line"><image :src="'/static/icons/pin.png'" mode="aspectFit" /><text>{{ merchant.address }}</text></view>
        <view class="detail-line"><image :src="'/static/icons/store.png'" mode="aspectFit" /><text>营业时间 {{ merchant.business_hours }}</text></view>
        <view class="description" v-if="merchant.description">{{ merchant.description }}</view>
      </view>

      <view class="section-title">这家店的福利 <text>{{ coupons.length }} 张可用</text></view>
      <view v-if="coupons.length === 0" class="empty-note">暂未上架优惠，欢迎看看门店详情。</view>
      <view v-for="coupon in coupons" :key="coupon._id" class="offer-card" @tap="openBenefit">
        <view class="offer-icon"><image :src="'/static/icons/ticket.png'" mode="aspectFit" /></view>
        <view class="offer-content">
          <view class="offer-title">{{ coupon.title }}</view>
          <text class="offer-expiry">有效期至 {{ coupon.end_time }}</text>
        </view>
        <text class="offer-arrow">›</text>
      </view>

      <view class="notice">{{ USE_MOCK ? '本地演示门店资料；' : '' }}线下到店前请自行核实。</view>
    </view>
    <view class="bottom-actions">
      <button v-if="merchant.phone" class="contact-button" @tap="call">联系门店</button>
      <t-button theme="primary" shape="round" block :custom-style="benefitButtonStyle" @click="openBenefit">查看门店福利</t-button>
    </view>
  </view>
  <view class="detail-page missing" v-else>商家不存在、尚未审核通过或已停用。</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { getPublicMerchantDetail } from '@/api/merchant';
import { getPublicCouponTemplates } from '@/api/couponManage';
import type { Merchant } from '@/types/merchant';
import type { CouponTemplate } from '@/types/coupon';

const merchant = ref<Merchant | null>(null);
const coupons = ref<CouponTemplate[]>([]);
const merchantId = ref('');
const imageFailed = ref(false);
const showImage = computed(() => !!merchant.value?.avatar && !merchant.value.avatar.includes('picsum.photos') && !imageFailed.value);
const benefitButtonStyle = { backgroundColor: '#17664c', borderColor: 'transparent', color: '#fff', fontWeight: '700' };
const load = async () => {
  if (!merchantId.value) return;
  [merchant.value, coupons.value] = await Promise.all([
    getPublicMerchantDetail(merchantId.value),
    getPublicCouponTemplates(merchantId.value)
  ]);
};
onLoad((options) => { merchantId.value = options?.id || ''; load(); });
onShow(load);
const call = () => { if (merchant.value?.phone) uni.makePhoneCall({ phoneNumber: merchant.value.phone }); };
const openBenefit = () => uni.navigateTo({ url: '/pages/benefit/shop?shopId=' + encodeURIComponent(merchantId.value) });
</script>

<style scoped>
.detail-page { min-height: 100vh; padding-bottom: 150rpx; background: var(--zs-canvas); }
.shop-cover { height: 300rpx; overflow: hidden; background: #dcece2; }
.cover-photo { width: 100%; height: 100%; }
.cover-fallback { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10rpx; color: #6f9580; background: linear-gradient(135deg,#d8ebe0,#f0efe3); font-size: 21rpx; letter-spacing: 3rpx; }
.cover-fallback image { width: 84rpx; height: 84rpx; opacity: .7; }
.cover-ring { position: absolute; right: -80rpx; top: -140rpx; width: 420rpx; height: 420rpx; border-radius: 50%; border: 2rpx solid rgba(23,102,76,.14); }
.detail-content { position: relative; margin: -30rpx 20rpx 0; }
.main-card { padding: 25rpx; border-radius: 22rpx; background: white; box-shadow: 0 6rpx 20rpx rgba(20,51,36,.055); }
.badge-row { display: flex; gap: 10rpx; }
.verified-badge, .town-badge { padding: 5rpx 12rpx; border-radius: 8rpx; font-size: 19rpx; }
.verified-badge { color: var(--zs-green); background: var(--zs-green-soft); }
.town-badge { color: #708477; background: #f2f4ef; }
.name { margin-top: 15rpx; color: var(--zs-ink); font-size: 35rpx; line-height: 1.3; font-weight: 800; }
.category { margin-top: 7rpx; color: var(--zs-green); font-size: 22rpx; }
.divider { height: 1rpx; margin: 22rpx 0 13rpx; background: var(--zs-border); }
.detail-line { display: flex; align-items: flex-start; gap: 9rpx; margin-top: 13rpx; color: #566f5e; font-size: 22rpx; line-height: 1.4; }
.detail-line image { width: 25rpx; height: 25rpx; flex-shrink: 0; margin-top: 2rpx; }
.description { margin-top: 20rpx; padding: 16rpx; border-radius: 12rpx; color: #607468; background: #f5f8f3; font-size: 21rpx; line-height: 1.5; }
.section-title { display: flex; justify-content: space-between; align-items: baseline; margin: 30rpx 3rpx 15rpx; color: var(--zs-ink); font-size: 29rpx; font-weight: 800; }
.section-title text { color: var(--zs-muted); font-size: 20rpx; font-weight: 400; }
.offer-card { display: flex; align-items: center; gap: 15rpx; margin-top: 12rpx; padding: 17rpx; border: 1rpx solid var(--zs-border); border-radius: 17rpx; background: #fff; }
.offer-icon { width: 65rpx; height: 65rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 13rpx; background: var(--zs-orange-soft); }
.offer-icon image { width: 39rpx; height: 39rpx; }
.offer-content { flex: 1; min-width: 0; }
.offer-title { color: var(--zs-ink); font-size: 24rpx; line-height: 1.35; font-weight: 700; }
.offer-expiry { display: block; margin-top: 5rpx; color: var(--zs-muted); font-size: 19rpx; }
.offer-arrow { color: var(--zs-green); font-size: 34rpx; }
.notice, .empty-note { margin-top: 25rpx; color: #8e9e90; font-size: 20rpx; line-height: 1.5; text-align: center; }
.bottom-actions { position: fixed; z-index: 5; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 14rpx; padding: 16rpx 22rpx 28rpx; border-top: 1rpx solid var(--zs-border); background: #fff; }
.contact-button { flex-shrink: 0; margin: 0; padding: 0 25rpx; height: 72rpx; line-height: 72rpx; border-radius: 36rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 23rpx; font-weight: 700; }
.missing { padding: 45rpx 25rpx; color: var(--zs-muted); text-align: center; }
</style>
