<template>
  <view class="page">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">JOIN LOCAL SHOPS</text>
      <view class="zs-page-hero__title">申请商家入驻</view>
      <text class="zs-page-hero__subtitle">填写真实资料，审核通过后展示给竹山居民</text>
    </view>
    <view class="notice">{{ USE_MOCK ? '本地演示申请；资质资料仅存于本机。' : '资质材料会上传到云存储并交由管理员审核。' }}审核通过前店铺不会进入公开列表。</view>
    <view class="card">
      <view class="title">申请商家入驻</view>
      <view class="label">店名</view><input id="merchant-name" class="field" placeholder="填写真实门店名称" v-model="form.name" />
      <view class="label">品类</view>
      <picker :range="categoryNames" :value="categoryIndex" @change="onCategoryChange"><view class="field">{{ categoryNames[categoryIndex] }} ▼</view></picker>
      <view class="label">所在乡镇</view>
      <picker :range="townNames" :value="townIndex" @change="onTownChange"><view class="field">{{ townNames[townIndex] }} ▼</view></picker>
      <view class="label">详细地址</view><input id="merchant-address" class="field" placeholder="填写门牌和楼层" v-model="form.address" />
      <view class="label">联系电话</view><input id="merchant-phone" class="field" type="number" placeholder="11 位手机号" v-model="form.contact_phone" />
      <view class="label">营业时间</view><input id="merchant-hours" class="field" placeholder="例如 09:00–20:00" v-model="form.business_hours" />
      <view class="label">每日预约接待上限（不接预约填 0）</view><input id="merchant-daily-limit" class="field" type="number" v-model="form.daily_booking_limit" />
      <view class="label">资质说明</view><textarea id="merchant-qualification" class="field textarea" placeholder="说明经营主体及必要资质；正式版需上传可核验材料" v-model="form.qualification_note" />
      <view class="label">资质图片（最多 9 张，{{ USE_MOCK ? '本机保存' : '上传至云存储' }}）</view>
      <view class="image-row" v-for="(path, index) in form.qualification_images" :key="path"><image :src="path" class="preview" mode="aspectFill" /><button @tap="removeImage(index)">移除</button></view>
      <button v-if="form.qualification_images.length < 9" @tap="chooseImages">选择资质图片</button>
      <button id="merchant-submit" class="primary" @tap="submit">提交入驻审核</button>
    </view>
    <view class="card" v-if="applications.length">
      <view class="title">我的申请</view>
      <view class="application" v-for="item in applications" :key="item._id">
        <view>{{ item.name }} · {{ statusText(item.status) }}</view>
        <view v-if="item.review_reason">审核原因：{{ item.review_reason }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { MERCHANT_CATEGORIES } from '@/constants/enums';
import { ZHUSHAN_TOWNS } from '@/constants/regions';
import { useConfigStore } from '@/store/config';
import { applyMerchant, getMyMerchantApplications, type MerchantApplicationInput } from '@/api/merchant';
import type { MerchantApplication } from '@/types/merchant';
import { persistSelectedImage } from '@/utils/imageUpload';
import { USE_MOCK } from '@/api/adapter';

const configStore = useConfigStore();
const categories = computed(() => configStore.merchantCategories);
const categoryNames = computed(() => categories.value.map(item => item.name));
const towns = computed(() => configStore.towns);
const townNames = computed(() => towns.value.map(item => item.name));
const categoryIndex = ref(0);
const townIndex = ref(0);
const form = ref<MerchantApplicationInput>({ name: '', category_id: MERCHANT_CATEGORIES[0].id, town: ZHUSHAN_TOWNS[1].name, address: '', contact_phone: '', business_hours: '', daily_booking_limit: '0', qualification_note: '', qualification_images: [] });
const applications = ref<MerchantApplication[]>([]);
const load = async () => {
  await configStore.load();
  if (!categories.value.some(item => item.id === form.value.category_id)) form.value.category_id = categories.value[0]?.id || '';
  if (!towns.value.some(item => item.name === form.value.town)) form.value.town = towns.value[0]?.name || '';
  categoryIndex.value = Math.max(0, categories.value.findIndex(item => item.id === form.value.category_id));
  townIndex.value = Math.max(0, towns.value.findIndex(item => item.name === form.value.town));
  applications.value = await getMyMerchantApplications();
};
onShow(load);
const statusText = (status: string) => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '未通过' } as Record<string, string>)[status] || status;
const onCategoryChange = (event: any) => { categoryIndex.value = Number(event.detail.value); form.value.category_id = categories.value[categoryIndex.value].id; };
const onTownChange = (event: any) => { townIndex.value = Number(event.detail.value); form.value.town = towns.value[townIndex.value].name; };
const chooseImages = () => uni.chooseImage({ count: 9 - form.value.qualification_images.length, success: async result => {
  try { form.value.qualification_images = [...form.value.qualification_images, ...await Promise.all(result.tempFilePaths.map(path => persistSelectedImage(path, 'merchant')))].slice(0, 9); }
  catch { uni.showToast({ title: '资质图片保存失败', icon: 'none' }); }
} });
const removeImage = (index: number) => { form.value.qualification_images.splice(index, 1); };
const submit = async () => {
  try {
    await applyMerchant(form.value);
    await load();
    uni.showToast({ title: USE_MOCK ? '已进入本地审核队列' : '已提交入驻审核', icon: 'none' });
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '申请失败', icon: 'none' }); }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--zs-canvas); }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.card { margin: 17rpx 0; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.title { color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.label { display: block; margin-top: 23rpx; color: var(--zs-ink); font-size: 22rpx; font-weight: 700; }
.field { width: 100%; min-height: 72rpx; margin-top: 9rpx; padding: 0 17rpx; box-sizing: border-box; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 23rpx; }
picker .field { display: flex; align-items: center; padding: 14rpx 17rpx; }
.textarea { height: 155rpx; padding: 15rpx 17rpx; }
.card button { margin: 17rpx 0 0; height: 64rpx; line-height: 64rpx; border-radius: 32rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 22rpx; }
.card .primary { width: 100%; height: 76rpx; line-height: 76rpx; color: white; background: var(--zs-green); font-weight: 750; }
.image-row { display: flex; align-items: center; gap: 12rpx; margin-top: 12rpx; }
.image-row button { width: auto; margin: 0; padding: 0 17rpx; color: #aa5945; background: #fff0e9; font-size: 20rpx; }
.preview { width: 110rpx; height: 110rpx; border-radius: 11rpx; }
.application { margin-top: 15rpx; padding-top: 15rpx; border-top: 1rpx solid var(--zs-border); color: var(--zs-muted); font-size: 22rpx; line-height: 1.5; }
</style>
