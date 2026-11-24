<template>
  <view class="page" v-if="merchant && canManage">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">SHOP BENEFITS</text>
      <view class="zs-page-hero__title">本店优惠券</view>
      <text class="zs-page-hero__subtitle">创建券规则，管理上架状态</text>
    </view>
    <view class="notice">{{ USE_MOCK ? '本地演示券管理；' : '' }}当前支持满减与体验券。已领取券保留领取时的规则快照，不能直接修改模板。</view>
    <view class="card">
      <view class="title">{{ merchant.name }} · 新建券草稿</view>
      <view class="label">标题</view><input id="coupon-title" class="field" placeholder="说明实际优惠" v-model="form.title" />
      <view class="label">类型</view><picker :range="typeNames" :value="typeIndex" @change="onTypeChange"><view class="field">{{ typeNames[typeIndex] }} ▼</view></picker>
      <view class="label">使用方式</view><picker :range="modeNames" :value="modeIndex" @change="onModeChange"><view class="field">{{ modeNames[modeIndex] }} ▼</view></picker>
      <view class="label">使用门槛（元，体验券可填 0）</view><input id="coupon-condition" class="field" type="digit" v-model="form.condition_amount" />
      <view class="label">优惠金额（元）</view><input id="coupon-discount" class="field" type="digit" v-model="form.discount_amount" />
      <view class="label">总数量</view><input id="coupon-total" class="field" type="number" v-model="form.total_count" />
      <view class="label">每人限领</view><input id="coupon-limit" class="field" type="number" v-model="form.per_user_limit" />
      <view class="label">有效期</view>
      <view class="row">
        <picker mode="date" :value="form.start_time" @change="form.start_time = $event.detail.value"><view class="field">开始 {{ form.start_time }}</view></picker>
        <picker mode="date" :value="form.end_time" @change="form.end_time = $event.detail.value"><view class="field">结束 {{ form.end_time }}</view></picker>
      </view>
      <view class="label">完整使用规则</view><textarea id="coupon-rules" class="field textarea" placeholder="门槛、适用项目、预约要求和除外情形" v-model="form.instructions" />
      <button id="coupon-create" class="primary" @tap="create">保存草稿</button>
    </view>
    <view class="card">
      <view class="title">本店券模板</view>
      <view class="empty" v-if="templates.length === 0">尚未建券</view>
      <view class="template" v-for="item in templates" :key="item._id">
        <view class="name">{{ item.title }} · {{ statusText(item.status) }}</view>
        <view class="line">{{ item.usage_mode }} · 满 {{ item.condition_amount }} 减 {{ item.discount_amount }} · {{ item.start_time }} 至 {{ item.end_time }}</view>
        <view class="line">已领 {{ item.claimed_count }} / {{ item.total_count }} · 已核 {{ item.redeemed_count }} · 每人限领 {{ item.per_user_limit }}</view>
        <view class="line">{{ item.instructions }}</view>
        <button class="primary" :id="'coupon-activate-' + item._id" v-if="['DRAFT','PAUSED'].includes(item.status)" @tap="activate(item._id)">上架</button>
        <button :id="'coupon-pause-' + item._id" v-if="item.status === 'ACTIVE'" @tap="pause(item._id)">暂停新领券</button>
      </view>
    </view>
  </view>
  <view class="page access-note" v-else>{{ accessMessage }}</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { useMerchantStore } from '@/store/merchant';
import { getMerchantCouponTemplates, createCouponTemplate, activateCouponTemplate, pauseCouponTemplate, type CouponDraftInput } from '@/api/couponManage';
import type { CouponTemplate } from '@/types/coupon';

const store = useMerchantStore();
const merchant = computed(() => store.currentMerchant);
const canManage = computed(() => !!merchant.value && merchant.value.status === 'APPROVED' && (USE_MOCK || merchant.value.access_role === 'OWNER'));
const accessMessage = computed(() => !merchant.value ? '当前没有可管理的店铺。' : merchant.value.status !== 'APPROVED' ? '门店尚未审核通过或已停用，暂不能管理优惠券。' : '只有店主可管理本店优惠券。');
const types = [{ id: 'FULL_REDUCTION', name: '满减券' }, { id: 'EXPERIENCE', name: '体验券' }] as const;
const modes = [{ id: 'INSTANT', name: '本店当场用' }, { id: 'WALK_IN', name: '以后到店用' }, { id: 'BOOKING', name: '需预约' }] as const;
const typeNames = types.map(item => item.name);
const modeNames = modes.map(item => item.name);
const typeIndex = ref(0);
const modeIndex = ref(0);
const now = new Date();
const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const form = ref<CouponDraftInput>({ title: '', type: 'FULL_REDUCTION', usage_mode: 'INSTANT', condition_amount: '', discount_amount: '', total_count: '', per_user_limit: '1', start_time: dateString(now), end_time: dateString(new Date(now.getTime() + 30 * 86400000)), instructions: '' });
const templates = ref<CouponTemplate[]>([]);
const load = async () => {
  templates.value = [];
  if (!canManage.value) return;
  try { templates.value = await getMerchantCouponTemplates(merchant.value!._id); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '券模板加载失败', icon: 'none' }); }
};
onShow(load);
const onTypeChange = (event: any) => { typeIndex.value = Number(event.detail.value); form.value.type = types[typeIndex.value].id; };
const onModeChange = (event: any) => { modeIndex.value = Number(event.detail.value); form.value.usage_mode = modes[modeIndex.value].id; };
const statusText = (status: string) => ({ DRAFT: '草稿', ACTIVE: '上架中', PAUSED: '已暂停', ENDED: '已结束' } as Record<string, string>)[status] || status;
const run = async (action: () => Promise<unknown>) => { try { await action(); await load(); uni.showToast({ title: USE_MOCK ? '本地券状态已更新' : '券状态已更新', icon: 'none' }); } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' }); } };
const create = () => { if (merchant.value) run(() => createCouponTemplate(merchant.value!._id, form.value)); };
const activate = (id: string) => { if (merchant.value) run(() => activateCouponTemplate(id, merchant.value!._id)); };
const pause = (id: string) => { if (merchant.value) run(() => pauseCouponTemplate(id, merchant.value!._id)); };
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--zs-canvas); }
.access-note { color: var(--zs-muted); font-size: 24rpx; line-height: 1.5; }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.card { margin: 17rpx 0; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.title { color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.label { display: block; margin-top: 22rpx; color: var(--zs-ink); font-size: 22rpx; font-weight: 700; }
.field { width: 100%; min-height: 72rpx; margin-top: 9rpx; padding: 0 17rpx; box-sizing: border-box; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 23rpx; }
picker .field { display: flex; align-items: center; padding: 14rpx 17rpx; }
.textarea { height: 155rpx; padding: 15rpx 17rpx; }
.row { display: flex; gap: 11rpx; }
.row picker { flex: 1; min-width: 0; }
.card button { margin: 17rpx 0 0; padding: 0 20rpx; height: 62rpx; line-height: 62rpx; border-radius: 31rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; }
.card .primary { color: white; background: var(--zs-green); font-weight: 700; }
#coupon-create { width: 100%; height: 76rpx; line-height: 76rpx; margin-top: 26rpx; font-size: 23rpx; }
.template { padding: 19rpx 0; border-top: 1rpx solid var(--zs-border); }
.name { color: var(--zs-ink); font-size: 24rpx; font-weight: 750; }
.line { margin-top: 9rpx; color: var(--zs-muted); font-size: 21rpx; line-height: 1.45; }
.empty { padding: 28rpx 0; color: var(--zs-muted); font-size: 22rpx; }
</style>
