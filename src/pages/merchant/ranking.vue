<template>
  <view class="ranking-page">
    <view class="header-box">
      <view class="title">🏆 竹山商圈引流贡献榜</view>
      <view class="desc">基于近 30 天真实跨店核销新客数据 · 每日凌晨结算更新</view>
    </view>

    <view class="rank-list">
      <view 
        class="rank-item" 
        v-for="(item, idx) in rankingList" 
        :key="item.merchant_id"
      >
        <view class="rank-idx" :class="'top-' + (idx + 1)">
          {{ idx + 1 }}
        </view>

        <image class="rank-avatar" :src="item.avatar" mode="aspectFill" />

        <view class="rank-info">
          <view class="name-row">
            <text class="rank-name">{{ item.merchant_name }}</text>
            <text class="new-tag" v-if="item.is_new_partner">新上榜</text>
          </view>
          <view class="cat-row">
            <text class="cat">{{ item.town }} · {{ item.category_name }}</text>
            <text class="coop-count">已合作 {{ item.coop_merchants_count }} 家</text>
          </view>
        </view>

        <view class="rank-data">
          <view class="data-val">{{ item.total_brought_guests }} <text class="sub">人</text></view>
          <view class="rate">带客转化率 {{ item.conversion_rate }}%</view>
        </view>
      </view>
    </view>

    <view class="rule-footer">
      <text class="rule-tip">ℹ️ 统计规则：严格依据顾客出示合作券并由目标店实际核销完成为有效引流新客，自刷与老客经核对已剔除。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getPromoterRanking } from '@/api/ranking';

const rankingList = ref<any[]>([]);

onMounted(async () => {
  try {
    rankingList.value = await getPromoterRanking();
  } catch (err) {
    console.error('Failed to load ranking:', err);
  }
});
</script>

<style scoped>
.ranking-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
}

.header-box {
  background: linear-gradient(135deg, #1E3A8A, #2563EB);
  color: #ffffff;
  padding: 32rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
}

.desc {
  font-size: 20rpx;
  opacity: 0.85;
  margin-top: 8rpx;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rank-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.rank-idx {
  width: 50rpx;
  height: 50rpx;
  border-radius: 25rpx;
  background: #F3F4F6;
  color: #6B7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: bold;
}

.top-1 {
  background: #FEF3C7;
  color: #D97706;
}

.top-2 {
  background: #E5E7EB;
  color: #374151;
}

.top-3 {
  background: #FEE2E2;
  color: #DC2626;
}

.rank-avatar {
  width: 90rpx;
  height: 90rpx;
  border-radius: 12rpx;
  background: #E5E7EB;
}

.rank-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.rank-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #111827;
}

.new-tag {
  background: #10B981;
  color: #ffffff;
  font-size: 16rpx;
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
}

.cat-row {
  display: flex;
  gap: 12rpx;
  margin-top: 6rpx;
}

.cat, .coop-count {
  font-size: 20rpx;
  color: #6B7280;
}

.rank-data {
  text-align: right;
}

.data-val {
  font-size: 32rpx;
  font-weight: 900;
  color: #2563EB;
}

.sub {
  font-size: 20rpx;
  color: #4B5563;
  font-weight: normal;
}

.rate {
  font-size: 18rpx;
  color: #059669;
  margin-top: 4rpx;
}

.rule-footer {
  padding: 30rpx 10rpx;
  text-align: center;
}

.rule-tip {
  font-size: 20rpx;
  color: #9CA3AF;
  line-height: 1.5;
}
</style>
