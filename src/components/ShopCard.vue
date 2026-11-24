<template>
  <view class="shop-card" @tap="$emit('click')">
    <view class="shop-visual">
      <image v-if="showImage" class="shop-avatar" :src="shop.avatar" mode="aspectFill" @error="imageFailed = true" />
      <view v-else class="shop-fallback"><image :src="'/static/icons/store.png'" mode="aspectFit" /></view>
    </view>
    <view class="shop-content">
      <view class="shop-top">
        <text class="shop-name">{{ shop.name }}</text>
        <text class="distance" v-if="shop.distance">{{ shop.distance }}</text>
      </view>
      <view class="shop-meta">{{ shop.category_name }} <text>·</text> {{ shop.town }}</view>
      <view class="address-text">{{ shop.address }}</view>
      <view class="shop-bottom">
        <text class="coupon-tag" v-if="shop.hot_coupon">{{ shop.hot_coupon }}</text>
        <text v-else class="shop-hours">{{ shop.business_hours ? '营业 ' + shop.business_hours : '查看门店详情' }}</text>
        <text class="open-link">进店看看 ›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
const props = defineProps<{ shop: any }>();
defineEmits(['click']);
const imageFailed = ref(false);
const showImage = computed(() => !!props.shop.avatar && !props.shop.avatar.includes('picsum.photos') && !imageFailed.value);
</script>

<style scoped>
.shop-card { display: flex; gap: 18rpx; padding: 17rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(19,53,35,.035); }
.shop-visual { width: 146rpx; height: 146rpx; flex-shrink: 0; overflow: hidden; border-radius: 13rpx; background: #e7f1e8; }
.shop-avatar { width: 100%; height: 100%; }
.shop-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#d9ecde,#f3f1e8); }
.shop-fallback image { width: 65rpx; height: 65rpx; opacity: .65; }
.shop-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.shop-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 7rpx; }
.shop-name { color: var(--zs-ink); font-size: 27rpx; font-weight: 750; line-height: 1.3; }
.distance { color: var(--zs-green); font-size: 19rpx; white-space: nowrap; }
.shop-meta { margin-top: 9rpx; color: var(--zs-green); font-size: 20rpx; }
.shop-meta text { margin: 0 3rpx; color: #a9b9ad; }
.address-text { margin-top: 8rpx; color: var(--zs-muted); font-size: 20rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shop-bottom { display: flex; justify-content: space-between; align-items: center; gap: 8rpx; margin-top: auto; padding-top: 12rpx; }
.coupon-tag, .shop-hours { min-width: 0; flex: 1; color: var(--zs-orange); font-size: 19rpx; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.shop-hours { color: #8d9b8e; }
.open-link { color: var(--zs-green); font-size: 19rpx; font-weight: 700; white-space: nowrap; }
</style>
