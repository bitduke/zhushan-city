<template>
  <view class="shop-card" @tap="$emit('click')">
    <image class="shop-avatar" :src="shop.avatar" mode="aspectFill" />
    <view class="shop-content">
      <view class="shop-top">
        <text class="shop-name">{{ shop.name }}</text>
        <text class="distance" v-if="shop.distance">{{ shop.distance }}</text>
      </view>
      <view class="shop-meta">
        <text class="category">{{ shop.category_name }}</text>
        <text class="town">{{ shop.town }}</text>
      </view>
      <view class="address-text">{{ shop.address }}</view>
      <view class="coupon-tag" v-if="shop.hot_coupon">
        <text class="tag-icon">券</text>
        <text class="tag-text">{{ shop.hot_coupon }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  shop: any;
}>();

defineEmits(['click']);
</script>

<style scoped>
.shop-card {
  display: flex;
  background: #ffffff;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  gap: 20rpx;
}

.shop-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #F3F4F6;
}

.shop-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.shop-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shop-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #111827;
}

.distance {
  font-size: 20rpx;
  color: #2563EB;
  background: #EFF6FF;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.shop-meta {
  display: flex;
  gap: 12rpx;
  margin-top: 4rpx;
}

.category, .town {
  font-size: 20rpx;
  color: #6B7280;
}

.address-text {
  font-size: 20rpx;
  color: #9CA3AF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 440rpx;
}

.coupon-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #FEF2F2;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  margin-top: 6rpx;
}

.tag-icon {
  background: #DC2626;
  color: #ffffff;
  font-size: 18rpx;
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
  font-weight: bold;
}

.tag-text {
  font-size: 20rpx;
  color: #DC2626;
  font-weight: 500;
}
</style>
