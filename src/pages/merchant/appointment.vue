<template>
  <view class="appoint-manage-page">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">APPOINTMENTS</text>
      <view class="zs-page-hero__title">预约接待</view>
      <text class="zs-page-hero__subtitle">确认时段，记录顾客是否到店</text>
    </view>
    <view v-if="accessMessage" class="access-note">{{ accessMessage }}</view>
    <t-empty v-else-if="appointments.length === 0" description="本店暂无预约记录" />

    <view v-if="!accessMessage" class="list-wrap">
      <view class="appoint-card" v-for="item in appointments" :key="item._id">
        <view class="card-head">
          <text class="user-phone">客户：{{ item.contact_name }}（{{ item.contact_phone || '未提供电话' }}）</text>
          <text class="status-pill" :class="item.status">{{ getStatusText(item.status) }}</text>
        </view>

        <view class="item-title">{{ item.coupon_title }}</view>
        <view class="time-row">期望时段：{{ item.requested_time_slot }}</view>
        <view class="time-row" v-if="item.reject_reason">拒绝原因：{{ item.reject_reason }}</view>

        <view class="action-bar" v-if="item.status === 'REQUESTED'">
          <button class="confirm-btn" @tap="confirmAppoint(item)">确认接单</button>
          <button class="reject-btn" @tap="rejectAppoint(item)">时段已满/婉拒</button>
        </view>

        <view class="action-bar" v-else-if="item.status === 'CONFIRMED'">
          <button class="arrive-btn" @tap="markArrived(item)">客户已到店</button>
          <button @tap="markNoShow(item)">标记未到店</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { useMerchantStore } from '@/store/merchant';
import { getMerchantAppointments, confirmAppointment, rejectAppointment, markAppointmentArrived, markAppointmentNoShow } from '@/api/appointment';
import type { Appointment } from '@/types/appointment';

const merchantStore = useMerchantStore();
const appointments = ref<Appointment[]>([]);
const accessMessage = ref('');

const loadAppointments = async () => {
  const merchant = merchantStore.currentMerchant;
  appointments.value = [];
  if (!merchant) { accessMessage.value = '当前没有可处理预约的门店。'; return; }
  if (merchant.status !== 'APPROVED') { accessMessage.value = '门店尚未审核通过或已停用，暂不能处理预约。'; return; }
  if (!USE_MOCK && !merchant.can_handle_appointment && merchant.access_role !== 'OWNER') { accessMessage.value = '当前账号没有本店预约处理权限。'; return; }
  accessMessage.value = '';
  try { appointments.value = await getMerchantAppointments(merchant._id); }
  catch (error) { accessMessage.value = error instanceof Error ? error.message : '预约加载失败，请稍后再试。'; }
};
onShow(loadAppointments);

const getStatusText = (status: string) => {
  if (status === 'REQUESTED') return '待确认';
  if (status === 'CONFIRMED') return '已确认待到店';
  if (status === 'ARRIVED') return '已到店';
  if (status === 'REJECTED') return '已拒绝';
  if (status === 'NO_SHOW') return '未到店';
  return '已完成';
};

const confirmAppoint = async (item: Appointment) => {
  try {
    await confirmAppointment(item._id, merchantStore.currentMerchant!._id);
    await loadAppointments();
    uni.showToast({ title: USE_MOCK ? '预约已确认（本地演示）' : '预约已确认', icon: 'none' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '确认失败', icon: 'none' });
  }
};

const rejectAppoint = (item: Appointment) => {
  uni.showModal({
    title: '婉拒预约',
    content: '确定该时段接待已满？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await rejectAppointment(item._id, merchantStore.currentMerchant!._id, '该时段接待已满');
          await loadAppointments();
          uni.showToast({ title: USE_MOCK ? '已拒绝预约（本地演示）' : '已拒绝预约', icon: 'none' });
        } catch (err) {
          uni.showToast({ title: err instanceof Error ? err.message : '拒绝失败', icon: 'none' });
        }
      }
    }
  });
};

const markArrived = async (item: Appointment) => {
  try {
    await markAppointmentArrived(item._id, merchantStore.currentMerchant!._id);
    await loadAppointments();
    uni.showToast({ title: '已标记到店，可进行核销', icon: 'none' });
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '标记失败', icon: 'none' });
  }
};

const markNoShow = async (item: Appointment) => {
  try { await markAppointmentNoShow(item._id, merchantStore.currentMerchant!._id); await loadAppointments(); uni.showToast({ title: '已标记未到店', icon: 'none' }); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '标记失败', icon: 'none' }); }
};
</script>

<style scoped>
.appoint-manage-page {
  min-height: 100vh;
  background-color: var(--zs-canvas);
  padding: 24rpx;
}
.access-note { margin-top: 22rpx; padding: 22rpx; border-radius: 15rpx; color: var(--zs-muted); background: white; font-size: 23rpx; line-height: 1.5; }

.appoint-card {
  background: #ffffff;
  border-radius: 18rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid var(--zs-border);
  box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.user-phone {
  font-size: 24rpx;
  font-weight: bold;
  color: #1F2937;
}

.status-pill {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.status-pill.REQUESTED {
  background: #FEF3C7;
  color: #B45309;
}

.status-pill.ARRIVED {
  background: #D1FAE5;
  color: #065F46;
}

.item-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8rpx;
}

.time-row {
  font-size: 22rpx;
  color: #6B7280;
  margin-bottom: 18rpx;
}

.action-bar {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F3F4F6;
}

.confirm-btn {
  background: var(--zs-green);
  color: #ffffff;
  font-size: 22rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  flex: 1;
}

.reject-btn {
  background: #F3F4F6;
  color: #6B7280;
  font-size: 22rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  flex: 1;
}

.arrive-btn {
  background: #10B981;
  color: #ffffff;
  font-size: 22rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  width: 100%;
}
</style>
