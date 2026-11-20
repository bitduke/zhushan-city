<template>
  <view class="detail-page" v-if="info">
    <!-- 头部类别与状态 -->
    <view class="header-card">
      <view class="cat-bar">
        <text class="cat-tag">{{ info.category_name }}</text>
        <text class="town-tag">📍 {{ info.town }}</text>
        <text class="time-tag">发布时间：{{ info.created_at }}</text>
      </view>

      <view class="title">{{ info.title }}</view>

      <view class="price-box" v-if="info.price_desc || info.price">
        <text class="price-num">{{ info.price_desc || '¥' + info.price }}</text>
      </view>
    </view>

    <!-- 图文正文 -->
    <view class="content-card">
      <view class="sec-label">详细说明</view>
      <view class="body-text">{{ info.content || '房源直租，采光好配套齐全，随时可看房。' }}</view>

      <view class="images-box" v-if="info.images && info.images.length > 0">
        <image 
          class="detail-img" 
          v-for="(img, idx) in info.images" 
          :key="idx" 
          :src="img" 
          mode="widthFix" 
        />
      </view>
    </view>

    <!-- 防诈与责任安全声明 -->
    <view class="safety-banner">
      <text class="safe-icon">🛡️</text>
      <text class="safe-desc">安全防诈提醒：平台仅提供便民信息展示，线下看房或交易请务必核实对方证件与实物，切勿提前转账定金或押金！</text>
    </view>

    <!-- 底部固定联系工具栏 -->
    <view class="bottom-bar">
      <view class="author-wrap">
        <text class="author-label">发布方：</text>
        <text class="author-name">{{ info.author_name }}</text>
      </view>

      <view class="act-wrap">
        <button class="report-btn" @tap="handleReport">举报</button>
        <button class="call-action-btn" @tap="makeCall">
          <text class="call-ico">📞</text> 拨打电话
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import homeMock from '@/mock/home.json';

const info = ref<any>(null);

onLoad((options) => {
  const id = options?.id || 'info_101';
  info.value = homeMock.recent_infos.find(i => i._id === id) || homeMock.recent_infos[0];
});

const makeCall = () => {
  if (info.value?.contact_phone) {
    uni.makePhoneCall({ phoneNumber: info.value.contact_phone });
  }
};

const handleReport = () => {
  uni.showActionSheet({
    itemList: ['虚假信息 / 已售已租', '涉诈或要求提前转账', '联系方式无效', '其他违规'],
    success: () => {
      uni.showToast({ title: '举报已受理，感谢反馈', icon: 'success' });
    }
  });
};
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.header-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.cat-bar {
  display: flex;
  gap: 12rpx;
  align-items: center;
  margin-bottom: 16rpx;
}

.cat-tag {
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

.time-tag {
  font-size: 20rpx;
  color: #9CA3AF;
  margin-left: auto;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #111827;
  line-height: 1.4;
  margin-bottom: 20rpx;
}

.price-box {
  background: #FEF2F2;
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.price-num {
  font-size: 36rpx;
  font-weight: 900;
  color: #EF4444;
}

.content-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.sec-label {
  font-size: 26rpx;
  font-weight: bold;
  color: #374151;
  margin-bottom: 16rpx;
}

.body-text {
  font-size: 26rpx;
  color: #4B5563;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.images-box {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.detail-img {
  width: 100%;
  border-radius: 12rpx;
}

.safety-banner {
  background: #FEF3C7;
  padding: 20rpx;
  border-radius: 12rpx;
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
}

.safe-icon {
  font-size: 28rpx;
}

.safe-desc {
  font-size: 20rpx;
  color: #92400E;
  line-height: 1.4;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 20rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
  border-top: 1rpx solid #E5E7EB;
}

.author-wrap {
  display: flex;
  flex-direction: column;
}

.author-label {
  font-size: 18rpx;
  color: #9CA3AF;
}

.author-name {
  font-size: 24rpx;
  font-weight: bold;
  color: #1F2937;
}

.act-wrap {
  display: flex;
  gap: 16rpx;
}

.report-btn {
  background: #F3F4F6;
  color: #6B7280;
  font-size: 22rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 20rpx;
  border-radius: 32rpx;
  border: none;
}

.call-action-btn {
  background: #10B981;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: bold;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  border: none;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.call-ico {
  font-size: 28rpx;
}
</style>
