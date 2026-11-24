<template>
  <view class="ranking-page">
    <view class="header-box">
      <text class="header-kicker">LOCAL PARTNERS</text>
      <view class="title">竹山商圈引流榜</view>
      <view class="desc">最近 30 天 · 仅统计双方确认的有效新客；少于 5 次领券不生成名次</view>
    </view>

    <view class="rank-item" v-if="rankingList.length === 0">暂无经核对的引流结果，暂不生成名次。</view>

    <view class="rank-list">
      <view 
        class="rank-item" 
        v-for="(item, idx) in rankingList" 
        :key="item.merchant_id"
      >
        <view class="rank-idx" :class="'top-' + (idx + 1)">
          {{ item.sample_size >= 5 ? idx + 1 : '—' }}
        </view>

        <image v-if="hasAvatar(item)" class="rank-avatar" :src="item.avatar" mode="aspectFill" @error="failedAvatars[item.merchant_id] = true" />
        <view v-else class="rank-avatar avatar-fallback"><image :src="'/static/icons/store.png'" mode="aspectFit" /></view>

        <view class="rank-info">
          <view class="name-row">
            <text class="rank-name">{{ item.merchant_name }}</text>
            <text class="new-tag" v-if="item.is_new_partner">样本不足</text>
          </view>
          <view class="cat-row">
            <text class="cat">{{ item.town }} · {{ item.category_name }}</text>
            <text class="coop-count">已合作 {{ item.coop_merchants_count }} 家</text>
          </view>
        </view>

        <view class="rank-data">
          <view class="data-val">{{ item.total_brought_guests }} <text class="sub">人</text></view>
          <view class="rate">{{ item.sample_size >= 5 ? `确认转化率 ${item.conversion_rate}%（${item.sample_size} 次领券）` : `${item.sample_size} 次领券，暂不计算转化率` }}</view>
        </view>
      </view>
    </view>

    <view class="rule-footer">
      <text class="rule-tip">扫码、领券和核销分别记录；有效新客须由合作双方核对。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getPromoterRanking } from '@/api/ranking';

const rankingList = ref<any[]>([]);
const failedAvatars = ref<Record<string, boolean>>({});
const hasAvatar = (item: any) => !!item.avatar && !item.avatar.includes('picsum.photos') && !failedAvatars.value[item.merchant_id];

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
  background-color: var(--zs-canvas);
  padding: 24rpx;
}

.header-box {
  background: linear-gradient(135deg, var(--zs-green-dark), var(--zs-green));
  color: #ffffff;
  padding: 32rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}
.header-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }

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
  flex-wrap: wrap;
  border: 1rpx solid var(--zs-border);
  box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035);
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
.avatar-fallback { display: flex; align-items: center; justify-content: center; background: var(--zs-green-soft); }
.avatar-fallback image { width: 51rpx; height: 51rpx; }

.rank-info {
  flex: 1;
  min-width: 0;
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
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
  width: 100%;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--zs-border);
}

.data-val {
  font-size: 32rpx;
  font-weight: 900;
  color: var(--zs-green);
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
