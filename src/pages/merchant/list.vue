<template>
  <view class="merchant-list-page">
    <view class="page-hero">
      <text class="hero-kicker">LOCAL SHOPS</text>
      <view class="hero-title">逛逛竹山好店</view>
      <view class="hero-subtitle">找附近的店，看看有哪些实在福利</view>
      <view class="search-row">
        <image :src="'/static/icons/search.png'" mode="aspectFit" />
        <input id="merchant-keyword" v-model="keyword" class="keyword" placeholder="搜索店名或服务" confirm-type="search" @confirm="search" />
        <view class="search-button" @tap="search">搜索</view>
      </view>
    </view>

    <view class="content">
      <view class="filter-panel">
        <view class="filter-title">筛选好店</view>
        <view class="filter-row">
          <picker :range="categoryNames" :value="categoryIndex" @change="onCategoryChange">
            <view class="filter-chip">{{ categoryNames[categoryIndex] || '全部品类' }} <text>⌄</text></view>
          </picker>
          <picker :range="townNames" :value="townIndex" @change="onTownChange">
            <view class="filter-chip">{{ townNames[townIndex] || '全竹山' }} <text>⌄</text></view>
          </picker>
        </view>
      </view>

      <view id="merchant-count" class="list-heading">
        <text>为你找到 {{ total }} 家好店</text>
        <text>已审核商家</text>
      </view>
      <view v-if="!loading && items.length === 0" class="empty-merchant-card">
        <view class="empty-merchant-icon">🏪</view>
        <text class="empty-merchant-title">本区域暂无已入驻商家</text>
        <text class="empty-merchant-desc">竹山商圈联盟诚邀本地实体商户入驻，进店即可扫码发券，同城商家相互引流拓客！</text>
        <view class="apply-merchant-btn" @tap="goToApply">
          <text>✨ 申请入驻商圈联盟</text>
        </view>
      </view>
      <view class="shop-list">
        <ShopCard v-for="item in items" :key="item._id" :shop="item" @click="goDetail(item._id)" />
      </view>
      <t-button v-if="hasMore" theme="light" block @click="load(false)">加载更多</t-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow, onReachBottom, onPullDownRefresh, onShareAppMessage } from '@dcloudio/uni-app';
import { getPublicMerchants } from '@/api/merchant';
import { useUserStore } from '@/store/user';
import { useConfigStore } from '@/store/config';
import ShopCard from '@/components/ShopCard.vue';
import type { Merchant } from '@/types/merchant';

const configStore = useConfigStore();
const categories = computed(() => [{ id: 'all', name: '全部品类' }, ...configStore.merchantCategories]);
const categoryNames = computed(() => categories.value.map(item => item.name));
const towns = computed(() => [{ id: 'all', name: '全竹山' }, ...configStore.towns]);
const townNames = computed(() => towns.value.map(item => item.name));
const categoryIndex = ref(0);
const townIndex = ref(0);
const keyword = ref('');
const items = ref<Merchant[]>([]);
const total = ref(0);
const page = ref(1);
const hasMore = ref(false);
const loading = ref(false);
let requestVersion = 0;
let initialized = false;
const categoryId = computed(() => categories.value[categoryIndex.value]?.id || 'all');
const load = async (reset: boolean) => {
  if (loading.value && !reset) return;
  const version = ++requestVersion;
  loading.value = true;
  const nextPage = reset ? 1 : page.value + 1;
  try {
    const result = await getPublicMerchants({
      categoryId: categoryId.value,
      town: towns.value[townIndex.value]?.name || '全竹山',
      keyword: keyword.value,
      page: nextPage,
      pageSize: 10
    });
    if (version !== requestVersion) return;
    items.value = reset ? result.list : [...items.value, ...result.list];
    page.value = nextPage;
    total.value = result.total;
    hasMore.value = result.hasMore;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '商家加载失败', icon: 'none' });
  } finally {
    if (version === requestVersion) loading.value = false;
  }
};
onShow(async () => {
  await configStore.load();
  if (!initialized) {
    townIndex.value = Math.max(0, towns.value.findIndex(item => item.name === useUserStore().selectedTown));
    initialized = true;
  }
  const pendingCat = uni.getStorageSync('zhushan_merchant_filter_cat');
  if (pendingCat) {
    uni.removeStorageSync('zhushan_merchant_filter_cat');
    const idx = categories.value.findIndex(item => item.id === pendingCat);
    if (idx >= 0) categoryIndex.value = idx;
  }
  load(true);
});
onReachBottom(() => { if (hasMore.value) load(false); });
const onCategoryChange = (event: any) => { categoryIndex.value = Number(event.detail.value); load(true); };
const onTownChange = (event: any) => { townIndex.value = Number(event.detail.value); load(true); };
const search = () => load(true);
const goDetail = (id: string) => uni.navigateTo({ url: '/pages/merchant/detail?id=' + encodeURIComponent(id) });
const goToApply = () => uni.navigateTo({ url: '/pages/merchant/apply' });

onPullDownRefresh(async () => {
  await load(true);
  uni.stopPullDownRefresh();
});

onShareAppMessage(() => ({
  title: '逛竹山好店，享同城商圈专属礼遇！',
  path: '/pages/merchant/list'
}));
</script>

<style scoped>
.merchant-list-page { min-height: 100vh; padding-bottom: 60rpx; background: var(--zs-canvas); }
.page-hero { padding: 35rpx 30rpx 47rpx; border-radius: 0 0 32rpx 32rpx; background: linear-gradient(145deg,#17664c,#104b39); color: #fff; }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 6rpx; font-size: 40rpx; font-weight: 800; }
.hero-subtitle { margin-top: 8rpx; color: #d2e8d9; font-size: 22rpx; }
.search-row { display: flex; align-items: center; gap: 12rpx; margin-top: 28rpx; padding: 0 9rpx 0 20rpx; height: 78rpx; border-radius: 16rpx; background: white; color: var(--zs-ink); }
.search-row image { width: 32rpx; height: 32rpx; }
.keyword { flex: 1; min-width: 0; height: 66rpx; font-size: 23rpx; }
.search-button { padding: 12rpx 19rpx; border-radius: 10rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 22rpx; font-weight: 700; }
.content { margin: -17rpx 20rpx 0; position: relative; }
.filter-panel { padding: 22rpx; border-radius: 20rpx; background: white; box-shadow: 0 5rpx 17rpx rgba(19,53,35,.05); }
.filter-title { color: var(--zs-ink); font-size: 24rpx; font-weight: 750; }
.filter-row { display: flex; gap: 13rpx; margin-top: 17rpx; }
.filter-row picker { min-width: 0; flex: 1; }
.filter-chip { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; padding: 14rpx 18rpx; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: #496655; background: #f8faf7; font-size: 22rpx; }
.filter-chip text { font-size: 25rpx; color: #83988a; }
.list-heading { display: flex; align-items: center; justify-content: space-between; margin: 28rpx 2rpx 17rpx; }
.list-heading text:first-child { color: var(--zs-ink); font-size: 27rpx; font-weight: 750; }
.list-heading text:last-child { color: var(--zs-muted); font-size: 19rpx; }
.shop-list { display: flex; flex-direction: column; gap: 15rpx; margin-bottom: 25rpx; }

/* 雅致空状态与招商卡片 */
.empty-merchant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 30rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(23, 102, 76, 0.05);
  margin-top: 10rpx;
}
.empty-merchant-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  background: var(--zs-green-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  margin-bottom: 20rpx;
}
.empty-merchant-title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--zs-ink);
  margin-bottom: 12rpx;
}
.empty-merchant-desc {
  font-size: 23rpx;
  color: var(--zs-muted);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 32rpx;
  padding: 0 20rpx;
}
.apply-merchant-btn {
  background: linear-gradient(135deg, var(--zs-green), #238b69);
  color: #ffffff;
  padding: 16rpx 40rpx;
  border-radius: 40rpx;
  font-size: 25rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 18rpx rgba(23, 102, 76, 0.25);
}
</style>
