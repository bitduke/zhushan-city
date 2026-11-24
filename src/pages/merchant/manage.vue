<template>
  <view class="page" v-if="merchant">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">SHOP PROFILE</text>
      <view class="zs-page-hero__title">店铺资料管理</view>
      <text class="zs-page-hero__subtitle">维护地址、营业时间和可信资料</text>
    </view>
    <view class="notice">{{ USE_MOCK ? '本地店铺管理演示。' : '' }}可信资料修改会暂时隐藏公开页，并进入管理员重审。</view>
    <view class="card">
      <view class="title">{{ merchant.name }}</view>
      <view class="line">状态：{{ merchant.status }} · 短 token：{{ merchant.qrcode_token || '尚未生成' }}</view>
      <view class="line">{{ USE_MOCK ? '当前测试号无法生成正式小程序码。' : '可在商家工作台生成门店码，张贴前请用真机核对。' }}</view>
      <view class="label">店名</view><input id="manage-name" class="field" v-model="form.name" />
      <view class="label">品类</view><picker :range="categoryNames" :value="categoryIndex" @change="onCategoryChange"><view class="field">{{ categoryNames[categoryIndex] }} ▼</view></picker>
      <view class="label">乡镇</view><picker :range="townNames" :value="townIndex" @change="onTownChange"><view class="field">{{ townNames[townIndex] }} ▼</view></picker>
      <view class="label">详细地址</view><input id="manage-address" class="field" v-model="form.address" />
      <view class="label">联系电话</view><input id="manage-phone" class="field" type="number" v-model="form.contact_phone" />
      <view class="label">营业时间</view><input id="manage-hours" class="field" v-model="form.business_hours" />
      <view class="label">每日预约接待上限</view><input id="manage-daily-limit" class="field" type="number" v-model="form.daily_booking_limit" />
      <view class="label">资质说明</view><textarea id="manage-qualification" class="field textarea" v-model="form.qualification_note" />
      <button id="manage-submit" class="primary" @tap="submit">提交变更，等待重审</button>
    </view>
  </view>
  <view class="page" v-else>当前没有可管理的店铺。</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { useMerchantStore } from '@/store/merchant';
import { updateMerchant, type MerchantApplicationInput } from '@/api/merchant';
import { useConfigStore } from '@/store/config';

const store = useMerchantStore();
const configStore = useConfigStore();
const merchant = computed(() => store.currentMerchant);
const categories = computed(() => configStore.merchantCategories);
const categoryNames = computed(() => categories.value.map(item => item.name));
const towns = computed(() => configStore.towns);
const townNames = computed(() => towns.value.map(item => item.name));
const categoryIndex = ref(0);
const townIndex = ref(0);
const form = ref<MerchantApplicationInput>({ name: '', category_id: '', town: '', address: '', contact_phone: '', business_hours: '', daily_booking_limit: '0', qualification_note: '', qualification_images: [] });
onLoad(async () => {
  await configStore.load();
  if (!merchant.value) return;
  const item = merchant.value;
  categoryIndex.value = Math.max(0, categories.value.findIndex(category => category.id === item.category_id));
  townIndex.value = Math.max(0, towns.value.findIndex(town => town.name === item.town));
  form.value = { name: item.name, category_id: categories.value[categoryIndex.value]?.id || '', town: towns.value[townIndex.value]?.name || '', address: item.address, contact_phone: item.phone, business_hours: item.business_hours, daily_booking_limit: String(item.daily_booking_limit || 0), qualification_note: item.description || '本地经营资质待核验', qualification_images: [] };
});
const onCategoryChange = (event: any) => { categoryIndex.value = Number(event.detail.value); form.value.category_id = categories.value[categoryIndex.value].id; };
const onTownChange = (event: any) => { townIndex.value = Number(event.detail.value); form.value.town = towns.value[townIndex.value].name; };
const submit = async () => {
  if (!merchant.value) return;
  try { await updateMerchant(merchant.value._id, form.value); uni.showModal({ title: '已进入重审', content: '店铺公开页暂时隐藏，原资料会在拒绝变更后恢复。', showCancel: false, success: () => uni.navigateBack() }); }
  catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '提交失败', icon: 'none' }); }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--zs-canvas); }
.notice { padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.card { margin-top: 17rpx; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.title { color: var(--zs-ink); font-size: 28rpx; font-weight: 750; }
.line { margin-top: 10rpx; color: var(--zs-muted); font-size: 20rpx; line-height: 1.45; }
.label { display: block; margin-top: 23rpx; color: var(--zs-ink); font-size: 22rpx; font-weight: 700; }
.field { width: 100%; min-height: 72rpx; margin-top: 9rpx; padding: 0 17rpx; box-sizing: border-box; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 23rpx; }
picker .field { display: flex; align-items: center; padding: 14rpx 17rpx; }
.textarea { height: 155rpx; padding: 15rpx 17rpx; }
.primary { width: 100%; height: 76rpx; line-height: 76rpx; margin-top: 26rpx; border-radius: 38rpx; color: white; background: var(--zs-green); font-size: 23rpx; font-weight: 750; }
</style>
