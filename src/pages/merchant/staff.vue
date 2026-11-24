<template>
  <view class="page" v-if="merchant && canManage">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">TEAM ACCESS</text>
      <view class="zs-page-hero__title">门店员工权限</view>
      <text class="zs-page-hero__subtitle">邀请店员，并分配核销与预约权限</text>
    </view>
    <view class="notice">店主可生成 24 小时一次性邀请。员工须用自己的微信身份接受；权限可随时停用。{{ USE_MOCK ? '当前为本机演示，不会给真实账号赋权。' : '' }}</view>
    <view class="card">
      <view class="title">邀请 {{ merchant.name }} 员工</view>
      <view class="option" @tap="canVerify = !canVerify"><checkbox :checked="canVerify" />允许核销本店券</view>
      <view class="option" @tap="canAppointment = !canAppointment"><checkbox :checked="canAppointment" />允许处理本店预约</view>
      <button id="create-staff-invite" class="primary" @tap="create">生成一次性邀请</button>
      <view class="line" v-if="invite">邀请码：{{ invite.token }} · 有效期至 {{ formatTime(invite.expires_at) }}</view>
    </view>
    <view class="card">
      <view class="title">已绑定员工</view>
      <view class="line" v-if="staff.length === 0">暂无员工</view>
      <view class="staff" v-for="item in staff" :key="item._id || item.user_id">
        <view class="line">{{ item.role }} · {{ item.status }} · {{ item.can_verify ? '可核销' : '不可核销' }} · {{ item.can_handle_appointment ? '可处理预约' : '不可处理预约' }}</view>
        <button v-if="item.role !== 'OWNER' && item.status === 'ACTIVE'" @tap="disable(item._id || '')">停用员工</button>
      </view>
    </view>
  </view>
  <view class="page" v-else>只有店主可管理本店员工。</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useMerchantStore } from '@/store/merchant';
import { USE_MOCK } from '@/api/adapter';
import { createStaffInvite, listStaff, disableStaff } from '@/api/staff';
import type { MerchantStaff, StaffInvite } from '@/types/merchant';

const store = useMerchantStore();
const merchant = computed(() => store.currentMerchant);
const canManage = computed(() => USE_MOCK || merchant.value?.access_role === 'OWNER');
const canVerify = ref(true);
const canAppointment = ref(false);
const invite = ref<StaffInvite | null>(null);
const staff = ref<MerchantStaff[]>([]);
const load = async () => { if (merchant.value && canManage.value) staff.value = await listStaff(merchant.value._id); };
onShow(load);
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN');
const create = async () => {
  if (!merchant.value) return;
  try { invite.value = await createStaffInvite(merchant.value._id, canVerify.value, canAppointment.value); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '邀请失败', icon: 'none' }); }
};
const disable = async (id: string) => {
  if (!merchant.value) return;
  try { await disableStaff(merchant.value._id, id); await load(); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '停用失败', icon: 'none' }); }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--zs-canvas); }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.card { margin: 17rpx 0; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.title { color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.option { display: flex; align-items: center; gap: 8rpx; margin: 18rpx 0; padding: 14rpx 12rpx; border: 1rpx solid var(--zs-border); border-radius: 10rpx; color: var(--zs-ink); background: #f8faf7; font-size: 22rpx; }
.primary { width: 100%; height: 72rpx; line-height: 72rpx; margin-top: 20rpx; border-radius: 36rpx; color: white; background: var(--zs-green); font-size: 23rpx; font-weight: 700; }
.line { margin-top: 14rpx; color: var(--zs-muted); font-size: 21rpx; line-height: 1.5; word-break: break-all; }
.staff { margin-top: 17rpx; padding-top: 16rpx; border-top: 1rpx solid var(--zs-border); }
.staff button { margin: 15rpx 0 0; padding: 0 18rpx; height: 56rpx; line-height: 56rpx; border-radius: 28rpx; color: #a85b48; background: #fff0ea; font-size: 20rpx; }
</style>
