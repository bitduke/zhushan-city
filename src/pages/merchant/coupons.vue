<template>
  <view class="page" v-if="merchant && canManage">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">SHOP BENEFITS</text>
      <view class="zs-page-hero__title">本店优惠券</view>
      <text class="zs-page-hero__subtitle">行业营销参谋、联盟拉新与券规则管理</text>
    </view>
    <view class="notice">{{ USE_MOCK ? '本地演示券管理；' : '' }}当前支持满减与体验券。已领取券保留领取时的规则快照，不能直接修改模板。</view>

    <!-- 商家拓客参谋助手面板 -->
    <view class="card advisor-card">
      <view class="advisor-head" @tap="advisorExpanded = !advisorExpanded">
        <view class="advisor-head-left">
          <view class="advisor-title-row">
            <text class="advisor-badge">拓客参谋</text>
            <text class="title">行业营销方案 · 一键套用</text>
          </view>
          <text class="advisor-sub">已为【{{ merchant.category_name || '本地门店' }}】智能匹配单店提客与商圈跨店拉新模板</text>
        </view>
        <text class="advisor-toggle">{{ advisorExpanded ? '收起 ▲' : '展开 ▼' }}</text>
      </view>

      <view v-if="advisorExpanded" class="advisor-body">
        <!-- 目标筛选 -->
        <scroll-view class="goal-tabs" scroll-x show-scrollbar="false">
          <view class="goal-tabs-inner">
            <text
              v-for="g in ADVISOR_GOALS"
              :key="g.id"
              class="goal-chip"
              :class="{ active: selectedGoal === g.id }"
              @tap="selectedGoal = g.id"
            >{{ g.label }}</text>
          </view>
        </scroll-view>

        <!-- 行业切换 -->
        <view class="advisor-filter-row">
          <text class="filter-label">查看行业灵感：</text>
          <picker :range="advisorCatNames" :value="advisorCatIndex" @change="onAdvisorCatChange">
            <view class="advisor-cat-picker">{{ advisorCatNames[advisorCatIndex] }} ▼</view>
          </picker>
        </view>

        <!-- 方案卡片横向滑动区 -->
        <scroll-view class="playbook-scroll" scroll-x show-scrollbar="false">
          <view class="playbook-list">
            <view
              v-for="item in filteredPlaybooks"
              :key="item.id"
              class="playbook-item"
              :class="{ 'is-alliance': item.isAllianceRecommended }"
            >
              <view class="pb-top">
                <text class="pb-cat">{{ item.categoryName }}</text>
                <text class="pb-badge" :class="item.isAllianceRecommended ? 'alliance' : 'local'">{{ item.badge }}</text>
              </view>
              <view class="pb-title">{{ item.draft.title }}</view>
              <view class="pb-goal">{{ item.goalLabel }} · 推荐{{ item.validDays }}天</view>

              <view class="pb-tip-box">
                <view class="pb-tip"><text class="tip-tag">🤝 盟友：</text>{{ item.partnerAdvice }}</view>
                <view class="pb-tip"><text class="tip-tag">🛡️ 防亏：</text>{{ item.profitGuard }}</view>
                <view class="pb-script-row">
                  <text class="pb-script">💬 {{ item.cashierScript }}</text>
                  <text class="copy-script-btn" @tap="copyScript(item.cashierScript)">复制话术</text>
                </view>
              </view>

              <button class="pb-apply-btn" @tap="applyPlaybook(item)">✨ 一键填入下方草稿</button>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 新建券表单 -->
    <view class="card">
      <view class="title">{{ merchant.name }} · 新建券草稿</view>
      <view class="form-tip">提示：满减券使用门槛须大于优惠金额（如满58减8）；若挂到盟友店跨店拉新，建议选“以后到店用”且有效期60天。</view>
      <view class="label">标题</view><input id="coupon-title" class="field" placeholder="说明实际优惠（4~40字）" v-model="form.title" />
      <view class="label">类型</view><picker :range="typeNames" :value="typeIndex" @change="onTypeChange"><view class="field">{{ typeNames[typeIndex] }} ▼</view></picker>
      <view class="label">使用方式</view><picker :range="modeNames" :value="modeIndex" @change="onModeChange"><view class="field">{{ modeNames[modeIndex] }} ▼</view></picker>
      <view class="label">使用门槛（元，体验券可填 0）</view><input id="coupon-condition" class="field" type="digit" v-model="form.condition_amount" />
      <view class="label">优惠金额 / 礼品价值（元）</view><input id="coupon-discount" class="field" type="digit" v-model="form.discount_amount" />
      <view class="label">总数量</view><input id="coupon-total" class="field" type="number" v-model="form.total_count" />
      <view class="label">每人限领（1~5张，跨店拉新建议填 1）</view><input id="coupon-limit" class="field" type="number" v-model="form.per_user_limit" />
      <view class="label">有效期</view>
      <view class="row">
        <picker mode="date" :value="form.start_time" @change="form.start_time = $event.detail.value"><view class="field">开始 {{ form.start_time }}</view></picker>
        <picker mode="date" :value="form.end_time" @change="form.end_time = $event.detail.value"><view class="field">结束 {{ form.end_time }}</view></picker>
      </view>
      <view class="label">完整使用规则（不少于10字）</view><textarea id="coupon-rules" class="field textarea" placeholder="门槛、适用项目、预约要求和除外情形" v-model="form.instructions" />
      <button id="coupon-create" class="primary" @tap="create">保存草稿</button>
    </view>

    <!-- 本店券模板列表 -->
    <view class="card">
      <view class="title">本店券模板</view>
      <view class="empty" v-if="templates.length === 0">尚未建券，可在上方套用行业模板快速创建</view>
      <view class="template" v-for="item in templates" :key="item._id">
        <view class="name">{{ item.title }} · {{ statusText(item.status) }}</view>
        <view class="line">{{ modeText(item.usage_mode) }} · 满 {{ item.condition_amount }} 减 {{ item.discount_amount }} · {{ item.start_time }} 至 {{ item.end_time }}</view>
        <view class="line">已领 {{ item.claimed_count }} / {{ item.total_count }} · 已核 {{ item.redeemed_count }} · 每人限领 {{ item.per_user_limit }}</view>
        <view class="line">{{ item.instructions }}</view>
        <view class="tpl-actions">
          <button class="primary" :id="'coupon-activate-' + item._id" v-if="['DRAFT','PAUSED'].includes(item.status)" @tap="activate(item._id)">上架</button>
          <button :id="'coupon-pause-' + item._id" v-if="item.status === 'ACTIVE'" @tap="pause(item._id)">暂停新领券</button>
          <button class="alliance-go-btn" v-if="item.status === 'ACTIVE' && item.usage_mode !== 'INSTANT'" @tap="goCooperation">去发起跨店合作 ›</button>
        </view>
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
import {
  ADVISOR_CATEGORIES,
  ADVISOR_GOALS,
  COUPON_ADVISOR_PLAYBOOKS,
  type AdvisorGoal,
  type AdvisorPlaybook
} from '@/constants/couponAdvisor';
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

const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const createDefaultForm = (days = 30): CouponDraftInput => {
  const now = new Date();
  return {
    title: '',
    type: 'FULL_REDUCTION',
    usage_mode: 'INSTANT',
    condition_amount: '',
    discount_amount: '',
    total_count: '',
    per_user_limit: '1',
    start_time: dateString(now),
    end_time: dateString(new Date(now.getTime() + days * 86400000)),
    instructions: ''
  };
};

const form = ref<CouponDraftInput>(createDefaultForm());
const templates = ref<CouponTemplate[]>([]);

// 参谋助手状态
const advisorExpanded = ref(true);
const selectedGoal = ref<AdvisorGoal>('ALL');
const advisorCategories = [
  { id: 'match', name: '本行业优先（含通用）' },
  ...ADVISOR_CATEGORIES
];
const advisorCatNames = advisorCategories.map(c => c.name);
const advisorCatIndex = ref(0);

const filteredPlaybooks = computed(() => {
  const catFilter = advisorCategories[advisorCatIndex.value]?.id || 'match';
  const myCatId = merchant.value?.category_id || '';

  let list = COUPON_ADVISOR_PLAYBOOKS.filter(item => {
    if (selectedGoal.value !== 'ALL' && item.goal !== selectedGoal.value) return false;
    if (catFilter === 'match') {
      return item.categoryId === myCatId || item.categoryId === 'common';
    }
    return item.categoryId === catFilter;
  });

  // 本行业排在最前面
  return [...list].sort((a, b) => {
    const aMine = a.categoryId === myCatId ? 1 : 0;
    const bMine = b.categoryId === myCatId ? 1 : 0;
    return bMine - aMine;
  });
});

const onAdvisorCatChange = (e: any) => {
  advisorCatIndex.value = Number(e.detail.value);
};

const fillFormWithPlaybook = (playbook: AdvisorPlaybook, overrideMode?: 'WALK_IN' | 'INSTANT') => {
  const now = new Date();
  const targetMode = overrideMode || playbook.draft.usage_mode;
  const tIdx = types.findIndex(t => t.id === playbook.draft.type);
  const mIdx = modes.findIndex(m => m.id === targetMode);
  typeIndex.value = tIdx >= 0 ? tIdx : 0;
  modeIndex.value = mIdx >= 0 ? mIdx : 0;

  form.value = {
    title: playbook.draft.title,
    type: playbook.draft.type,
    usage_mode: targetMode,
    condition_amount: playbook.draft.condition_amount,
    discount_amount: playbook.draft.discount_amount,
    total_count: playbook.draft.total_count,
    per_user_limit: playbook.draft.per_user_limit,
    start_time: dateString(now),
    end_time: dateString(new Date(now.getTime() + playbook.validDays * 86400000)),
    instructions: playbook.draft.instructions
  };
  uni.showToast({ title: '已套用方案，可微调金额后保存草稿', icon: 'none' });
};

const applyPlaybook = (playbook: AdvisorPlaybook) => {
  if (playbook.draft.usage_mode === 'BOOKING' && (!merchant.value?.daily_booking_limit || merchant.value.daily_booking_limit < 1)) {
    uni.showModal({
      title: '预约券前置提示',
      content: '该方案为【需预约】券，但当前店铺尚未设置每日接待上限，保存会受阻。您希望先改为“以后到店用（免预约）”，还是前往店铺资料设置？',
      confirmText: '改为免预约用',
      cancelText: '去设置上限',
      confirmColor: '#17664c',
      success: (res) => {
        if (res.confirm) {
          fillFormWithPlaybook(playbook, 'WALK_IN');
        } else if (res.cancel) {
          uni.navigateTo({ url: '/pages/merchant/manage' });
        }
      }
    });
    return;
  }
  fillFormWithPlaybook(playbook);
};

const copyScript = (text: string) => {
  uni.setClipboardData({
    data: text.replace(/^[“"]|[”"]$/g, ''),
    success: () => uni.showToast({ title: '收银员话术已复制', icon: 'success' })
  });
};

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
const modeText = (mode: string) => ({ INSTANT: '本店当场用', WALK_IN: '以后到店用', BOOKING: '需预约' } as Record<string, string>)[mode] || mode;

const run = async (action: () => Promise<unknown>, successMsg?: string) => {
  try {
    await action();
    await load();
    uni.showToast({ title: successMsg || (USE_MOCK ? '本地券状态已更新' : '券状态已更新'), icon: 'none' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' });
  }
};

const create = () => {
  if (!merchant.value) return;
  const isCrossReady = form.value.usage_mode !== 'INSTANT';
  const msg = isCrossReady
    ? '草稿已保存！记得点击下方「上架」，然后去合作页挂到盟友店'
    : '草稿已保存！请在下方列表点击「上架」后对外生效';
  run(() => createCouponTemplate(merchant.value!._id, form.value), msg);
};
const activate = (id: string) => { if (merchant.value) run(() => activateCouponTemplate(id, merchant.value!._id)); };
const pause = (id: string) => { if (merchant.value) run(() => pauseCouponTemplate(id, merchant.value!._id)); };
const goCooperation = () => uni.navigateTo({ url: '/pages/merchant/cooperation' });
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx 24rpx 60rpx; background: var(--zs-canvas); }
.access-note { color: var(--zs-muted); font-size: 24rpx; line-height: 1.5; }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.card { margin: 17rpx 0; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.title { color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.form-tip { margin-top: 10rpx; padding: 10rpx 14rpx; border-radius: 10rpx; background: #f3f7f4; color: #546e5d; font-size: 20rpx; line-height: 1.45; }

/* 拓客参谋样式 */
.advisor-card { border-top: 6rpx solid var(--zs-terracotta, #e05d26); }
.advisor-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12rpx; }
.advisor-head-left { flex: 1; }
.advisor-title-row { display: flex; align-items: center; gap: 10rpx; }
.advisor-badge { background: #e05d26; color: #fff; font-size: 18rpx; font-weight: 700; padding: 3rpx 10rpx; border-radius: 8rpx; }
.advisor-sub { display: block; margin-top: 8rpx; color: var(--zs-muted); font-size: 20rpx; line-height: 1.4; }
.advisor-toggle { font-size: 20rpx; color: var(--zs-green); font-weight: 600; white-space: nowrap; padding-top: 4rpx; }
.advisor-body { margin-top: 20rpx; padding-top: 16rpx; border-top: 1rpx dashed var(--zs-border); }

.goal-tabs { width: 100%; white-space: nowrap; margin-bottom: 14rpx; }
.goal-tabs-inner { display: inline-flex; gap: 10rpx; padding-bottom: 4rpx; }
.goal-chip { padding: 8rpx 18rpx; border-radius: 24rpx; font-size: 21rpx; color: #516658; background: #f2f5f3; }
.goal-chip.active { background: var(--zs-green); color: #fff; font-weight: 700; }

.advisor-filter-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.filter-label { font-size: 21rpx; color: var(--zs-muted); }
.advisor-cat-picker { font-size: 21rpx; font-weight: 700; color: var(--zs-green); background: var(--zs-green-soft); padding: 6rpx 16rpx; border-radius: 10rpx; }

.playbook-scroll { width: 100%; }
.playbook-list { display: flex; gap: 16rpx; padding-bottom: 6rpx; }
.playbook-item { width: 540rpx; flex-shrink: 0; padding: 20rpx; border-radius: 16rpx; border: 1.5rpx solid #e3ebe6; background: #fbfdfb; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
.playbook-item.is-alliance { border-color: #f3c8b6; background: #fffbf9; }
.pb-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.pb-cat { font-size: 19rpx; font-weight: 700; color: #5e7566; }
.pb-badge { font-size: 18rpx; font-weight: 700; padding: 3rpx 10rpx; border-radius: 8rpx; }
.pb-badge.alliance { background: #fdece5; color: #c74714; }
.pb-badge.local { background: #e8f5ef; color: #17664c; }
.pb-title { font-size: 26rpx; font-weight: 800; color: var(--zs-ink); line-height: 1.3; }
.pb-goal { font-size: 20rpx; color: #e05d26; font-weight: 600; margin-top: 6rpx; margin-bottom: 12rpx; }

.pb-tip-box { background: #ffffff; border: 1rpx solid #edf2ef; border-radius: 12rpx; padding: 12rpx 14rpx; display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 14rpx; }
.pb-tip { font-size: 19rpx; color: #4b5e52; line-height: 1.45; }
.tip-tag { font-weight: 700; color: var(--zs-ink); }
.pb-script-row { display: flex; flex-direction: column; gap: 6rpx; padding-top: 6rpx; border-top: 1rpx dashed #edf2ef; }
.pb-script { font-size: 19rpx; color: #17664c; line-height: 1.4; }
.copy-script-btn { align-self: flex-end; font-size: 18rpx; font-weight: 700; color: var(--zs-green); background: var(--zs-green-soft); padding: 4rpx 12rpx; border-radius: 8rpx; }

.pb-apply-btn { margin: 0 !important; width: 100%; height: 60rpx !important; line-height: 60rpx !important; border-radius: 12rpx !important; background: linear-gradient(135deg, #17664c, #1e7d5d) !important; color: #fff !important; font-size: 22rpx !important; font-weight: 700; }

/* 原有表单样式 */
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
.tpl-actions { display: flex; flex-wrap: wrap; gap: 12rpx; }
.alliance-go-btn { background: #fff3ed !important; color: #d9521e !important; font-weight: 700; }
.empty { padding: 28rpx 0; color: var(--zs-muted); font-size: 22rpx; }
</style>
