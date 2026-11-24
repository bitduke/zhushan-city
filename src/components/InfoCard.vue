<template>
  <view class="info-card" @tap="$emit('click')">
    <view class="card-head">
      <view class="tag-group">
        <text class="category-tag">{{ info.category_name }}</text>
        <text class="town-tag">{{ info.town }}</text>
      </view>
      <text class="time-text">{{ formatTime(info.created_at) }}</text>
    </view>

    <view class="card-body">
      <view class="main-info">
        <view class="title">{{ info.title }}</view>
        <text class="price" v-if="info.price_desc || info.price">{{ info.price_desc || '¥' + info.price }}</text>
      </view>
      <image
        v-if="showImage"
        class="thumb-img"
        :src="info.images[0]"
        mode="aspectFill"
        @error="imageFailed = true"
      />
    </view>

    <view class="card-foot">
      <view class="author-info">
        <text class="author-name">{{ info.author_name || '竹山居民' }}</text>
        <text class="view-count">{{ info.view_count || 0 }} 人看过</text>
      </view>
      <button v-if="info.contact_consent && info.contact_phone" class="call-btn" @tap.stop="makeCall">联系对方</button>
      <text v-else class="contact-hint">查看详情 <text>›</text></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ info: any }>();
defineEmits(['click']);
const imageFailed = ref(false);
const showImage = computed(() => {
  const src = props.info.images?.[0];
  return !!src && !src.includes('picsum.photos') && !imageFailed.value;
});
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const makeCall = () => {
  if (!props.info.contact_consent || !props.info.contact_phone) {
    uni.showToast({ title: '暂未提供电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({ phoneNumber: props.info.contact_phone });
};
</script>

<style scoped>
.info-card { padding: 23rpx 24rpx 18rpx; border: 1rpx solid #e9ede7; border-radius: 20rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(19,53,35,.035); }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 10rpx; }
.tag-group { display: flex; gap: 9rpx; align-items: center; min-width: 0; }
.category-tag, .town-tag { padding: 6rpx 12rpx; border-radius: 7rpx; font-size: 19rpx; white-space: nowrap; }
.category-tag { color: var(--zs-green); background: var(--zs-green-soft); font-weight: 700; }
.town-tag { color: #738377; background: #f3f5f1; }
.time-text { color: #9aa69e; font-size: 19rpx; white-space: nowrap; }
.card-body { display: flex; align-items: flex-start; justify-content: space-between; gap: 17rpx; padding: 20rpx 0 17rpx; }
.main-info { min-width: 0; flex: 1; }
.title { color: var(--zs-ink); font-size: 27rpx; font-weight: 700; line-height: 1.42; }
.price { display: block; margin-top: 15rpx; color: var(--zs-orange); font-size: 28rpx; font-weight: 800; }
.thumb-img { width: 140rpx; height: 120rpx; flex-shrink: 0; border-radius: 12rpx; background: #eef2ed; }
.card-foot { display: flex; justify-content: space-between; align-items: center; gap: 12rpx; padding-top: 14rpx; border-top: 1rpx solid #edf0eb; }
.author-info { display: flex; align-items: center; gap: 12rpx; min-width: 0; }
.author-name { display: block; max-width: 220rpx; color: #607267; font-size: 20rpx; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.view-count { color: #a0aaa2; font-size: 19rpx; white-space: nowrap; }
.contact-hint { color: var(--zs-green); font-size: 20rpx; font-weight: 650; white-space: nowrap; }
.contact-hint text { font-size: 27rpx; }
.call-btn { margin: 0; padding: 0 18rpx; height: 49rpx; line-height: 49rpx; border-radius: 25rpx; background: var(--zs-green-soft); color: var(--zs-green); font-size: 20rpx; font-weight: 700; white-space: nowrap; }
</style>
