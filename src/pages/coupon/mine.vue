<template>
  <view class="mine-coupons-page">
    <view class="page-hero">
      <text class="hero-kicker">MY BENEFITS</text>
      <view class="hero-title">我的卡券包</view>
      <view class="hero-subtitle">已领福利都在这里，到店出示即可使用</view>
      <view class="hero-stats-row">
        <view class="hero-count"><text>{{ summary.unusedCount }}</text> 张待使用</view>
        <view class="hero-saved-badge" v-if="summary.usedCount > 0 || summary.expiringSoonList.length > 0">
          <text v-if="summary.usedCount > 0">已核销 {{ summary.usedCount }} 笔 · 省 ¥{{ summary.totalSavedYuan }}</text>
          <text v-if="summary.expiringSoonList.length > 0" class="expiring-warn"> · ⏳ {{ summary.expiringSoonList.length }} 张快到期</text>
        </view>
      </view>
    </view>

    <view class="content">
      <view class="tab-header">
        <view class="tab-btn" :class="{ active: currentTab === 'UNUSED' }" @tap="currentTab = 'UNUSED'">待使用 {{ unusedList.length }}</view>
        <view class="tab-btn" :class="{ active: currentTab === 'USED' }" @tap="currentTab = 'USED'">已核销 {{ usedList.length }}</view>
        <view class="tab-btn" :class="{ active: currentTab === 'EXPIRED' }" @tap="currentTab = 'EXPIRED'">已过期</view>
      </view>

      <!-- 按门店行业分类筛选优惠券 -->
      <scroll-view class="cat-filter-scroll" scroll-x show-scrollbar="false" v-if="coupons.length > 0">
        <view class="cat-filter-row">
          <text
            v-for="cat in filterCategories"
            :key="cat.id"
            class="cat-chip"
            :class="{ active: selectedCategory === cat.id }"
            @tap="selectedCategory = cat.id"
          >{{ cat.name }}</text>
        </view>
      </scroll-view>

      <view class="list-container">
        <view v-if="displayList.length === 0" class="empty-wrap">
          <view class="empty-icon"><image :src="'/static/icons/ticket.png'" mode="aspectFit" /></view>
          <view class="empty-title">{{ selectedCategory === 'all' ? '暂无相关卡券' : '该分类下暂无卡券' }}</view>
          <text class="empty-text">到参与门店扫描福利码并领取后，卡券会保存在这里。</text>
          <view class="empty-action-btn" @tap="goToAlliance">了解商圈好券与玩法 ›</view>
        </view>

        <view v-for="item in displayList" :key="item._id" class="coupon-item-wrap">
          <!-- 72小时临期紧迫倒计时条 -->
          <view v-if="isExpiringSoon(item)" class="expiring-bar" @tap="onCouponAction(item)">
            <text class="expiring-left">⏳ 即将过期 · 仅剩 {{ formatCountdown(item.expires_at, nowTick) }}</text>
            <text class="expiring-go">去使用 ›</text>
          </view>
          <CouponCard
            :coupon="item"
            :is-claimed="true"
            @action="onCouponAction(item)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onHide, onUnload, onPullDownRefresh, onShareAppMessage } from '@dcloudio/uni-app';
import { getMyCoupons, summarizeMyCoupons, formatCountdown } from '@/api/coupon';
import { USE_MOCK } from '@/api/adapter';
import { ensureRichDemoPreviewData } from '@/api/mockState';
import { MERCHANT_CATEGORIES } from '@/constants/enums';
import type { UserCoupon } from '@/types/coupon';
import CouponCard from '@/components/CouponCard.vue';

const coupons = ref<UserCoupon[]>([]);
const currentTab = ref<'UNUSED' | 'USED' | 'EXPIRED'>('UNUSED');
const selectedCategory = ref<string>('all');
const nowTick = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

const filterCategories = [
  { id: 'all', name: '全部分类' },
  ...MERCHANT_CATEGORIES.map(c => ({ id: c.id, name: c.name }))
];

const loadCoupons = async () => {
  try {
    if (USE_MOCK) ensureRichDemoPreviewData();
    coupons.value = await getMyCoupons();
    nowTick.value = Date.now();
  } catch (err) {
    console.error('Failed to load my coupons:', err);
  }
};

const startTicker = () => {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
};

const stopTicker = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

onShow(() => {
  loadCoupons();
  startTicker();
});
onHide(stopTicker);
onUnload(stopTicker);

const summary = computed(() => summarizeMyCoupons(coupons.value, nowTick.value));
const unusedList = computed(() => coupons.value.filter(c => c.status === 'UNUSED'));
const usedList = computed(() => coupons.value.filter(c => c.status === 'USED'));
const expiredList = computed(() => coupons.value.filter(c => c.status === 'EXPIRED'));

const displayList = computed(() => {
  const base = currentTab.value === 'UNUSED'
    ? unusedList.value
    : currentTab.value === 'USED'
      ? usedList.value
      : expiredList.value;
  if (selectedCategory.value === 'all') return base;
  return base.filter(c => c.category_id === selectedCategory.value);
});

const isExpiringSoon = (coupon: UserCoupon) => {
  if (coupon.status !== 'UNUSED') return false;
  const diff = new Date(coupon.expires_at).getTime() - nowTick.value;
  return diff > 0 && diff <= 72 * 3600000;
};

const onCouponAction = (coupon: UserCoupon) => uni.navigateTo({ url: '/pages/coupon/code?code=' + encodeURIComponent(coupon.code) });
const goToAlliance = () => uni.navigateTo({ url: '/pages/benefit/alliance' });

onPullDownRefresh(async () => {
  await loadCoupons();
  uni.stopPullDownRefresh();
});

onShareAppMessage(() => ({
  title: '竹山街坊惠商圈联盟卡券，到店出示享专属好礼！',
  path: '/pages/benefit/alliance'
}));
</script>

<style scoped>
.mine-coupons-page { min-height: 100vh; padding-bottom: 60rpx; background: var(--zs-canvas); }
.page-hero { padding: 34rpx 30rpx 51rpx; border-radius: 0 0 34rpx 34rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 7rpx; font-size: 40rpx; font-weight: 800; }
.hero-subtitle { margin-top: 8rpx; color: #d2e8d9; font-size: 22rpx; }
.hero-stats-row { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 12rpx; margin-top: 26rpx; }
.hero-count { display: inline-flex; align-items: baseline; gap: 7rpx; color: #e4f4e7; font-size: 22rpx; }
.hero-count text { color: #fff; font-size: 45rpx; font-weight: 800; line-height: 1; }
.hero-saved-badge { padding: 8rpx 16rpx; border-radius: 24rpx; background: rgba(255,255,255,.14); color: #fff4d1; font-size: 20rpx; font-weight: 600; }
.expiring-warn { color: #ffd089; font-weight: 700; }

.content { position: relative; margin: -17rpx 20rpx 0; }
.tab-header { display: flex; gap: 7rpx; padding: 9rpx; border-radius: 18rpx; background: #fff; box-shadow: 0 5rpx 17rpx rgba(19,53,35,.05); }
.tab-btn { flex: 1; padding: 17rpx 4rpx; border-radius: 12rpx; color: var(--zs-muted); font-size: 22rpx; text-align: center; white-space: nowrap; }
.tab-btn.active { color: var(--zs-green); background: var(--zs-green-soft); font-weight: 750; }

.cat-filter-scroll { width: 100%; white-space: nowrap; margin-top: 16rpx; }
.cat-filter-row { display: inline-flex; gap: 12rpx; padding: 4rpx 0; }
.cat-chip { padding: 10rpx 20rpx; border-radius: 28rpx; background: #fff; border: 1rpx solid var(--zs-border); color: var(--zs-muted); font-size: 21rpx; }
.cat-chip.active { background: var(--zs-green-soft); border-color: var(--zs-green); color: var(--zs-green); font-weight: 700; }

.list-container { padding-top: 20rpx; }
.coupon-item-wrap { margin-bottom: 18rpx; }
.expiring-bar { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 20rpx; margin-bottom: -10rpx; border-radius: 14rpx 14rpx 0 0; background: linear-gradient(90deg, #fff1eb, #fff7ed); border: 1rpx solid #fcd5c4; border-bottom: 0; }
.expiring-left { font-size: 20rpx; font-weight: 700; color: #c74714; }
.expiring-go { font-size: 20rpx; font-weight: 700; color: #e05d26; }

.empty-wrap { display: flex; align-items: center; flex-direction: column; padding: 75rpx 25rpx; border-radius: 20rpx; background: #fff; }
.empty-icon { width: 110rpx; height: 110rpx; display: flex; align-items: center; justify-content: center; border-radius: 28rpx; background: var(--zs-green-soft); }
.empty-icon image { width: 63rpx; height: 63rpx; }
.empty-title { margin-top: 23rpx; color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.empty-text { margin-top: 9rpx; color: var(--zs-muted); font-size: 22rpx; text-align: center; }
.empty-action-btn { margin-top: 26rpx; padding: 12rpx 32rpx; border: 1.5rpx solid var(--zs-green); border-radius: 30rpx; color: var(--zs-green); font-size: 23rpx; font-weight: 700; background: var(--zs-green-soft); }
</style>
