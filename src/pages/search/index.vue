<template>
  <view class="search-page">
    <view class="hero">
      <text class="kicker">FIND IN ZHUSHAN</text>
      <view class="hero-title">搜一搜竹山</view>
      <text class="hero-subtitle">找店铺、服务和身边的有效信息</text>
      <view class="search-row">
        <image :src="'/static/icons/search.png'" mode="aspectFit" />
        <input id="unified-keyword" v-model="keyword" class="search-input" placeholder="例如：租房、家政、美甲" confirm-type="search" @confirm="search" />
        <view class="search-button" @tap="search">搜索</view>
      </view>
    </view>
    <view class="content">
      <picker :range="townNames" :value="townIndex" @change="onTownChange">
        <view class="town-picker"><text>查找范围</text><text>{{ townNames[townIndex] || '全竹山' }}  ⌄</text></view>
      </picker>
      <view v-if="!searched" class="suggestions">
        <view class="section-title">试试搜索这些</view>
        <view class="suggestion-list">
          <text v-for="term in suggestions" :key="term" @tap="useSuggestion(term)">{{ term }}</text>
        </view>
      </view>
      <view v-else>
        <view class="result-summary" v-if="!loading && !error">{{ townNames[townIndex] || '全竹山' }} · 找到 {{ shopTotal }} 家商家、{{ infoTotal }} 条便民信息</view>
        <view class="result-error" v-if="error">{{ error }}</view>
        <view class="result-error" v-else-if="partialWarning">{{ partialWarning }}</view>
        <view class="result-tabs">
          <text v-for="item in tabs" :key="item.id" :class="{ active: activeTab === item.id }" @tap="activeTab = item.id">{{ item.name }}</text>
        </view>
        <view v-if="loading" class="loading">正在查找有效内容…</view>
        <view v-else-if="!error">
          <view v-if="activeTab !== 'info' && shops.length > 0" class="result-section">
            <view class="section-title">本地商家 <text>{{ shopTotal }}</text></view>
            <ShopCard v-for="shop in shops" :key="shop._id" :shop="shop" @click="openShop(shop._id)" />
            <button v-if="shopHasMore" class="more-button" :disabled="loadingMore" @tap="loadMoreShops">{{ loadingMore ? '加载中…' : '加载更多商家' }}</button>
          </view>
          <view v-if="activeTab !== 'shop' && infos.length > 0" class="result-section">
            <view class="section-title">便民信息 <text>{{ infoTotal }}</text></view>
            <InfoCard v-for="item in infos" :key="item._id" :info="item" @click="openInfo(item._id)" />
            <button v-if="infoHasMore" class="more-button" :disabled="loadingMore" @tap="loadMoreInfos">{{ loadingMore ? '加载中…' : '加载更多信息' }}</button>
          </view>
          <view class="empty" v-if="(activeTab === 'shop' && !shops.length) || (activeTab === 'info' && !infos.length) || (activeTab === 'all' && !shops.length && !infos.length)">
            <view class="empty-title">暂未找到符合条件的内容</view>
            <text>试试更短的关键词，或切换到“全竹山”。</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useConfigStore } from '@/store/config';
import { useUserStore } from '@/store/user';
import { getPublicMerchants } from '@/api/merchant';
import { getInfoList } from '@/api/info';
import ShopCard from '@/components/ShopCard.vue';
import InfoCard from '@/components/InfoCard.vue';
import type { Merchant } from '@/types/merchant';
import type { InfoItem } from '@/types/info';

const configStore = useConfigStore();
const keyword = ref('');
const townIndex = ref(0);
const townNames = computed(() => ['全竹山', ...configStore.towns.map(item => item.name)]);
const suggestions = ['租房', '二手', '家政', '美甲'];
const tabs = [{ id: 'all', name: '全部' }, { id: 'shop', name: '商家' }, { id: 'info', name: '便民信息' }];
const activeTab = ref('all');
const searched = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref('');
const partialWarning = ref('');
const shops = ref<Merchant[]>([]);
const infos = ref<InfoItem[]>([]);
const shopTotal = ref(0);
const infoTotal = ref(0);
const shopPage = ref(1);
const infoPage = ref(1);
const shopHasMore = ref(false);
const infoHasMore = ref(false);
let requestVersion = 0;
let initialized = false;

onLoad(options => {
  try { keyword.value = decodeURIComponent(String(options?.keyword || '')); }
  catch { keyword.value = String(options?.keyword || ''); }
});
onShow(async () => {
  await configStore.load();
  if (!initialized) {
    townIndex.value = Math.max(0, townNames.value.indexOf(useUserStore().selectedTown));
    initialized = true;
  }
  if (keyword.value.trim()) search();
});
const onTownChange = (event: any) => { townIndex.value = Number(event.detail.value); if (searched.value) search(); };
const useSuggestion = (term: string) => { keyword.value = term; search(); };
const search = async () => {
  const value = keyword.value.trim().slice(0, 30);
  if (!value) { uni.showToast({ title: '请输入要找的内容', icon: 'none' }); return; }
  keyword.value = value;
  searched.value = true;
  loading.value = true;
  error.value = '';
  partialWarning.value = '';
  const version = ++requestVersion;
  const town = townNames.value[townIndex.value] || '全竹山';
  const [shopResult, infoResult] = await Promise.allSettled([
    getPublicMerchants({ town, keyword: value, page: 1, pageSize: 10 }),
    getInfoList({ town, keyword: value, page: 1, pageSize: 10 })
  ]);
  if (version !== requestVersion) return;
  shops.value = shopResult.status === 'fulfilled' ? shopResult.value.list : [];
  infos.value = infoResult.status === 'fulfilled' ? infoResult.value.list : [];
  shopTotal.value = shopResult.status === 'fulfilled' ? shopResult.value.total : 0;
  infoTotal.value = infoResult.status === 'fulfilled' ? infoResult.value.total : 0;
  shopHasMore.value = shopResult.status === 'fulfilled' && shopResult.value.hasMore;
  infoHasMore.value = infoResult.status === 'fulfilled' && infoResult.value.hasMore;
  shopPage.value = 1;
  infoPage.value = 1;
  if (shopResult.status === 'rejected' && infoResult.status === 'rejected') error.value = '搜索服务暂不可用，请稍后再试';
  else if (shopResult.status === 'rejected' || infoResult.status === 'rejected') partialWarning.value = '部分搜索结果暂不可用，请稍后重试。';
  loading.value = false;
};
const loadMoreShops = async () => {
  if (!shopHasMore.value || loading.value || loadingMore.value) return;
  loadingMore.value = true;
  const version = requestVersion;
  try {
    const next = shopPage.value + 1;
    const result = await getPublicMerchants({ town: townNames.value[townIndex.value], keyword: keyword.value, page: next, pageSize: 10 });
    if (version !== requestVersion) return;
    shops.value.push(...result.list);
    shopPage.value = next;
    shopHasMore.value = result.hasMore;
  } catch { uni.showToast({ title: '加载商家失败', icon: 'none' }); }
  finally { loadingMore.value = false; }
};
const loadMoreInfos = async () => {
  if (!infoHasMore.value || loading.value || loadingMore.value) return;
  loadingMore.value = true;
  const version = requestVersion;
  try {
    const next = infoPage.value + 1;
    const result = await getInfoList({ town: townNames.value[townIndex.value], keyword: keyword.value, page: next, pageSize: 10 });
    if (version !== requestVersion) return;
    infos.value.push(...result.list);
    infoPage.value = next;
    infoHasMore.value = result.hasMore;
  } catch { uni.showToast({ title: '加载信息失败', icon: 'none' }); }
  finally { loadingMore.value = false; }
};
const openShop = (id: string) => uni.navigateTo({ url: '/pages/merchant/detail?id=' + encodeURIComponent(id) });
const openInfo = (id: string) => uni.navigateTo({ url: '/pages/info/detail?id=' + encodeURIComponent(id) });
</script>

<style scoped>
.search-page { min-height: 100vh; padding-bottom: 55rpx; background: var(--zs-canvas); }
.hero { padding: 37rpx 28rpx 56rpx; border-radius: 0 0 32rpx 32rpx; color: white; background: linear-gradient(145deg,#17664c,#104b39); }
.kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 1.8rpx; }
.hero-title { margin-top: 7rpx; font-size: 38rpx; font-weight: 800; }
.hero-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; }
.search-row { display: flex; align-items: center; gap: 11rpx; height: 78rpx; margin-top: 26rpx; padding: 0 9rpx 0 19rpx; border-radius: 13rpx; background: white; }
.search-row image { width: 31rpx; height: 31rpx; }
.search-input { flex: 1; min-width: 0; height: 70rpx; color: var(--zs-ink); font-size: 23rpx; }
.search-button { padding: 12rpx 17rpx; border-radius: 9rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; font-weight: 700; }
.content { position: relative; margin: -18rpx 20rpx 0; }
.town-picker { display: flex; justify-content: space-between; padding: 17rpx 20rpx; border: 1rpx solid var(--zs-border); border-radius: 14rpx; background: white; color: var(--zs-muted); font-size: 21rpx; }
.town-picker text:last-child { color: var(--zs-green); font-weight: 700; }
.suggestions, .result-section, .empty { margin-top: 17rpx; padding: 22rpx; border: 1rpx solid var(--zs-border); border-radius: 17rpx; background: white; }
.section-title { color: var(--zs-ink); font-size: 26rpx; font-weight: 800; }
.section-title text { margin-left: 7rpx; color: var(--zs-muted); font-size: 19rpx; font-weight: 400; }
.suggestion-list { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 20rpx; }
.suggestion-list text { padding: 10rpx 18rpx; border-radius: 24rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; }
.result-summary { margin: 22rpx 2rpx 14rpx; color: var(--zs-muted); font-size: 20rpx; }
.result-error { margin-top: 17rpx; padding: 18rpx; border-radius: 12rpx; color: #a75e37; background: #fff1e6; font-size: 21rpx; }
.result-tabs { display: flex; gap: 10rpx; margin-top: 15rpx; }
.result-tabs text { padding: 10rpx 18rpx; border-radius: 25rpx; color: #65786a; background: #eaf0e9; font-size: 21rpx; }
.result-tabs text.active { color: white; background: var(--zs-green); font-weight: 700; }
.result-section { display: flex; flex-direction: column; gap: 13rpx; }
.loading { margin-top: 45rpx; color: var(--zs-muted); font-size: 22rpx; text-align: center; }
.more-button { margin: 6rpx 0 0; height: 61rpx; line-height: 61rpx; border-radius: 31rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; }
.empty { padding: 60rpx 25rpx; text-align: center; }
.empty-title { color: var(--zs-ink); font-size: 26rpx; font-weight: 750; }
.empty text { display: block; margin-top: 10rpx; color: var(--zs-muted); font-size: 21rpx; }
</style>
