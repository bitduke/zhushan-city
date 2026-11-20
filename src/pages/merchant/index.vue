<template>
  <view class="merchant-page">
    <!-- 商家头部名片 -->
    <view class="merchant-card" v-if="merchant">
      <view class="info-row">
        <image class="shop-avatar" :src="merchant.avatar" mode="aspectFill" />
        <view class="shop-meta">
          <view class="shop-name-wrap">
            <text class="shop-name">{{ merchant.name }}</text>
            <text class="verified-tag">已认证联盟店</text>
          </view>
          <text class="shop-town">📍 {{ merchant.town }} · {{ merchant.category_name }}</text>
        </view>
      </view>

      <view class="qr-action-bar">
        <text class="qr-text">本店专属福利码已激活</text>
        <button class="preview-btn" @tap="previewBenefitPage">预览顾客端</button>
      </view>
    </view>

    <!-- 今日核心数据看板 (基于 PRD 真实指标) -->
    <view class="board-card">
      <view class="board-header">
        <text class="board-title">📊 今日经营数据</text>
        <text class="board-date">实时更新</text>
      </view>

      <view class="data-grid">
        <view class="data-item">
          <text class="num">45</text>
          <text class="label">进店扫码人数</text>
        </view>
        <view class="data-item">
          <text class="num highlight">18</text>
          <text class="label">当场核销量</text>
        </view>
        <view class="data-item">
          <text class="num blue">12</text>
          <text class="label">帮他店引流数</text>
        </view>
        <view class="data-item">
          <text class="num green">3</text>
          <text class="label">带来到店新客</text>
        </view>
      </view>
    </view>

    <!-- 核心操作功能区 -->
    <view class="action-grid">
      <view class="menu-card primary-action" @tap="goToVerify">
        <text class="menu-icon">📷</text>
        <view class="menu-text">
          <text class="menu-title">扫码 / 输码核销</text>
          <text class="menu-desc">验证顾客优惠券并出库</text>
        </view>
      </view>

      <view class="menu-card" @tap="goToRanking">
        <text class="menu-icon">🏆</text>
        <view class="menu-text">
          <text class="menu-title">商圈引流榜</text>
          <text class="menu-desc">查看带客排行与合作机会</text>
        </view>
      </view>

      <view class="menu-card" @tap="goToAppointment">
        <text class="menu-icon">📝</text>
        <view class="menu-text">
          <text class="menu-title">预约处理</text>
          <text class="menu-desc">接单确认与到店核验</text>
        </view>
      </view>

      <view class="menu-card" @tap="goToCooperation">
        <text class="menu-icon">🤝</text>
        <view class="menu-text">
          <text class="menu-title">拓客合作管理</text>
          <text class="menu-desc">购买推广 / 查看对账单</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMerchantStore } from '@/store/merchant';

const merchantStore = useMerchantStore();
const merchant = computed(() => merchantStore.currentMerchant);

const previewBenefitPage = () => {
  uni.navigateTo({
    url: `/pages/benefit/shop?shopId=${merchant.value?._id}`
  });
};

const goToVerify = () => {
  uni.navigateTo({ url: '/pages/merchant/verify' });
};

const goToRanking = () => {
  uni.navigateTo({ url: '/pages/merchant/ranking' });
};

const goToAppointment = () => {
  uni.navigateTo({ url: '/pages/merchant/appointment' });
};

const goToCooperation = () => {
  uni.showToast({ title: '拓客合作对账单已锁定', icon: 'none' });
};
</script>

<style scoped>
.merchant-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
}

.merchant-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.info-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.shop-avatar {
  width: 110rpx;
  height: 110rpx;
  border-radius: 16rpx;
  background: #E5E7EB;
}

.shop-meta {
  flex: 1;
}

.shop-name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.shop-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #111827;
}

.verified-tag {
  background: #D1FAE5;
  color: #065F46;
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}

.shop-town {
  font-size: 22rpx;
  color: #6B7280;
  margin-top: 6rpx;
  display: block;
}

.qr-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F3F4F6;
}

.qr-text {
  font-size: 22rpx;
  color: #4B5563;
}

.preview-btn {
  background: #EFF6FF;
  color: #2563EB;
  font-size: 22rpx;
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  font-weight: 500;
  border: none;
}

.board-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.board-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #111827;
}

.board-date {
  font-size: 20rpx;
  color: #9CA3AF;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  text-align: center;
}

.data-item {
  display: flex;
  flex-direction: column;
}

.num {
  font-size: 40rpx;
  font-weight: 900;
  color: #111827;
}

.num.highlight {
  color: #DC2626;
}

.num.blue {
  color: #2563EB;
}

.num.green {
  color: #10B981;
}

.label {
  font-size: 20rpx;
  color: #6B7280;
  margin-top: 8rpx;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.menu-card {
  background: #ffffff;
  padding: 28rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.primary-action {
  background: linear-gradient(135deg, #1E3A8A, #2563EB);
  color: #ffffff;
}

.primary-action .menu-title {
  color: #ffffff;
}

.primary-action .menu-desc {
  color: rgba(255, 255, 255, 0.8);
}

.menu-icon {
  font-size: 48rpx;
}

.menu-text {
  flex: 1;
}

.menu-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #111827;
  display: block;
}

.menu-desc {
  font-size: 20rpx;
  color: #9CA3AF;
  margin-top: 4rpx;
  display: block;
}
</style>
