<template>
  <view class="user-page">
    <view class="user-card" v-if="profile">
      <image class="avatar" :src="profile.avatar" mode="aspectFill" />
      <view class="user-info">
        <view class="nickname">{{ profile.nickname }}</view>
        <view class="user-sub">📍 常用区域：{{ profile.town || '竹山县城关镇' }}</view>
      </view>
    </view>

    <view class="menu-group">
      <view class="menu-item" @tap="goToCoupons">
        <text class="menu-icon">🏷️</text>
        <text class="menu-label">我的卡券包</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="goToPublish">
        <text class="menu-icon">✍️</text>
        <text class="menu-label">发布便民信息</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="menu-group">
      <view class="menu-item" @tap="goToMerchant">
        <text class="menu-icon">🏪</text>
        <text class="menu-label">商家工作台 (核销与看板)</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="applyMerchant">
        <text class="menu-icon">📝</text>
        <text class="menu-label">商家联盟入驻申请</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="menu-group">
      <view class="menu-item" @tap="showPrivacy">
        <text class="menu-icon">📄</text>
        <text class="menu-label">用户隐私协议与信息安全</text>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @tap="callService">
        <text class="menu-icon">☎️</text>
        <text class="menu-label">平台客服热线</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="version-text">竹山同城 v1.0 · 本地便民与商家联盟平台</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const profile = computed(() => userStore.profile);

const goToCoupons = () => {
  uni.switchTab({ url: '/pages/coupon/mine' });
};

const goToPublish = () => {
  uni.navigateTo({ url: '/pages/info/publish' });
};

const goToMerchant = () => {
  uni.switchTab({ url: '/pages/merchant/index' });
};

const applyMerchant = () => {
  uni.showModal({
    title: '商家入驻申请',
    content: '欢迎竹山各乡镇优质实体门店加入商圈联盟，请联系平台专员微信登记入驻并免费生成专属福利码。',
    showCancel: false
  });
};

const showPrivacy = () => {
  uni.showModal({
    title: '个人信息保护合规说明',
    content: '竹山同城平台严格遵守《个人信息保护法》，仅在领取优惠券与发布信息时申请必要手机号与授权，不向第三方违规转让客户个人数据。',
    showCancel: false
  });
};

const callService = () => {
  uni.showToast({ title: '客服工作时间: 09:00-18:00', icon: 'none' });
};
</script>

<style scoped>
.user-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
}

.user-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: #E5E7EB;
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 32rpx;
  font-weight: bold;
  color: #111827;
}

.user-sub {
  font-size: 22rpx;
  color: #6B7280;
  margin-top: 8rpx;
}

.menu-group {
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #F3F4F6;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 32rpx;
  margin-right: 18rpx;
}

.menu-label {
  flex: 1;
  font-size: 26rpx;
  color: #1F2937;
  font-weight: 500;
}

.menu-arrow {
  font-size: 32rpx;
  color: #9CA3AF;
}

.version-text {
  text-align: center;
  font-size: 20rpx;
  color: #9CA3AF;
  margin-top: 40rpx;
}
</style>
