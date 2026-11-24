<template>
  <view class="page" v-if="authorized">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">OPERATIONS</text>
      <view class="zs-page-hero__title">运营管理台</view>
      <text class="zs-page-hero__subtitle">审核、配置和争议处理</text>
    </view>
    <view class="notice">{{ USE_MOCK ? '本地管理员演示。这里只验证审核与举报状态，不代表真实管理员身份或已部署后台。' : '运营管理台：审核决定与配置变更会写入云端审计记录。' }}</view>
    <scroll-view class="tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <button :class="{ active: tab === 'infos' }" @tap="tab = 'infos'">待审信息 ({{ pendingInfos.length }})</button>
        <button :class="{ active: tab === 'merchantApps' }" @tap="tab = 'merchantApps'">商家申请 ({{ pendingMerchantApps.length }})</button>
        <button :class="{ active: tab === 'merchants' }" @tap="tab = 'merchants'">商家管理</button>
        <button v-if="!USE_MOCK" :class="{ active: tab === 'users' }" @tap="tab = 'users'">用户管理</button>
        <button :class="{ active: tab === 'coupons' }" @tap="tab = 'coupons'">券管理</button>
        <button id="admin-cooperation-tab" :class="{ active: tab === 'cooperations' }" @tap="tab = 'cooperations'">合作审核 ({{ pendingCooperations.length }})</button>
        <button :class="{ active: tab === 'resultDisputes' }" @tap="tab = 'resultDisputes'">结果争议 ({{ actionableResults.length }})</button>
        <button id="admin-config-tab" :class="{ active: tab === 'config' }" @tap="tab = 'config'">地区与分类</button>
        <button :class="{ active: tab === 'reports' }" @tap="tab = 'reports'">待处理举报 ({{ reports.length }})</button>
        <button :class="{ active: tab === 'audit' }" @tap="tab = 'audit'">操作记录</button>
      </view>
    </scroll-view>

    <view v-if="tab === 'merchantApps'">
      <view class="empty" v-if="pendingMerchantApps.length === 0">暂无待审商家申请</view>
      <view class="card" v-for="item in pendingMerchantApps" :key="item._id">
        <view class="title">{{ item.name }}</view>
        <view class="line">{{ item.category_name }} · {{ item.town }} · {{ item.address }}</view>
        <view class="line">资质说明：{{ item.qualification_note }}</view>
        <view class="line">资质图片：{{ item.qualification_images.length }} 张</view>
        <view class="qualification-gallery" v-if="qualificationImages(item).length">
          <image v-for="(url, index) in qualificationImages(item)" :key="url" class="qualification-image" :src="url" mode="aspectFill" @tap="previewQualification(item, index)" />
        </view>
        <view class="image-warning" v-else-if="item.qualification_images.length">资质图片暂无法预览，请刷新后核对，勿直接通过。</view>
        <input class="field" :id="'merchant-review-note-' + item._id" placeholder="拒绝时必填原因" v-model="notes[item._id]" />
        <view class="actions">
          <button class="approve" :id="'merchant-approve-' + item._id" :disabled="item.qualification_images.length > 0 && qualificationImages(item).length === 0" @tap="reviewMerchant(item._id, true)">通过入驻</button>
          <button :id="'merchant-reject-' + item._id" @tap="reviewMerchant(item._id, false)">拒绝申请</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'merchants'">
      <view class="card" v-for="item in merchants" :key="item._id">
        <view class="title">{{ item.name }} · {{ item.status }}</view>
        <view class="line">{{ item.category_name }} · {{ item.town }}</view>
        <view v-if="item.status === 'APPROVED'">
          <input class="field" :id="'merchant-suspend-note-' + item._id" placeholder="停用时填写原因" v-model="notes[item._id]" />
          <button :id="'merchant-suspend-' + item._id" @tap="suspendMerchant(item._id)">停用商家</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'users' && !USE_MOCK">
      <view class="notice">按用户编号核对投诉与发布记录后处理。停用会阻止领券、预约、发布和商家操作；管理员账号需由环境所有者管理。</view>
      <view class="card" v-for="item in users" :key="item._id">
        <view class="title">{{ item._id }} · {{ item.status }}</view>
        <view class="line">角色 {{ item.role }} · 创建 {{ formatTime(item.created_at) }}</view>
        <view class="line" v-if="item.status_reason">最近处理依据：{{ item.status_reason }}</view>
        <input class="field" :id="'user-reason-' + item._id" placeholder="停用或恢复时填写处理依据" v-model="notes[item._id]" />
        <button :id="'user-status-' + item._id" v-if="item.role !== 'ADMIN'" @tap="setUserStatus(item._id, item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')">{{ item.status === 'ACTIVE' ? '停用用户' : '恢复用户' }}</button>
      </view>
      <button v-if="usersHasMore" @tap="loadMoreUsers">加载更多用户</button>
    </view>

    <view v-if="tab === 'coupons'">
      <view class="card" v-for="item in coupons" :key="item._id">
        <view class="title">{{ item.title }} · {{ item.status }}</view>
        <view class="line">{{ item.merchant_name }} · {{ item.start_time }} 至 {{ item.end_time }}</view>
        <view v-if="item.status === 'ACTIVE'">
          <input class="field" :id="'coupon-stop-note-' + item._id" placeholder="强制停用原因" v-model="notes[item._id]" />
          <button :id="'coupon-stop-' + item._id" @tap="stopCoupon(item._id)">强制停止新领券</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'cooperations'">
      <view class="empty" v-if="pendingCooperations.length === 0">暂无待审合作</view>
      <view class="card" v-for="item in pendingCooperations" :key="item._id">
        <view class="title">{{ item.target_coupon_title || item.target_coupon_id }}</view>
        <view class="line">买方 {{ item.buyer_merchant_name }} → 入口 {{ item.promoter_merchant_name }}</view>
        <view class="line">{{ item.pricing_model }} · {{ item.start_date }} 至 {{ item.end_date }} · 新客规则 {{ item.new_customer_rule }}</view>
        <view class="line">报价 {{ item.pricing_model === 'BY_SLOT' ? item.slot_price_cents : item.unit_price_cents }} 分 · 平台费用 {{ item.platform_fee_cents }} 分</view>
        <input class="field" :id="'coop-review-note-' + item._id" placeholder="拒绝时必填原因" v-model="notes[item._id]" />
        <view class="actions">
          <button class="approve" :id="'coop-approve-' + item._id" @tap="reviewCooperation(item._id, true)">审核通过</button>
          <button :id="'coop-reject-' + item._id" @tap="reviewCooperation(item._id, false)">拒绝合作</button>
        </view>
      </view>
      <view class="card" v-for="item in placements" :key="item._id">
        <view class="title">{{ item.source_merchant_name }} 展示 {{ item.target_coupon_title }}</view>
        <view class="line">福利位 {{ item.status === 'ACTIVE' ? '展示中' : '已隐藏' }} · 当前顺序 {{ item.sort }}</view>
        <input class="field" type="number" :id="'placement-sort-' + item._id" placeholder="顺序 1–5" v-model="placementSorts[item._id]" />
        <input class="field" :id="'placement-reason-' + item._id" placeholder="调整顺序或显示状态的依据（至少 3 字）" v-model="notes[item._id]" />
        <view class="actions">
          <button :id="'placement-save-' + item._id" @tap="setPlacement(item._id, item.status === 'ACTIVE')">保存顺序</button>
          <button :id="'placement-toggle-' + item._id" @tap="setPlacement(item._id, item.status !== 'ACTIVE')">{{ item.status === 'ACTIVE' ? '隐藏此券' : '恢复展示' }}</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'resultDisputes'">
      <view class="empty" v-if="actionableResults.length === 0">暂无待处理或可更正的结果</view>
      <view class="card" v-for="item in actionableResults" :key="item._id">
        <view class="title">券码 {{ item.coupon_code }} · {{ item.status }}</view>
        <view class="line">买方依据：{{ item.buyer_note || '无' }} · 入口店意见：{{ item.promoter_note || '无' }}</view>
        <input class="field" :id="'result-resolution-' + item._id" placeholder="填写争议或退款处理依据" v-model="notes[item._id]" />
        <view class="actions" v-if="item.status === 'DISPUTED'">
          <button class="approve" @tap="resolveResult(item._id, true)">确认为有效</button>
          <button @tap="resolveResult(item._id, false)">判定无效</button>
        </view>
        <button v-if="item.status === 'CONFIRMED'" @tap="resolveResult(item._id, false)">退款／异常：更正为无效</button>
      </view>
    </view>

    <view v-if="tab === 'config'">
      <view class="notice">停用选项会阻止新的发布和入驻申请；已审核的存量内容不会自动下架，请按实际情况单独处理。</view>
      <view class="card" v-for="section in configSections" :key="section.key">
        <view class="title">{{ section.title }}</view>
        <view class="line" v-for="item in config[section.key]" :key="item.id">
          {{ item.name }} {{ item.code || '' }} · {{ item.active ? '启用' : '停用' }}
          <button :id="'config-' + section.key + '-' + item.id" @tap="toggleConfig(section.key, item.id, !item.active)">{{ item.active ? '停用' : '启用' }}</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'infos'">
      <view class="empty" v-if="pendingInfos.length === 0">暂无待审信息</view>
      <view class="card" v-for="item in pendingInfos" :key="item._id">
        <view class="title">{{ item.title }}</view>
        <view class="line">{{ item.category_name }} · {{ item.town }} · 发布者 {{ item.author_name }} · 用户编号 {{ item.user_id.startsWith('user_') ? item.user_id : 'user_' + item.user_id }}</view>
        <view class="line">{{ item.content }}</view>
        <input class="field" :id="'review-note-' + item._id" placeholder="拒绝时必填原因；通过可写说明" v-model="notes[item._id]" />
        <view class="actions">
          <button class="approve" :id="'approve-' + item._id" @tap="review(item._id, true)">审核通过</button>
          <button :id="'reject-' + item._id" @tap="review(item._id, false)">拒绝并说明</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'reports'">
      <view class="empty" v-if="reports.length === 0">暂无待处理举报</view>
      <view class="card" v-for="report in reports" :key="report._id">
        <view class="title">{{ infoTitle(report.info_id) }}</view>
        <view class="line">举报原因：{{ report.reason }}</view>
        <view class="line">提交时间：{{ formatTime(report.created_at) }}</view>
        <input class="field" :id="'report-note-' + report._id" placeholder="填写处理依据" v-model="notes[report._id]" />
        <view class="actions">
          <button :id="'dismiss-' + report._id" @tap="handleReport(report._id, false)">不予下架</button>
          <button class="approve" :id="'offline-' + report._id" @tap="handleReport(report._id, true)">下架信息</button>
        </view>
      </view>
    </view>

    <view v-if="tab === 'audit'">
      <view class="empty" v-if="USE_MOCK ? logs.length + merchantLogs.length === 0 : cloudAudits.length === 0">暂无操作记录</view>
      <view class="card" v-for="log in USE_MOCK ? logs : cloudAudits" :key="log._id">
        <view class="line">{{ log.action }} · {{ log.target_id }}</view>
        <view class="line">{{ log.reason }} · {{ formatTime(log.created_at) }}</view>
      </view>
      <view class="card" v-for="log in USE_MOCK ? merchantLogs : []" :key="log._id">
        <view class="line">{{ log.action }} · {{ log.target_id }}</view>
        <view class="line">{{ log.reason }} · {{ formatTime(log.created_at) }}</view>
      </view>
    </view>
  </view>
  <view class="page" v-else>当前身份无权访问管理台。</view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { useUserStore } from '@/store/user';
import { adminAllInfos, adminPendingInfos, adminOpenReports, adminAuditLogs, adminReviewInfo, adminHandleReport } from '@/api/info';
import { adminPendingMerchantApplications, adminAllMerchants, adminReviewMerchantApplication, adminSuspendMerchant, adminMerchantAuditLogs } from '@/api/merchant';
import { adminAllCouponTemplates, adminForcePauseCouponTemplate } from '@/api/couponManage';
import { adminPendingCooperations, adminReviewCooperation, adminActionableResults, adminResolveResult, adminPlacements, adminSetPlacement } from '@/api/cooperation';
import { getAdminConfig, setConfigActive } from '@/api/config';
import { adminListUsers, adminSetUserStatus, adminAllAudits, type ManagedUser, type ManagedAudit } from '@/api/userManage';
import { useConfigStore } from '@/store/config';
import type { InfoItem, InfoReport, InfoAuditLog } from '@/types/info';
import type { Merchant, MerchantApplication } from '@/types/merchant';
import type { CouponTemplate } from '@/types/coupon';
import type { CooperationOffer, CooperationResult, PlacementConfig } from '@/types/cooperation';
import type { AppConfig } from '@/types/config';
import baseConfig from '../../../cloudfunctions/configManage/base.json';

const userStore = useUserStore();
const configStore = useConfigStore();
const authorized = computed(() => USE_MOCK ? userStore.isDemoAdmin : userStore.profile?.role === 'ADMIN');
const tab = ref<'infos' | 'merchantApps' | 'merchants' | 'users' | 'coupons' | 'cooperations' | 'resultDisputes' | 'config' | 'reports' | 'audit'>('infos');
const pendingInfos = ref<InfoItem[]>([]);
const allInfos = ref<InfoItem[]>([]);
const reports = ref<InfoReport[]>([]);
const logs = ref<InfoAuditLog[]>([]);
const pendingMerchantApps = ref<MerchantApplication[]>([]);
const qualificationImages = (item: MerchantApplication) => item.qualification_image_urls?.length
  ? item.qualification_image_urls
  : USE_MOCK ? item.qualification_images : [];
const previewQualification = (item: MerchantApplication, index: number) => {
  const urls = qualificationImages(item);
  if (urls.length) uni.previewImage({ urls, current: urls[index] });
};
const merchants = ref<Merchant[]>([]);
const merchantLogs = ref<InfoAuditLog[]>([]);
const coupons = ref<CouponTemplate[]>([]);
const pendingCooperations = ref<CooperationOffer[]>([]);
const placements = ref<PlacementConfig[]>([]);
const placementSorts = ref<Record<string, string>>({});
const actionableResults = ref<CooperationResult[]>([]);
const notes = ref<Record<string, string>>({});
const config = ref<AppConfig>(JSON.parse(JSON.stringify(baseConfig)));
const users = ref<ManagedUser[]>([]);
const cloudAudits = ref<ManagedAudit[]>([]);
const usersPage = ref(1);
const usersHasMore = ref(false);
const configSections: { key: keyof AppConfig; title: string }[] = [
  { key: 'towns', title: '乡镇' }, { key: 'infoCategories', title: '便民分类' }, { key: 'merchantCategories', title: '商家品类' }
];

const load = async () => {
  if (!authorized.value) return;
  [pendingInfos.value, allInfos.value, reports.value, logs.value, pendingMerchantApps.value, merchants.value, merchantLogs.value, coupons.value, pendingCooperations.value, actionableResults.value, config.value] = await Promise.all([
    adminPendingInfos(), adminAllInfos(), adminOpenReports(), adminAuditLogs(), adminPendingMerchantApplications(), adminAllMerchants(), adminMerchantAuditLogs(), adminAllCouponTemplates(), adminPendingCooperations(), adminActionableResults(), getAdminConfig()
  ]);
  placements.value = await adminPlacements();
  placementSorts.value = Object.fromEntries(placements.value.map(item => [item._id, String(item.sort)]));
  if (!USE_MOCK) {
    const [result, audits] = await Promise.all([adminListUsers(1), adminAllAudits()]);
    users.value = result.list;
    cloudAudits.value = audits;
    usersPage.value = 1;
    usersHasMore.value = result.hasMore;
  }
};
onShow(load);
watch(authorized, value => { if (value) load(); });
const infoTitle = (id: string) => allInfos.value.find(item => item._id === id)?.title || id;
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN');

const run = async (action: () => Promise<void>) => {
  try { await action(); await load(); uni.showToast({ title: USE_MOCK ? '本地演示记录已更新' : '记录已更新', icon: 'none' }); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '处理失败', icon: 'none' }); }
};
const review = (id: string, approve: boolean) => run(() => adminReviewInfo(id, approve, notes.value[id] || ''));
const handleReport = (id: string, offline: boolean) => run(() => adminHandleReport(id, offline, notes.value[id] || ''));
const reviewMerchant = (id: string, approve: boolean) => run(() => adminReviewMerchantApplication(id, approve, notes.value[id] || ''));
const suspendMerchant = (id: string) => run(() => adminSuspendMerchant(id, notes.value[id] || ''));
const stopCoupon = (id: string) => run(() => adminForcePauseCouponTemplate(id, notes.value[id] || ''));
const reviewCooperation = (id: string, approve: boolean) => run(() => adminReviewCooperation(id, approve, notes.value[id] || ''));
const setPlacement = (id: string, active: boolean) => run(() => adminSetPlacement(id, Number(placementSorts.value[id]), active, notes.value[id] || ''));
const resolveResult = (id: string, valid: boolean) => run(() => adminResolveResult(id, valid, notes.value[id] || ''));
const toggleConfig = (section: keyof AppConfig, id: string, active: boolean) => run(async () => { await setConfigActive(section, id, active); await configStore.load(); });
const setUserStatus = (id: string, status: ManagedUser['status']) => run(() => adminSetUserStatus(id, status, notes.value[id] || ''));
const loadMoreUsers = async () => {
  try {
    const next = usersPage.value + 1;
    const result = await adminListUsers(next);
    users.value.push(...result.list);
    usersPage.value = next;
    usersHasMore.value = result.hasMore;
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' }); }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--zs-canvas); }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.tabs { width: 100%; margin: 17rpx 0 20rpx; white-space: nowrap; }
.tabs-inner { display: inline-flex; gap: 9rpx; padding-bottom: 7rpx; }
.tabs button { flex-shrink: 0; width: auto; height: 59rpx; line-height: 59rpx; margin: 0; padding: 0 18rpx; border-radius: 30rpx; color: #66796b; background: #e9eee8; font-size: 20rpx; }
.tabs button.active { color: #fff; background: var(--zs-green); font-weight: 700; }
.card { margin: 16rpx 0; padding: 22rpx; border: 1rpx solid var(--zs-border); border-radius: 18rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.title { color: var(--zs-ink); font-size: 26rpx; line-height: 1.4; font-weight: 750; }
.line { margin: 10rpx 0; color: var(--zs-muted); font-size: 21rpx; line-height: 1.5; }
.field { width: 100%; min-height: 70rpx; box-sizing: border-box; margin: 12rpx 0; padding: 0 16rpx; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 22rpx; }
.actions { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 13rpx; }
.card button, .actions button { margin: 11rpx 0 0; padding: 0 17rpx; min-height: 58rpx; line-height: 58rpx; border-radius: 29rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; }
.actions button { flex: 1; margin: 0; }
.card .approve, .actions .approve { color: white; background: var(--zs-green); font-weight: 700; }
.empty { padding: 75rpx 15rpx; color: var(--zs-muted); font-size: 22rpx; text-align: center; }
.qualification-gallery { display: flex; flex-wrap: wrap; gap: 12rpx; margin: 14rpx 0; }
.qualification-image { width: 142rpx; height: 142rpx; border-radius: 10rpx; background: #eef2ed; }
.image-warning { margin: 13rpx 0; padding: 13rpx; border-radius: 8rpx; color: #955e27; background: #fff4e3; font-size: 20rpx; }
</style>
