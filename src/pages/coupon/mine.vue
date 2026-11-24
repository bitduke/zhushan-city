<template>
  <view class="mine-coupons-page">
    <view class="page-hero">
      <text class="hero-kicker">MY BENEFITS</text>
      <view class="hero-title">我的卡券包</view>
      <view class="hero-subtitle">已领福利都在这里，到店出示即可使用</view>
      <view class="hero-count"><text>{{ unusedList.length }}</text> 张待使用卡券</view>
    </view>

    <view class="content">
      <view class="tab-header">
        <view class="tab-btn" :class="{ active: currentTab === 'UNUSED' }" @tap="currentTab = 'UNUSED'">待使用 {{ unusedList.length }}</view>
        <view class="tab-btn" :class="{ active: currentTab === 'USED' }" @tap="currentTab = 'USED'">已核销</view>
        <view class="tab-btn" :class="{ active: currentTab === 'EXPIRED' }" @tap="currentTab = 'EXPIRED'">已过期</view>
      </view>
      <view class="list-container">
        <view v-if="displayList.length === 0" class="empty-wrap">
          <view class="empty-icon"><image :src="'/static/icons/ticket.png'" mode="aspectFit" /></view>
          <view class="empty-title">暂无相关卡券</view>
          <text class="empty-text">到参与门店扫描福利码并领取后，卡券会保存在这里。</text>
        </view>
        <CouponCard
          v-for="item in displayList"
          :key="item._id"
          :coupon="item"
          :is-claimed="true"
          @action="onCouponAction(item)"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getMyCoupons } from '@/api/coupon';
import CouponCard from '@/components/CouponCard.vue';

const coupons = ref<any[]>([]);
const currentTab = ref<'UNUSED' | 'USED' | 'EXPIRED'>('UNUSED');
const loadCoupons = async () => {
  try { coupons.value = await getMyCoupons(); }
  catch (err) { console.error('Failed to load my coupons:', err); }
};
onShow(loadCoupons);
const unusedList = computed(() => coupons.value.filter(c => c.status === 'UNUSED'));
const usedList = computed(() => coupons.value.filter(c => c.status === 'USED'));
const expiredList = computed(() => coupons.value.filter(c => c.status === 'EXPIRED'));
const displayList = computed(() => {
  if (currentTab.value === 'UNUSED') return unusedList.value;
  if (currentTab.value === 'USED') return usedList.value;
  return expiredList.value;
});
const onCouponAction = (coupon: any) => uni.navigateTo({ url: '/pages/coupon/code?code=' + encodeURIComponent(coupon.code) });
</script>

<style scoped>
.mine-coupons-page { min-height: 100vh; padding-bottom: 60rpx; background: var(--zs-canvas); }
.page-hero { padding: 34rpx 30rpx 51rpx; border-radius: 0 0 34rpx 34rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 7rpx; font-size: 40rpx; font-weight: 800; }
.hero-subtitle { margin-top: 8rpx; color: #d2e8d9; font-size: 22rpx; }
.hero-count { display: inline-flex; align-items: baseline; gap: 7rpx; margin-top: 29rpx; color: #e4f4e7; font-size: 22rpx; }
.hero-count text { color: #fff; font-size: 45rpx; font-weight: 800; line-height: 1; }
.content { position: relative; margin: -17rpx 20rpx 0; }
.tab-header { display: flex; gap: 7rpx; padding: 9rpx; border-radius: 18rpx; background: #fff; box-shadow: 0 5rpx 17rpx rgba(19,53,35,.05); }
.tab-btn { flex: 1; padding: 17rpx 4rpx; border-radius: 12rpx; color: var(--zs-muted); font-size: 22rpx; text-align: center; white-space: nowrap; }
.tab-btn.active { color: var(--zs-green); background: var(--zs-green-soft); font-weight: 750; }
.list-container { padding-top: 24rpx; }
.empty-wrap { display: flex; align-items: center; flex-direction: column; padding: 75rpx 25rpx; border-radius: 20rpx; background: #fff; }
.empty-icon { width: 110rpx; height: 110rpx; display: flex; align-items: center; justify-content: center; border-radius: 28rpx; background: var(--zs-green-soft); }
.empty-icon image { width: 63rpx; height: 63rpx; }
.empty-title { margin-top: 23rpx; color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.empty-text { margin-top: 9rpx; color: var(--zs-muted); font-size: 22rpx; }
</style>
