<template>
  <view class="code-page" v-if="coupon">
    <view class="page-intro">
      <text class="intro-kicker">MY BENEFIT</text>
      <view class="intro-title">出示门店卡券</view>
      <text class="intro-subtitle">到店使用时，请先确认券面规则</text>
    </view>
    <view v-if="USE_MOCK" class="demo-notice">本地演示卡券，不可到真实门店使用</view>
    <view class="code-card">
      <view class="shop-header">
        <text class="shop-name">{{ coupon.merchant_name }}</text>
        <text class="usage-type">{{ usageTypeText }}</text>
      </view>

      <view class="coupon-title">{{ coupon.rule_snapshot?.title }}</view>

      <view class="barcode-area" v-if="canShowCode">
        <text class="code-label">门店核销券码</text>
        <text class="code-number">{{ coupon.code }}</text>
        <text class="qr-tip">向店员出示此码，核对后使用</text>
        <button class="copy-btn" @tap="copyCode">复制券码</button>
      </view>
      <view class="barcode-area" v-else>
        <text class="qr-tip">{{ coupon.merchant_suspended ? '商家服务暂停，已领权益待平台处置' : coupon.status === 'USED' ? '此券已核销' : '预约经商家确认后才可出示券码' }}</text>
      </view>

      <view class="appointment-section" v-if="coupon.rule_snapshot?.booking_required">
        <view class="sec-title">服务预约状态</view>
        <view class="appoint-status-box" :class="appointmentClass">
          <text class="status-name">{{ appointmentStatusText }}</text>
          <text class="status-time" v-if="appointmentTime">预约时段：{{ appointmentTime }}</text>
        </view>

        <view class="booking-action" v-if="canRequestAppointment">
          <picker mode="date" :value="selectedDate" :start="todayDate" @change="onDateChange">
            <button class="book-btn">日期：{{ selectedDate }}</button>
          </picker>
          <picker mode="time" :value="selectedTime" start="09:00" end="21:00" @change="onTimeChange">
            <button class="book-btn">时间：{{ selectedTime }}</button>
          </picker>
          <input id="booking-name" class="book-field" placeholder="到店称呼" v-model="contactName" />
          <input id="booking-phone" class="book-field" type="number" placeholder="接待商家联系手机" v-model="contactPhone" />
          <view class="booking-consent" @tap="contactConsent = !contactConsent">
            <checkbox :checked="contactConsent" />同意将上述预约联系方式仅提供给接待门店
          </view>
          <button class="book-btn" @tap="submitAppointment">提交预约申请</button>
        </view>
        <button class="book-btn" v-if="['REQUESTED', 'CONFIRMED'].includes(appointment?.status || '')" @tap="cancelBooking">取消预约</button>
      </view>

      <view class="rules-section">
        <view class="rule-title">使用须知</view>
        <view class="rule-item">• {{ coupon.rule_snapshot?.instructions }}</view>
        <view class="rule-item">• 门店地址：{{ coupon.merchant_address || '竹山县城关镇' }}</view>
        <view class="rule-item">• 有效期至：{{ coupon.expires_at }}</view>
      </view>

      <view class="contact-shop">
        <button class="share-btn" open-type="share">🎁 分享给微信好友 / 闺蜜</button>
        <button class="contact-btn" @tap="callMerchant">联系店铺咨询</button>
      </view>
    </view>
  </view>
  <view class="code-page" v-else>
    <view class="code-card">{{ loadError || '券码不存在或不属于当前用户' }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { getCouponByCode } from '@/api/coupon';
import { getMyAppointment, requestAppointment, cancelAppointment } from '@/api/appointment';
import { USE_MOCK } from '@/api/adapter';
import { requestAppointmentSubscription } from '@/utils/subscribe';
import type { UserCoupon } from '@/types/coupon';
import type { Appointment } from '@/types/appointment';

onShareAppMessage(() => {
  const title = coupon.value
    ? `送你一张【${coupon.value.merchant_name}】${coupon.value.rule_snapshot?.title || '专属优惠'}`
    : '竹山街坊汇精选门店卡券';
  return {
    title,
    path: `/pages/benefit/shop?shopId=${coupon.value?.merchant_id || ''}`
  };
});

const coupon = ref<UserCoupon | null>(null);
const appointment = ref<Appointment | null>(null);
const requestedCode = ref('');
const loadError = ref('');
const todayDate = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();
const selectedDate = ref(todayDate);
const selectedTime = ref('15:00');
const contactName = ref('');
const contactPhone = ref('');
const contactConsent = ref(false);

async function loadDetail() {
  if (!requestedCode.value) return;
  try {
    coupon.value = await getCouponByCode(requestedCode.value);
    appointment.value = coupon.value ? await getMyAppointment(coupon.value._id) : null;
    loadError.value = coupon.value ? '' : '券码不存在或不属于当前用户';
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '卡券读取失败';
  }
}

onLoad((options) => {
  requestedCode.value = options?.code || '';
  loadDetail();
});
onShow(loadDetail);

const usageTypeText = computed(() => {
  const mode = coupon.value?.rule_snapshot?.usage_mode;
  if (mode === 'INSTANT') return '当场立减';
  if (mode === 'BOOKING') return '预约体验';
  return '到店直出';
});

const appointmentStatusText = computed(() => {
  if (appointment.value?.status === 'CONFIRMED') return '✅ 商家已确认预约，请准时到店';
  if (appointment.value?.status === 'ARRIVED') return '✅ 商家已确认到店，可出示券码';
  if (appointment.value?.status === 'COMPLETED') return '此预约已完成核销';
  if (appointment.value?.status === 'REQUESTED') return '⏳ 预约申请已提交，等待商家确认';
  if (appointment.value?.status === 'REJECTED') return `预约被拒绝：${appointment.value.reject_reason || '时段不可用'}，请重新选择`;
  if (appointment.value?.status === 'CANCELLED') return '预约已取消，可重新选择时段';
  if (appointment.value?.status === 'NO_SHOW') return '商家已标记未到店，请联系商家';
  return '⚠️ 该项目需提前预约时段，商家确认后方可到店核销';
});

const appointmentClass = computed(() => {
  if (appointment.value?.status === 'CONFIRMED' || appointment.value?.status === 'ARRIVED') return 'status-confirmed';
  if (appointment.value?.status === 'REQUESTED') return 'status-pending';
  return 'status-warning';
});

const appointmentTime = computed(() => appointment.value?.confirmed_time_slot || appointment.value?.requested_time_slot || '');
const canRequestAppointment = computed(() => coupon.value?.status === 'UNUSED' && !coupon.value.merchant_suspended && (!appointment.value || ['REJECTED', 'CANCELLED'].includes(appointment.value.status)));
const canShowCode = computed(() => coupon.value?.status === 'UNUSED' && !coupon.value.merchant_suspended && (!coupon.value.rule_snapshot.booking_required || ['CONFIRMED', 'ARRIVED'].includes(appointment.value?.status || '')));

const onDateChange = (e: any) => {
  selectedDate.value = e.detail.value;
};
const onTimeChange = (e: any) => {
  selectedTime.value = e.detail.value;
};

const submitAppointment = async () => {
  if (!coupon.value) return;
  try {
    appointment.value = await requestAppointment(coupon.value._id, `${selectedDate.value} ${selectedTime.value}`, contactName.value, contactPhone.value, contactConsent.value);
    if (!USE_MOCK) await requestAppointmentSubscription();
    uni.showToast({ title: '预约已提交，请在券包查看确认状态', icon: 'none' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '预约失败', icon: 'none' });
  }
};

const cancelBooking = () => {
  if (!coupon.value) return;
  uni.showModal({ title: '取消预约', content: '确定取消当前预约吗？', success: async result => {
    if (!result.confirm || !coupon.value) return;
    try { appointment.value = await cancelAppointment(coupon.value._id); uni.showToast({ title: '预约已取消', icon: 'none' }); }
    catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '取消失败', icon: 'none' }); }
  } });
};

const callMerchant = () => {
  if (coupon.value?.merchant_phone) {
    uni.makePhoneCall({ phoneNumber: coupon.value.merchant_phone });
  }
};
const copyCode = () => {
  if (coupon.value?.code && canShowCode.value) uni.setClipboardData({ data: coupon.value.code });
};
</script>

<style scoped>
.code-page { min-height: 100vh; padding-bottom: 55rpx; background: var(--zs-canvas); }
.page-intro { padding: 35rpx 28rpx 55rpx; border-radius: 0 0 32rpx 32rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.intro-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.intro-title { margin-top: 6rpx; font-size: 39rpx; font-weight: 800; }
.intro-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; }
.demo-notice { position: relative; margin: -20rpx 20rpx 0; padding: 15rpx 20rpx; border-radius: 12rpx; color: #886330; background: #fff3de; font-size: 20rpx; text-align: center; }
.code-card { margin: 19rpx 20rpx; padding: 25rpx; border: 1rpx solid var(--zs-border); border-radius: 21rpx; background: #fff; box-shadow: 0 5rpx 20rpx rgba(21,57,38,.045); }
.shop-header { display: flex; align-items: center; justify-content: space-between; gap: 13rpx; }
.shop-name { color: var(--zs-ink); font-size: 26rpx; line-height: 1.3; font-weight: 750; }
.usage-type { flex-shrink: 0; padding: 5rpx 11rpx; border-radius: 8rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 19rpx; }
.coupon-title { margin-top: 12rpx; color: var(--zs-ink); font-size: 31rpx; line-height: 1.35; font-weight: 800; }
.barcode-area { display: flex; align-items: center; flex-direction: column; margin-top: 25rpx; padding: 31rpx 15rpx; border: 1rpx dashed #b8d8c1; border-radius: 17rpx; color: var(--zs-green-dark); background: #f1f8f2; }
.code-label { font-size: 20rpx; color: #6d8d78; }
.code-number { display: block; margin-top: 12rpx; color: var(--zs-green-dark); font-size: 41rpx; font-weight: 900; letter-spacing: 3rpx; word-break: break-all; text-align: center; }
.qr-tip { display: block; margin-top: 12rpx; color: #6a8471; font-size: 20rpx; line-height: 1.45; text-align: center; }
.copy-btn { margin-top: 25rpx; padding: 0 34rpx; height: 60rpx; line-height: 60rpx; border-radius: 30rpx; color: var(--zs-green); background: #fff; border: 1rpx solid #cde1d0; font-size: 22rpx; font-weight: 700; }
.appointment-section { margin-top: 29rpx; padding-top: 25rpx; border-top: 1rpx solid var(--zs-border); }
.sec-title, .rule-title { color: var(--zs-ink); font-size: 27rpx; font-weight: 750; }
.appoint-status-box { margin-top: 13rpx; padding: 17rpx; border-radius: 12rpx; font-size: 22rpx; }
.status-warning { background: #fff2df; color: #a66327; }
.status-pending { background: var(--zs-green-soft); color: var(--zs-green); }
.status-confirmed { background: #dff1e4; color: #145a40; }
.status-name, .status-time { display: block; }
.status-name { font-weight: 750; }
.status-time { margin-top: 6rpx; font-size: 20rpx; }
.booking-action { display: flex; flex-direction: column; gap: 13rpx; margin-top: 15rpx; }
.book-btn { margin: 0; width: 100%; height: 66rpx; line-height: 66rpx; border-radius: 11rpx; color: #fff; background: var(--zs-green); font-size: 23rpx; }
.booking-action picker .book-btn { color: var(--zs-green); background: var(--zs-green-soft); }
.book-field { width: 100%; height: 70rpx; padding: 0 18rpx; border: 1rpx solid var(--zs-border); border-radius: 11rpx; background: #f8faf7; font-size: 23rpx; }
.booking-consent { display: flex; align-items: flex-start; gap: 10rpx; color: var(--zs-muted); font-size: 20rpx; line-height: 1.4; }
.rules-section { margin-top: 29rpx; padding-top: 25rpx; border-top: 1rpx solid var(--zs-border); }
.rule-item { margin-top: 10rpx; color: var(--zs-muted); font-size: 21rpx; line-height: 1.5; }
.contact-shop { margin-top: 25rpx; display: flex; flex-direction: column; gap: 14rpx; }
.share-btn { width: 100%; height: 68rpx; line-height: 68rpx; border-radius: 34rpx; color: #fff; background: var(--zs-terracotta, #e05d26); font-size: 23rpx; font-weight: 700; border: none; margin: 0; }
.contact-btn { width: 100%; height: 68rpx; line-height: 68rpx; border-radius: 34rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 23rpx; font-weight: 700; border: none; margin: 0; }
</style>
