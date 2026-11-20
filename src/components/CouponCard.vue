<template>
  <view class="coupon-card" :class="{ 'used-or-expired': isInvalid }">
    <view class="left-section">
      <view class="amount-wrap">
        <text class="symbol" v-if="coupon.discount_amount">¥</text>
        <text class="amount">{{ coupon.discount_amount || '特惠' }}</text>
      </view>
      <text class="condition">{{ conditionText }}</text>
    </view>

    <view class="middle-section">
      <view class="badge-row">
        <text class="usage-badge" :class="usageBadgeClass">{{ usageBadgeText }}</text>
        <text class="source-badge" v-if="sourceBenefitTag">{{ sourceBenefitTag }}</text>
      </view>
      <view class="title">{{ coupon.title }}</view>
      <view class="shop-name">{{ coupon.merchant_name }}</view>
      <view class="valid-time">有效期至：{{ coupon.end_time || coupon.expires_at || '长期有效' }}</view>
    </view>

    <view class="right-section">
      <button 
        class="action-btn" 
        :class="btnClass" 
        :disabled="isInvalid" 
        @tap.stop="$emit('action', coupon)"
      >
        {{ btnText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  coupon: any;
  actionText?: string;
  isClaimed?: boolean;
}>();

defineEmits(['action']);

const isInvalid = computed(() => {
  return props.coupon.status === 'USED' || props.coupon.status === 'EXPIRED';
});

const conditionText = computed(() => {
  const cond = props.coupon.condition_amount || props.coupon.rule_snapshot?.condition_amount;
  return cond > 0 ? `满${cond}元可用` : '无门槛体验';
});

const usageMode = computed(() => {
  return props.coupon.usage_mode || props.coupon.rule_snapshot?.usage_mode || 'WALK_IN';
});

const usageBadgeText = computed(() => {
  if (usageMode.value === 'INSTANT') return '进店当场立减';
  if (usageMode.value === 'BOOKING') return '需提前预约';
  return '到店出示即用';
});

const usageBadgeClass = computed(() => {
  if (usageMode.value === 'INSTANT') return 'badge-instant';
  if (usageMode.value === 'BOOKING') return 'badge-booking';
  return 'badge-walkin';
});

const sourceBenefitTag = computed(() => {
  return props.coupon.source_benefit_tag || '';
});

const btnText = computed(() => {
  if (props.coupon.status === 'USED') return '已核销';
  if (props.coupon.status === 'EXPIRED') return '已过期';
  if (props.isClaimed) {
    return usageMode.value === 'BOOKING' ? '查看预约' : '出示核销';
  }
  return props.actionText || '立即领取';
});

const btnClass = computed(() => {
  if (isInvalid.value) return 'btn-disabled';
  if (usageMode.value === 'INSTANT') return 'btn-instant';
  return 'btn-primary';
});
</script>

<style scoped>
.coupon-card {
  display: flex;
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #E5E7EB;
  position: relative;
}

.used-or-expired {
  opacity: 0.6;
  filter: grayscale(80%);
}

.left-section {
  width: 190rpx;
  background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20rpx 10rpx;
  border-right: 2rpx dashed #FCA5A5;
}

.amount-wrap {
  display: flex;
  align-items: baseline;
  color: #DC2626;
}

.symbol {
  font-size: 28rpx;
  font-weight: bold;
}

.amount {
  font-size: 48rpx;
  font-weight: 800;
}

.condition {
  font-size: 20rpx;
  color: #991B1B;
  margin-top: 6rpx;
}

.middle-section {
  flex: 1;
  padding: 20rpx 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.badge-row {
  display: flex;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.usage-badge {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.badge-instant {
  background: #DC2626;
  color: #ffffff;
}

.badge-booking {
  background: #2563EB;
  color: #ffffff;
}

.badge-walkin {
  background: #059669;
  color: #ffffff;
}

.source-badge {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #FEF3C7;
  color: #D97706;
}

.title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1F2937;
  line-height: 1.3;
}

.shop-name {
  font-size: 22rpx;
  color: #4B5563;
  margin-top: 4rpx;
}

.valid-time {
  font-size: 18rpx;
  color: #9CA3AF;
  margin-top: 8rpx;
}

.right-section {
  width: 170rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 16rpx;
}

.action-btn {
  font-size: 24rpx;
  padding: 0 20rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 32rpx;
  font-weight: 600;
  text-align: center;
  border: none;
}

.btn-primary {
  background: #2563EB;
  color: #ffffff;
}

.btn-instant {
  background: #DC2626;
  color: #ffffff;
}

.btn-disabled {
  background: #9CA3AF;
  color: #ffffff;
}
</style>
