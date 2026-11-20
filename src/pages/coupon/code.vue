<template>
  <view class="code-page" v-if="coupon">
    <view class="code-card">
      <view class="shop-header">
        <text class="shop-name">{{ coupon.merchant_name }}</text>
        <text class="usage-type">{{ usageTypeText }}</text>
      </view>

      <view class="coupon-title">{{ coupon.rule_snapshot?.title }}</view>

      <!-- 核销码展示区 -->
      <view class="barcode-area">
        <view class="qrcode-mock">
          <text class="qr-icon">📱</text>
          <text class="qr-tip">请向店员出示核销二维码</text>
        </view>
        <view class="code-text-wrap">
          <text class="code-label">核销券码：</text>
          <text class="code-number">{{ coupon.code }}</text>
        </view>
      </view>

      <!-- 预约状态管理 (如需预约) -->
      <view class="appointment-section" v-if="coupon.rule_snapshot?.booking_required">
        <view class="sec-title">📅 服务预约状态</view>
        <view class="appoint-status-box" :class="appointmentClass">
          <text class="status-name">{{ appointmentStatusText }}</text>
          <text class="status-time" v-if="appointmentTime">预约时段：{{ appointmentTime }}</text>
        </view>

        <view class="booking-action" v-if="!appointmentConfirmed">
          <picker mode="time" :value="selectedTime" start="09:00" end="21:00" @change="onTimeChange">
            <button class="book-btn">选择期望到店时段并预约</button>
          </picker>
        </view>
      </view>

      <!-- 商家信息与使用规则 -->
      <view class="rules-section">
        <view class="rule-title">使用须知</view>
        <view class="rule-item">• {{ coupon.rule_snapshot?.instructions }}</view>
        <view class="rule-item">• 门店地址：{{ coupon.merchant_address || '竹山县城关镇' }}</view>
        <view class="rule-item">• 有效期至：{{ coupon.expires_at }}</view>
      </view>

      <view class="contact-shop">
        <button class="contact-btn" @tap="callMerchant">📞 联系店铺导航/咨询</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getMyCoupons } from '@/api/coupon';
import { requestAppointmentSubscription } from '@/utils/subscribe';

const coupon = ref<any>(null);
const selectedTime = ref('15:00');
const appointmentConfirmed = ref(false);
const appointmentTime = ref('');

onLoad(async (options) => {
  const code = options?.code;
  const list = await getMyCoupons();
  coupon.value = list.find((c: any) => c.code === code) || list[0];
});

const usageTypeText = computed(() => {
  const mode = coupon.value?.rule_snapshot?.usage_mode;
  if (mode === 'INSTANT') return '当场立减';
  if (mode === 'BOOKING') return '预约体验';
  return '到店直出';
});

const appointmentStatusText = computed(() => {
  if (appointmentConfirmed.value) return '✅ 商家已确认预约，请准时到店';
  if (appointmentTime.value) return '⏳ 预约申请已提交，等待商家确认中...';
  return '⚠️ 该项目需提前预约时段，商家确认后方可到店核销';
});

const appointmentClass = computed(() => {
  if (appointmentConfirmed.value) return 'status-confirmed';
  if (appointmentTime.value) return 'status-pending';
  return 'status-warning';
});

const onTimeChange = async (e: any) => {
  selectedTime.value = e.detail.value;
  // 1. 订阅消息
  await requestAppointmentSubscription();
  // 2. 模拟提交预约
  appointmentTime.value = `今天 ${selectedTime.value}`;
  uni.showToast({ title: '预约已提交给商家！', icon: 'success' });
  // 模拟2秒后商家确认
  setTimeout(() => {
    appointmentConfirmed.value = true;
  }, 2500);
};

const callMerchant = () => {
  if (coupon.value?.merchant_phone) {
    uni.makePhoneCall({ phoneNumber: coupon.value.merchant_phone });
  }
};
</script>

<style scoped>
.code-page {
  min-height: 100vh;
  background-color: #1E3A8A;
  padding: 40rpx 30rpx;
}

.code-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 36rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.2);
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.shop-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #111827;
}

.usage-type {
  font-size: 20rpx;
  background: #EFF6FF;
  color: #2563EB;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.coupon-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #DC2626;
  margin-bottom: 30rpx;
}

.barcode-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #F9FAFB;
  padding: 30rpx;
  border-radius: 16rpx;
  border: 1rpx dashed #D1D5DB;
  margin-bottom: 30rpx;
}

.qrcode-mock {
  width: 240rpx;
  height: 240rpx;
  background: #FFFFFF;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.qr-icon {
  font-size: 72rpx;
  margin-bottom: 8rpx;
}

.qr-tip {
  font-size: 18rpx;
  color: #9CA3AF;
}

.code-text-wrap {
  margin-top: 24rpx;
  display: flex;
  align-items: baseline;
}

.code-label {
  font-size: 24rpx;
  color: #6B7280;
}

.code-number {
  font-size: 40rpx;
  font-weight: 900;
  color: #111827;
  letter-spacing: 4rpx;
}

.appointment-section {
  background: #F8FAFC;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
  border: 1rpx solid #E2E8F0;
}

.sec-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #334155;
  margin-bottom: 12rpx;
}

.appoint-status-box {
  padding: 14rpx 18rpx;
  border-radius: 10rpx;
  font-size: 22rpx;
  line-height: 1.4;
  margin-bottom: 14rpx;
}

.status-warning {
  background: #FEF3C7;
  color: #B45309;
}

.status-pending {
  background: #EFF6FF;
  color: #1D4ED8;
}

.status-confirmed {
  background: #D1FAE5;
  color: #065F46;
}

.status-name {
  font-weight: bold;
  display: block;
}

.status-time {
  margin-top: 6rpx;
  display: block;
  font-size: 20rpx;
}

.book-btn {
  background: #2563EB;
  color: #ffffff;
  font-size: 24rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
}

.rules-section {
  margin-bottom: 30rpx;
}

.rule-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #4B5563;
  margin-bottom: 10rpx;
}

.rule-item {
  font-size: 22rpx;
  color: #6B7280;
  line-height: 1.6;
}

.contact-btn {
  background: #F3F4F6;
  color: #1F2937;
  font-size: 24rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  font-weight: 500;
}
</style>
