<template>
  <view class="appoint-manage-page">
    <view class="page-title">📝 客户预约接待处理</view>

    <view class="list-wrap">
      <view class="appoint-card" v-for="item in appointments" :key="item.id">
        <view class="card-head">
          <text class="user-phone">客户：{{ item.contact_name }} ({{ item.contact_phone }})</text>
          <text class="status-pill" :class="item.status">{{ getStatusText(item.status) }}</text>
        </view>

        <view class="item-title">{{ item.coupon_title }}</view>
        <view class="time-row">期望时段：{{ item.requested_time }}</view>

        <view class="action-bar" v-if="item.status === 'REQUESTED'">
          <button class="confirm-btn" @tap="confirmAppoint(item)">确认接单</button>
          <button class="reject-btn" @tap="rejectAppoint(item)">时段已满/婉拒</button>
        </view>

        <view class="action-bar" v-else-if="item.status === 'CONFIRMED'">
          <button class="arrive-btn" @tap="markArrived(item)">客户已到店 (核验)</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const appointments = ref([
  {
    id: 'apt_01',
    contact_name: '张女士',
    contact_phone: '138****1234',
    coupon_title: '雅致老客专享·38元纯色美甲体验',
    requested_time: '今天 15:30',
    status: 'REQUESTED'
  },
  {
    id: 'apt_02',
    contact_name: '刘先生',
    contact_phone: '139****5678',
    coupon_title: '68元古法足道体验 (原价138元)',
    requested_time: '今天 17:00',
    status: 'CONFIRMED'
  }
]);

const getStatusText = (status: string) => {
  if (status === 'REQUESTED') return '待确认';
  if (status === 'CONFIRMED') return '已确认待到店';
  if (status === 'ARRIVED') return '已到店';
  return '已完成';
};

const confirmAppoint = (item: any) => {
  item.status = 'CONFIRMED';
  uni.showToast({ title: '已确认接单，系统已微信通知客户', icon: 'success' });
};

const rejectAppoint = (item: any) => {
  uni.showModal({
    title: '婉拒预约',
    content: '确定该时段接待已满？',
    success: (res) => {
      if (res.confirm) {
        appointments.value = appointments.value.filter(a => a.id !== item.id);
        uni.showToast({ title: '已拒绝并通知客户', icon: 'none' });
      }
    }
  });
};

const markArrived = (item: any) => {
  item.status = 'ARRIVED';
  uni.showToast({ title: '已标记到店，可进行扫码核销', icon: 'success' });
};
</script>

<style scoped>
.appoint-manage-page {
  min-height: 100vh;
  background-color: #F4F5F7;
  padding: 24rpx;
}

.page-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #111827;
  margin-bottom: 20rpx;
}

.appoint-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
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

.status-pill.CONFIRMED {
  background: #EFF6FF;
  color: #2563EB;
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
  background: #2563EB;
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
