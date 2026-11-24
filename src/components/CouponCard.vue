<template>
  <view class="coupon-card" :class="{ 'used-or-expired': isInvalid }">
    <view class="coupon-main">
      <view class="amount-box">
        <view class="amount-wrap">
          <text class="symbol" v-if="coupon.discount_amount">¥</text>
          <text class="amount">{{ coupon.discount_amount || '特惠' }}</text>
        </view>
        <text class="condition">{{ conditionText }}</text>
      </view>

      <view class="coupon-info">
        <view class="badge-row">
          <text class="usage-badge" :class="usageBadgeClass">{{ usageBadgeText }}</text>
          <text class="source-badge" v-if="sourceBenefitTag">{{ sourceBenefitTag }}</text>
        </view>
        <view class="title">{{ coupon.title || coupon.rule_snapshot?.title || '门店优惠券' }}</view>
        <text class="shop-name">{{ coupon.merchant_name }}</text>
      </view>
    </view>

    <view class="coupon-foot">
      <text class="valid-time">有效期至 {{ coupon.end_time || coupon.expires_at || '长期有效' }}</text>
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
  return props.coupon.status === 'USED' || props.coupon.status === 'EXPIRED' || props.coupon.merchant_suspended;
});

const conditionText = computed(() => {
  const cond = props.coupon.condition_amount || props.coupon.rule_snapshot?.condition_amount;
  return cond > 0 ? `满${cond}元可用` : '无门槛体验';
});

const usageMode = computed(() => {
  return props.coupon.usage_mode || props.coupon.rule_snapshot?.usage_mode || 'WALK_IN';
});

const usageBadgeText = computed(() => {
  if (usageMode.value === 'INSTANT') return '当场可用';
  if (usageMode.value === 'BOOKING') return '需提前预约';
  return '到店出示';
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
  if (props.coupon.merchant_suspended) return '商家暂停待处理';
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
  position: relative;
  background: #ffffff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid var(--zs-border, #e4eae2);
  box-shadow: 0 4rpx 16rpx rgba(24, 52, 43, 0.04);
  overflow: hidden;
  transition: transform 0.15s ease;
}

.coupon-card:active {
  transform: scale(0.988);
}

.used-or-expired {
  opacity: 0.58;
  filter: grayscale(40%);
}

.coupon-main {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 154rpx;
}

.amount-box {
  position: relative;
  flex-shrink: 0;
  width: 176rpx;
  background: linear-gradient(135deg, var(--zs-terracotta-soft, #fff3ec), #fff9f5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20rpx 8rpx;
  color: var(--zs-terracotta, #e05d26);
  border-right: 2rpx dashed #ebd9c5;
}

/* 卡券撕口凹半圆拟物效果 */
.amount-box::before,
.amount-box::after {
  content: '';
  position: absolute;
  right: -9rpx;
  width: 18rpx;
  height: 18rpx;
  background: var(--zs-canvas, #f6f7f2);
  border-radius: 50%;
  z-index: 2;
}

.amount-box::before {
  top: -9rpx;
  box-shadow: inset 0 -2rpx 3rpx rgba(0, 0, 0, 0.04);
}

.amount-box::after {
  bottom: -9rpx;
  box-shadow: inset 0 2rpx 3rpx rgba(0, 0, 0, 0.04);
}

.amount-wrap {
  display: flex;
  align-items: baseline;
  line-height: 1;
}

.symbol {
  font-size: 26rpx;
  font-weight: 750;
  margin-right: 2rpx;
}

.amount {
  font-size: 50rpx;
  font-weight: 850;
  letter-spacing: -1rpx;
}

.condition {
  font-size: 19rpx;
  color: #a35d33;
  margin-top: 8rpx;
  text-align: center;
}

.coupon-info {
  min-width: 0;
  flex: 1;
  padding: 18rpx 22rpx 14rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.badge-row {
  display: flex;
  gap: 8rpx;
  margin-bottom: 8rpx;
  flex-wrap: wrap;
}

.usage-badge,
.source-badge {
  font-size: 18rpx;
  padding: 3rpx 10rpx;
  border-radius: 6rpx;
  line-height: 1.4;
  font-weight: 600;
}

.badge-instant {
  background: #fdeee5;
  color: #c44d18;
}

.badge-booking {
  background: var(--zs-green-soft, #eaf4ee);
  color: var(--zs-green, #17664c);
}

.badge-walkin {
  background: #eff2e6;
  color: #647150;
}

.source-badge {
  background: var(--zs-gold-soft, #fcf6ea);
  color: var(--zs-gold, #c08a3e);
}

.title {
  font-size: 26rpx;
  font-weight: bold;
  color: var(--zs-ink, #18342b);
  line-height: 1.35;
}

.shop-name {
  font-size: 20rpx;
  color: var(--zs-muted, #687b70);
  margin-top: 6rpx;
  display: block;
}

.coupon-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  margin: 0 20rpx;
  padding: 13rpx 0;
  border-top: 1rpx solid #edf0ea;
}

.valid-time {
  font-size: 19rpx;
  color: #8c9a8f;
}

.action-btn {
  font-size: 22rpx;
  padding: 0 22rpx;
  height: 54rpx;
  line-height: 54rpx;
  border-radius: 27rpx;
  font-weight: 600;
  text-align: center;
  border: none;
  margin: 0;
}

.btn-primary {
  background: var(--zs-green, #17664c);
  color: #ffffff;
}

.btn-instant {
  background: var(--zs-terracotta, #e05d26);
  color: #ffffff;
}

.btn-disabled {
  background: #a5aea6;
  color: #ffffff;
}
</style>
