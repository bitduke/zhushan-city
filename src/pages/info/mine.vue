<template>
  <view class="page">
    <view class="page-heading">
      <text class="heading-kicker">MY POSTS</text>
      <view class="heading-title">我的发布</view>
      <text class="heading-subtitle">查看审核进度，管理已发布信息</text>
    </view>
    <view class="content">
    <view class="notice">{{ USE_MOCK ? '本地演示记录；信息审核与公开只在本机模拟，不会发布到真实平台。' : '信息提交后需经人工审核，通过后才会公开。' }}</view>
    <button class="primary" @tap="goPublish">发布便民信息</button>
    <t-empty v-if="items.length === 0" description="暂无我的发布" />
    <view class="card" v-for="item in items" :key="item._id">
      <view class="card-head"><view class="title">{{ item.title }}</view><view class="status">{{ statusText(item.status) }}</view></view>
      <view class="line">{{ item.category_name }} · {{ item.town }} · 到期 {{ formatDate(item.expires_at) }}</view>
      <view class="reason" v-if="item.review_reason">审核原因：{{ item.review_reason }}</view>
      <view class="reason" v-if="item.offline_reason">下架原因：{{ item.offline_reason }}</view>
      <view class="row">
        <button @tap="goDetail(item._id)">查看</button>
        <button v-if="item.status !== 'OFFLINE'" @tap="goEdit(item._id)">编辑</button>
        <button class="danger-action" v-if="!['OFFLINE', 'EXPIRED'].includes(item.status)" @tap="offline(item._id)">下架</button>
        <button v-if="['OFFLINE', 'EXPIRED', 'REJECTED'].includes(item.status)" @tap="renew(item._id)">申请续期／重审</button>
      </view>
    </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { getMyInfos, offlineInfo, renewInfo } from '@/api/info';
import type { InfoItem } from '@/types/info';

const items = ref<InfoItem[]>([]);
const load = async () => { items.value = await getMyInfos(); };
onShow(load);
const statusText = (status: string) => ({ DRAFT: '草稿', PENDING: '待人工审核（公开页不可见）', APPROVED: '已公开', REJECTED: '审核未通过', OFFLINE: '已下架', EXPIRED: '已过期' } as Record<string, string>)[status] || status;
const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN');
const goPublish = () => uni.navigateTo({ url: '/pages/info/publish' });
const goDetail = (id: string) => uni.navigateTo({ url: `/pages/info/detail?id=${id}` });
const goEdit = (id: string) => uni.navigateTo({ url: `/pages/info/publish?id=${id}` });
const offline = (id: string) => uni.showModal({ title: '确认下架', content: '下架后公开列表将立即隐藏这条信息。', success: async result => {
  if (!result.confirm) return;
  try { await offlineInfo(id); await load(); } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '下架失败', icon: 'none' }); }
} });
const renew = async (id: string) => {
  try { await renewInfo(id); await load(); uni.showToast({ title: '已进入待审队列', icon: 'none' }); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '续期失败', icon: 'none' }); }
};
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 50rpx; background: var(--zs-canvas); }
.page-heading { padding: 35rpx 28rpx 51rpx; border-radius: 0 0 32rpx 32rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.heading-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.heading-title { margin-top: 6rpx; font-size: 39rpx; font-weight: 800; }
.heading-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; }
.content { position: relative; margin: -15rpx 20rpx 0; }
.notice { padding: 16rpx 19rpx; border-radius: 13rpx; color: #866b42; background: #fff5e5; font-size: 20rpx; line-height: 1.45; }
.primary { margin: 19rpx 0 22rpx; height: 72rpx; line-height: 72rpx; border-radius: 36rpx; color: white; background: var(--zs-green); font-size: 23rpx; font-weight: 750; }
.card { margin-top: 15rpx; padding: 22rpx; border: 1rpx solid var(--zs-border); border-radius: 18rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12rpx; }
.title { flex: 1; color: var(--zs-ink); font-size: 26rpx; line-height: 1.4; font-weight: 750; }
.status { flex-shrink: 0; padding: 6rpx 10rpx; border-radius: 8rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 19rpx; }
.line, .reason { margin-top: 11rpx; color: var(--zs-muted); font-size: 21rpx; line-height: 1.5; }
.reason { color: #a36b36; }
.row { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 18rpx; padding-top: 15rpx; border-top: 1rpx solid var(--zs-border); }
.row button { margin: 0; padding: 0 16rpx; height: 55rpx; line-height: 55rpx; border-radius: 28rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 20rpx; }
.row .danger-action { color: #a85c48; background: #fff0ea; }
</style>
