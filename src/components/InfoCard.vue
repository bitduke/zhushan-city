<template>
  <view class="info-card" @tap="$emit('click')">
    <view class="header-row">
      <view class="tag-group">
        <text class="category-tag">{{ info.category_name }}</text>
        <text class="town-tag">{{ info.town }}</text>
      </view>
      <text class="time-text">{{ info.created_at }}</text>
    </view>

    <view class="content-body">
      <view class="main-info">
        <view class="title">{{ info.title }}</view>
        <view class="price-row" v-if="info.price_desc || info.price">
          <text class="price-val">{{ info.price_desc || '¥' + info.price }}</text>
        </view>
      </view>

      <image 
        v-if="info.images && info.images.length > 0" 
        class="thumb-img" 
        :src="info.images[0]" 
        mode="aspectFill" 
      />
    </view>

    <view class="footer-row">
      <view class="author-info">
        <text class="author-name">{{ info.author_name }}</text>
        <text class="view-count">{{ info.view_count || 1 }} 人浏览</text>
      </view>

      <button class="call-btn" @tap.stop="makeCall">
        <text class="call-icon">📞</text> 拨打电话
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  info: any;
}>();

defineEmits(['click']);

const makeCall = () => {
  if (!props.info.contact_phone) {
    uni.showToast({ title: '暂未提供电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({
    phoneNumber: props.info.contact_phone
  });
};
</script>

<style scoped>
.info-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.tag-group {
  display: flex;
  gap: 10rpx;
}

.category-tag {
  background: #EFF6FF;
  color: #2563EB;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.town-tag {
  background: #F3F4F6;
  color: #4B5563;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.time-text {
  font-size: 20rpx;
  color: #9CA3AF;
}

.content-body {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.main-info {
  flex: 1;
}

.title {
  font-size: 28rpx;
  color: #111827;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 12rpx;
}

.price-row {
  margin-bottom: 8rpx;
}

.price-val {
  font-size: 32rpx;
  font-weight: bold;
  color: #EF4444;
}

.thumb-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 10rpx;
  background: #F3F4F6;
}

.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F3F4F6;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.author-name {
  font-size: 22rpx;
  color: #4B5563;
}

.view-count {
  font-size: 20rpx;
  color: #9CA3AF;
}

.call-btn {
  background: #10B981;
  color: #ffffff;
  font-size: 22rpx;
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  border: none;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
</style>
