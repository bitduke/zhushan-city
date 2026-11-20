<template>
  <view class="mine-coupons-page">
    <view class="tab-header">
      <view 
        class="tab-btn" 
        :class="{ active: currentTab === 'UNUSED' }" 
        @tap="currentTab = 'UNUSED'"
      >
        待使用 ({{ unusedList.length }})
      </view>
      <view 
        class="tab-btn" 
        :class="{ active: currentTab === 'USED' }" 
        @tap="currentTab = 'USED'"
      >
        已核销
      </view>
      <view 
        class="tab-btn" 
        :class="{ active: currentTab === 'EXPIRED' }" 
        @tap="currentTab = 'EXPIRED'"
      >
        已过期
      </view>
    </view>

    <view class="list-container">
      <view v-if="displayList.length === 0" class="empty-wrap">
        <text class="empty-icon">🏷️</text>
        <text class="empty-text">暂无相关卡券</text>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getMyCoupons } from '@/api/coupon';
import CouponCard from '@/components/CouponCard.vue';

const coupons = ref<any[]>([]);
const currentTab = ref<'UNUSED' | 'USED' | 'EXPIRED'>('UNUSED');

onMounted(async () => {
  await loadCoupons();
});

const loadCoupons = async () => {
  try {
    coupons.value = await getMyCoupons();
  } catch (err) {
    console.error('Failed to load my coupons:', err);
  }
};

const unusedList = computed(() => coupons.value.filter(c => c.status === 'UNUSED'));
const usedList = computed(() => coupons.value.filter(c => c.status === 'USED'));
const expiredList = computed(() => coupons.value.filter(c => c.status === 'EXPIRED'));

const displayList = computed(() => {
  if (currentTab.value === 'UNUSED') return unusedList.value;
  if (currentTab.value === 'USED') return usedList.value;
  return expiredList.value;
});

const onCouponAction = (coupon: any) => {
  uni.navigateTo({
    url: `/pages/coupon/code?code=${coupon.code}`
  });
};
</script>

<style scoped>
.mine-coupons-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding-bottom: 60rpx;
}

.tab-header {
  display: flex;
  background: #ffffff;
  padding: 16rpx 20rpx;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E7EB;
}

.tab-btn {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #6B7280;
  padding: 14rpx 0;
  font-weight: 500;
  position: relative;
}

.tab-btn.active {
  color: #2563EB;
  font-weight: bold;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  right: 25%;
  height: 4rpx;
  background: #2563EB;
  border-radius: 2rpx;
}

.list-container {
  padding: 24rpx;
}

.empty-wrap {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
}
</style>
