<template>
  <view class="info-page">
    <view class="page-hero">
      <text class="hero-kicker">NEIGHBORHOOD</text>
      <view class="hero-title">竹山便民信息</view>
      <view class="hero-subtitle">找房、闲置和身边需要的服务</view>
      <view class="search-row">
        <image :src="'/static/icons/search.png'" mode="aspectFit" />
        <input id="info-keyword" class="keyword" placeholder="搜索标题和内容" v-model="keyword" confirm-type="search" @confirm="search" />
        <view class="search-btn" @tap="search">搜索</view>
      </view>
    </view>
    <view class="content">
      <view class="filters">
        <view class="filter-title">筛选信息</view>
        <view class="row">
          <picker :range="categoryNames" :value="categoryIndex" @change="onCategoryChange"><view class="picker">{{ categoryNames[categoryIndex] || '全部分类' }} <text>⌄</text></view></picker>
          <picker :range="townNames" :value="townIndex" @change="onTownChange"><view class="picker">{{ townNames[townIndex] || '全竹山' }} <text>⌄</text></view></picker>
        </view>
      </view>
      <view id="info-count" class="list-heading"><text>最新信息</text><text>共 {{ total }} 条有效信息</text></view>
      <t-empty v-if="!loading && infoList.length === 0" description="当前筛选暂无有效信息" />
      <view class="info-list"><InfoCard v-for="item in infoList" :key="item._id" :info="item" @click="goToDetail(item._id)" /></view>
      <t-button v-if="hasMore" theme="light" block @click="loadPage(false)">加载更多</t-button>
      <view v-if="loading" class="loading-hint">加载中…</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getInfoList } from '@/api/info';
import { useUserStore } from '@/store/user';
import { useConfigStore } from '@/store/config';
import type { InfoItem } from '@/types/info';
import InfoCard from '@/components/InfoCard.vue';

const configStore = useConfigStore();
const categories = computed(() => [{ id: 'all', name: '全部分类' }, ...configStore.infoCategories]);
const categoryNames = computed(() => categories.value.map(item => item.name));
const towns = computed(() => [{ id: 'all', name: '全竹山' }, ...configStore.towns]);
const townNames = computed(() => towns.value.map(item => item.name));
const categoryIndex = ref(0);
const townIndex = ref(0);
const keyword = ref('');
const infoList = ref<InfoItem[]>([]);
const page = ref(1);
const total = ref(0);
const hasMore = ref(false);
const loading = ref(false);
let requestVersion = 0;
const categoryId = computed(() => categories.value[categoryIndex.value]?.id || 'all');

const loadPage = async (reset: boolean) => {
  if (loading.value && !reset) return;
  const version = ++requestVersion;
  loading.value = true;
  const targetPage = reset ? 1 : page.value + 1;
  try {
    const result = await getInfoList({ categoryId: categoryId.value, town: towns.value[townIndex.value]?.name || '全竹山', keyword: keyword.value, page: targetPage, pageSize: 10 });
    if (version !== requestVersion) return;
    infoList.value = reset ? result.list : [...infoList.value, ...result.list];
    page.value = targetPage;
    total.value = result.total;
    hasMore.value = result.hasMore;
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '列表加载失败', icon: 'none' });
  } finally {
    if (version === requestVersion) loading.value = false;
  }
};

onLoad(async (options) => {
  await configStore.load();
  categoryIndex.value = Math.max(0, categories.value.findIndex(item => item.id === (options?.catId || 'all')));
  const selectedTown = useUserStore().selectedTown;
  townIndex.value = Math.max(0, towns.value.findIndex(item => item.name === selectedTown));
  try { keyword.value = decodeURIComponent(options?.keyword || ''); } catch { keyword.value = options?.keyword || ''; }
  loadPage(true);
});
onPullDownRefresh(async () => { await loadPage(true); uni.stopPullDownRefresh(); });
onReachBottom(() => { if (hasMore.value) loadPage(false); });

const onCategoryChange = (event: any) => { categoryIndex.value = Number(event.detail.value); loadPage(true); };
const onTownChange = (event: any) => { townIndex.value = Number(event.detail.value); loadPage(true); };
const search = () => loadPage(true);
const goToDetail = (id: string) => uni.navigateTo({ url: `/pages/info/detail?id=${id}` });
</script>

<style scoped>
.info-page { min-height: 100vh; padding-bottom: 60rpx; background: var(--zs-canvas); }
.page-hero { padding: 35rpx 30rpx 47rpx; border-radius: 0 0 32rpx 32rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.hero-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { margin-top: 6rpx; font-size: 40rpx; font-weight: 800; }
.hero-subtitle { margin-top: 8rpx; color: #d2e8d9; font-size: 22rpx; }
.search-row { display: flex; align-items: center; gap: 12rpx; margin-top: 28rpx; padding: 0 9rpx 0 20rpx; height: 78rpx; border-radius: 16rpx; background: white; color: var(--zs-ink); }
.search-row image { width: 32rpx; height: 32rpx; }
.keyword { flex: 1; min-width: 0; height: 66rpx; font-size: 23rpx; }
.search-btn { padding: 12rpx 19rpx; border-radius: 10rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 22rpx; font-weight: 700; }
.content { position: relative; margin: -17rpx 20rpx 0; }
.filters { padding: 22rpx; border-radius: 20rpx; background: white; box-shadow: 0 5rpx 17rpx rgba(19,53,35,.05); }
.filter-title { color: var(--zs-ink); font-size: 24rpx; font-weight: 750; }
.row { display: flex; gap: 13rpx; margin-top: 17rpx; }
.row picker { min-width: 0; flex: 1; }
.picker { display: flex; justify-content: space-between; align-items: center; gap: 8rpx; padding: 14rpx 18rpx; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: #496655; background: #f8faf7; font-size: 22rpx; }
.picker text { font-size: 25rpx; color: #83988a; }
.list-heading { display: flex; justify-content: space-between; align-items: baseline; margin: 28rpx 2rpx 17rpx; }
.list-heading text:first-child { color: var(--zs-ink); font-size: 27rpx; font-weight: 750; }
.list-heading text:last-child { color: var(--zs-muted); font-size: 19rpx; }
.info-list { display: flex; flex-direction: column; gap: 15rpx; margin-bottom: 23rpx; }
.loading-hint { padding: 20rpx; color: var(--zs-muted); font-size: 21rpx; text-align: center; }
</style>
