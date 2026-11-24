<template>
  <view class="publish-page" v-if="!loadError">
    <view class="page-heading">
      <text class="heading-kicker">SHARE WITH ZHUSHAN</text>
      <view class="heading-title">{{ infoId ? '编辑便民信息' : '发布便民信息' }}</view>
      <text class="heading-subtitle">把有用的信息，准确地告诉身边人</text>
    </view>
    <view class="compliance-notice">
      <text class="notice-icon">发布须知</text>
      <text class="notice-text">信息经人工审核后公开。请确保内容真实，不发布涉黄涉赌与灰产内容。</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="form-label">信息类别</text>
        <picker id="info-category-picker" :range="categoryNames" :value="catIndex" @change="onCatChange">
          <view class="picker-val">
            {{ selectedCatName }} <text class="arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">所在乡镇</text>
        <picker id="info-town-picker" :range="townNames" :value="townIndex" @change="onTownChange">
          <view class="picker-val">
            {{ selectedTownName }} <text class="arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">信息标题</text>
        <input 
          id="info-title"
          class="form-input" 
          placeholder="简明扼要，如：城关二居室整租 (30字内)" 
          v-model="formData.title" 
        />
      </view>

      <view class="form-item">
        <text class="form-label">期望价格</text>
        <input 
          class="form-input" 
          placeholder="如：900元/月 或 面议" 
          v-model="formData.price_desc" 
        />
      </view>

      <view class="form-item-vertical">
        <text class="form-label">详细描述</text>
        <textarea 
          id="info-content"
          class="form-textarea" 
          placeholder="请详细描述房源户型、物品成色、服务内容等..." 
          v-model="formData.content" 
        />
      </view>

      <view class="form-item-vertical">
        <text class="form-label">图片（最多 9 张，{{ USE_MOCK ? '本机演示保存' : '上传至云存储' }}）</text>
        <view class="image-row" v-for="(image, index) in formData.images" :key="image">
          <image :src="image" class="preview-image" mode="aspectFill" />
          <button @tap="removeImage(index)">移除</button>
        </view>
        <button v-if="formData.images.length < 9" @tap="chooseImages">选择图片</button>
      </view>

      <view class="form-item">
        <text class="form-label">联系电话</text>
        <input 
          id="info-phone"
          class="form-input" 
          type="number" 
          placeholder="用于意向人联系您" 
          v-model="formData.contact_phone" 
        />
      </view>

      <view class="consent-row">
        <checkbox id="info-consent" :checked="formData.contact_consent" @tap="formData.contact_consent = !formData.contact_consent" />
        <text class="consent-text">我已知悉并明确同意将上述联系电话在详情页公开，供本地居民电话联系。</text>
      </view>
    </view>

    <button id="info-submit" class="submit-btn" @tap="handleSubmit">{{ infoId ? '保存修改并重新审核' : '提交发布（进入审核队列）' }}</button>
  </view>
  <view class="publish-page" v-else>{{ loadError }}</view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { INFO_CATEGORIES } from '@/constants/enums';
import { ZHUSHAN_TOWNS } from '@/constants/regions';
import { useConfigStore } from '@/store/config';
import { publishInfo, updateInfo, getInfoDetail } from '@/api/info';
import { USE_MOCK } from '@/api/adapter';
import { persistSelectedImage } from '@/utils/imageUpload';

const configStore = useConfigStore();
const categories = computed(() => configStore.infoCategories);
const categoryNames = computed(() => categories.value.map(c => c.name));
const catIndex = ref(0);
const selectedCatName = computed(() => categoryNames.value[catIndex.value] || '请选择分类');

const towns = computed(() => configStore.towns);
const townNames = computed(() => towns.value.map(t => t.name));
const townIndex = ref(0);
const selectedTownName = computed(() => townNames.value[townIndex.value] || '请选择乡镇');
const infoId = ref('');
const loadError = ref('');

const formData = ref({
  category_id: INFO_CATEGORIES[0].id,
  category_name: INFO_CATEGORIES[0].name,
  town: ZHUSHAN_TOWNS[1].name,
  title: '',
  price_desc: '',
  content: '',
  images: [] as string[],
  contact_phone: '',
  contact_consent: false
});

onLoad(async (options) => {
  await configStore.load();
  infoId.value = options?.id || '';
  if (!infoId.value) {
    formData.value.category_id = categories.value[0]?.id || '';
    formData.value.category_name = categories.value[0]?.name || '';
    formData.value.town = towns.value[0]?.name || '';
    return;
  }
  const item = await getInfoDetail(infoId.value);
  if (!item) { loadError.value = '信息不存在或无权编辑'; return; }
  catIndex.value = Math.max(0, categories.value.findIndex(category => category.id === item.category_id));
  townIndex.value = Math.max(0, towns.value.findIndex(town => town.name === item.town));
  formData.value = {
    category_id: categories.value[catIndex.value]?.id || '', category_name: categories.value[catIndex.value]?.name || '', town: towns.value[townIndex.value]?.name || '',
    title: item.title, price_desc: item.price_desc || '', content: item.content,
    images: item.images || [], contact_phone: item.contact_phone, contact_consent: item.contact_consent
  };
  uni.setNavigationBarTitle({ title: '编辑便民信息' });
});

const chooseImages = () => {
  const remaining = 9 - formData.value.images.length;
  uni.chooseImage({ count: remaining, success: async result => {
    try {
      const paths = await Promise.all(result.tempFilePaths.map(path => persistSelectedImage(path, 'info')));
      formData.value.images = [...formData.value.images, ...paths].slice(0, 9);
    } catch {
      uni.showToast({ title: '图片保存失败，请重试', icon: 'none' });
    }
  } });
};
const removeImage = (index: number) => { formData.value.images.splice(index, 1); };

const onCatChange = (e: any) => {
  catIndex.value = e.detail.value;
  formData.value.category_id = categories.value[catIndex.value].id;
  formData.value.category_name = categories.value[catIndex.value].name;
};

const onTownChange = (e: any) => {
  townIndex.value = e.detail.value;
  formData.value.town = towns.value[townIndex.value].name;
};

const handleSubmit = async () => {
  if (!formData.value.title.trim()) {
    uni.showToast({ title: '请输入信息标题', icon: 'none' });
    return;
  }
  if (formData.value.content.trim().length < 10) {
    uni.showToast({ title: '详细描述至少 10 字', icon: 'none' });
    return;
  }
  if (!formData.value.contact_phone.trim()) {
    uni.showToast({ title: '请输入联系电话', icon: 'none' });
    return;
  }
  if (!formData.value.contact_consent) {
    uni.showToast({ title: '请勾选电话公开同意条款', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '提交中...' });
  try {
    const res = infoId.value
      ? { message: USE_MOCK ? '本地演示编辑已提交，公开信息暂时下架并等待重新审核' : '编辑已提交，公开信息暂时下架并等待重新审核', item: await updateInfo(infoId.value, formData.value) }
      : await publishInfo(formData.value);
    uni.hideLoading();
    uni.showModal({
      title: '已进入待审核',
      content: res.message,
      showCancel: false,
      success: () => {
        uni.navigateBack();
      }
    });
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: err instanceof Error ? err.message : '提交失败，请重试', icon: 'none' });
  }
};
</script>

<style scoped>
.publish-page { min-height: 100vh; padding-bottom: 65rpx; background: var(--zs-canvas); }
.page-heading { padding: 35rpx 28rpx 49rpx; border-radius: 0 0 32rpx 32rpx; color: #fff; background: linear-gradient(145deg,#17664c,#104b39); }
.heading-kicker { color: #c8e7d2; font-size: 18rpx; font-weight: 700; letter-spacing: 2rpx; }
.heading-title { margin-top: 6rpx; font-size: 38rpx; font-weight: 800; }
.heading-subtitle { display: block; margin-top: 8rpx; color: #d2e8d9; font-size: 21rpx; }
.compliance-notice { display: flex; flex-direction: column; gap: 7rpx; margin: -18rpx 20rpx 18rpx; padding: 17rpx 20rpx; position: relative; border: 1rpx solid #f3e2be; border-radius: 14rpx; background: #fff7e8; }
.notice-icon { color: #9b642a; font-size: 21rpx; font-weight: 750; }
.notice-text { color: #8b704d; font-size: 20rpx; line-height: 1.45; }
.form-card { margin: 0 20rpx; padding: 6rpx 23rpx 17rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: white; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.form-item, .form-item-vertical { display: flex; flex-direction: column; align-items: stretch; gap: 11rpx; padding: 22rpx 0; border-bottom: 1rpx solid #edf0eb; }
.form-label { width: 100%; color: var(--zs-ink); font-size: 23rpx; font-weight: 700; }
.form-item picker { width: 100%; }
.picker-val, .form-input, .form-textarea { width: 100%; box-sizing: border-box; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 23rpx; }
.picker-val { display: flex; justify-content: space-between; padding: 17rpx 18rpx; color: #4b6554; }
.arrow { color: #889c8b; font-size: 20rpx; }
.form-input { height: 72rpx; padding: 0 17rpx; text-align: left; }
.form-textarea { min-height: 190rpx; padding: 16rpx 17rpx; }
.image-row { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.preview-image { width: 120rpx; height: 120rpx; border-radius: 11rpx; }
.image-row button { margin: 0; padding: 0 20rpx; height: 52rpx; line-height: 52rpx; border-radius: 26rpx; color: #a45a42; background: #fff1ed; font-size: 20rpx; }
.form-item-vertical > button { margin: 0; padding: 0 20rpx; align-self: flex-start; height: 63rpx; line-height: 63rpx; border-radius: 32rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; }
.consent-row { display: flex; align-items: flex-start; gap: 10rpx; padding: 21rpx 0 6rpx; }
.consent-text { flex: 1; color: var(--zs-muted); font-size: 20rpx; line-height: 1.5; }
.submit-btn { margin: 23rpx 20rpx 0; height: 82rpx; line-height: 82rpx; border-radius: 41rpx; color: white; background: var(--zs-green); font-size: 25rpx; font-weight: 750; }
</style>
