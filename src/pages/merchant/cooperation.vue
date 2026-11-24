<template>
  <view class="page">
    <view class="zs-page-hero">
      <text class="zs-page-hero__kicker">LOCAL PARTNERS</text>
      <view class="zs-page-hero__title">拓客合作与对账</view>
      <text class="zs-page-hero__subtitle">发布合作条件，核对有效结果与线下收付</text>
    </view>
    <view class="notice">{{ USE_MOCK ? '本地演示合作流程；不发起真实付款。' : '合作需双方确认及平台审核；线下付款仅记录核对凭据。' }}报价和新客规则由商家填写。</view>
    <view class="panel" v-if="merchant">
      <view class="heading">当前门店：{{ merchant.name }}</view>
      <view class="hint">本店可以购买其他店的推广，也可以承接其他店合作并核对结果。</view>
    </view>

    <view class="panel" v-if="merchant && targetCoupons.length > 0 && promoters.length > 0">
      <view class="heading">发布“我要拓客”</view>
      <view class="hint">发布即表示买方接受所填条件；入口店接受、平台审核通过后上架，条款版本冻结。</view>
      <view class="field-label">入口推广店</view>
      <picker id="promoter-picker" :range="promoterNames" :value="promoterIndex" @change="onPromoterChange"><view class="picker">{{ promoterNames[promoterIndex] }} ▼</view></picker>
      <view class="field-label">推广券</view>
      <picker :range="targetCouponNames" :value="targetCouponIndex" @change="onCouponChange">
        <view class="picker">{{ targetCouponNames[targetCouponIndex] || '选择本店优惠券' }} ▼</view>
      </picker>
      <view class="field-label">计费方式</view>
      <picker id="pricing-model-picker" :range="pricingNames" :value="pricingIndex" @change="onPricingChange"><view class="picker">{{ pricingNames[pricingIndex] }} ▼</view></picker>
      <view class="field-label">合作周期</view>
      <view class="date-row">
        <picker mode="date" :value="form.startDate" @change="form.startDate = $event.detail.value"><view class="picker">开始 {{ form.startDate }}</view></picker>
        <picker mode="date" :value="form.endDate" @change="form.endDate = $event.detail.value"><view class="picker">结束 {{ form.endDate }}</view></picker>
      </view>
      <view v-if="form.pricingModel === 'PER_RESULT'">
        <view class="field-label">每个有效新客总报价（元）</view>
        <input id="unit-price-input" class="field" type="digit" placeholder="由买方填写，不预设价格" v-model="form.unitPriceYuan" />
      </view>
      <view v-else>
        <view class="field-label">展位周期总价（元）</view>
        <input id="slot-price-input" class="field" type="digit" placeholder="期满核验后才计应付" v-model="form.slotPriceYuan" />
      </view>
      <view class="field-label">{{ form.pricingModel === 'PER_RESULT' ? '其中平台费用（元／结果）' : '其中平台费用（元／周期）' }}</view>
      <input id="platform-fee-input" class="field" type="digit" placeholder="填 0 或明确费用" v-model="form.platformFeeYuan" />
      <view v-if="form.pricingModel === 'PER_RESULT'">
        <view class="field-label">合作总预算（元）</view>
        <input id="budget-input" class="field" type="digit" placeholder="至少覆盖一个有效结果" v-model="form.budgetYuan" />
      </view>
      <view class="field-label">新客排重期（天）</view>
      <input id="new-customer-window-input" class="field" type="number" placeholder="双方约定 1–365 天" v-model="form.newCustomerWindowDays" />
      <view class="field-label">有效新客核对条件</view>
      <textarea id="new-customer-rule-input" class="rule-field" placeholder="如首次到店的核对依据、未到／退款／自刷如何处理" v-model="form.newCustomerRule" />
      <button class="primary" @tap="publish">发布合作条件，等待入口店接受</button>
    </view>

    <view class="panel" v-if="entries.length === 0">暂无与本店相关的合作单。</view>

    <view class="panel" v-for="entry in entries" :key="entry.offer._id">
      <view class="heading">{{ entry.offer.target_coupon_title || couponTitle(entry.offer.target_coupon_id) }}</view>
      <view class="status">{{ statusText(entry.offer.status) }} · 条款版本 {{ entry.offer.version }}</view>
      <view class="hint" v-if="entry.offer.admin_review_reason">平台审核说明：{{ entry.offer.admin_review_reason }}</view>
      <view class="line">买方 {{ entry.offer.buyer_merchant_name || merchantName(entry.offer.buyer_merchant_id) }} → 入口 {{ entry.offer.promoter_merchant_name || merchantName(entry.offer.promoter_merchant_id) }}</view>
      <view class="line">{{ entry.offer.start_date }} 至 {{ entry.offer.end_date }} · {{ entry.offer.pricing_model === 'PER_RESULT' ? '按双方核对的有效新客计费' : '按展位周期计费，期满由买方确认履约' }}</view>
      <view class="line" v-if="entry.offer.pricing_model === 'PER_RESULT'">每个结果 {{ money(entry.offer.unit_price_cents) }} 元（含平台费用 {{ money(entry.offer.platform_fee_cents) }} 元）</view>
      <view class="line" v-else>本周期展位 {{ money(entry.offer.slot_price_cents || 0) }} 元（含平台费用 {{ money(entry.offer.platform_fee_cents) }} 元）</view>
      <view class="line">{{ entry.offer.pricing_model === 'PER_RESULT' ? `总预算 ${money(entry.offer.budget_cents)} 元 · ` : '' }}新客排重 {{ entry.offer.new_customer_window_days }} 天</view>
      <view class="line">有效条件：{{ entry.offer.new_customer_rule }}</view>
      <button class="primary" :id="'accept-' + entry.offer._id" v-if="entry.offer.status === 'OFFERED' && isPromoter(entry.offer)" @tap="accept(entry.offer._id)">接受合作并提交平台审核</button>
      <button class="secondary" v-if="entry.offer.status === 'ACTIVE'" @tap="pause(entry.offer._id)">暂停新的领券</button>

      <view class="subheading">有效结果核对</view>
      <view class="hint" v-if="entry.results.length === 0">尚无从本合作领取并核销的券；扫码和领券不计作有效新客。</view>
      <view class="result" v-for="result in entry.results" :key="result._id">
        <view class="line">券码 {{ result.coupon_code }} · {{ resultStatusText(result.status) }}</view>
        <view class="hint">买方依据：{{ result.buyer_note || '待填写' }}；入口店意见：{{ result.promoter_note || '待核对' }}</view>
        <view v-if="isBuyer(entry.offer) && result.status === 'PENDING_BUYER'">
          <input class="field" :id="'buyer-note-' + result._id" placeholder="填写新客核对依据或无效原因" v-model="reviewNotes[result._id]" />
          <view class="action-row">
            <button class="primary" :id="'buyer-valid-' + result._id" @tap="reviewBuyer(result._id, true)">确认为有效新客</button>
            <button class="secondary" @tap="reviewBuyer(result._id, false)">标记无效</button>
          </view>
        </view>
        <view v-if="isPromoter(entry.offer) && result.status === 'PENDING_PROMOTER'">
          <input class="field" :id="'promoter-note-' + result._id" placeholder="有争议时填写原因" v-model="reviewNotes[result._id]" />
          <view class="action-row">
            <button class="primary" :id="'promoter-confirm-' + result._id" @tap="reviewPromoter(result._id, true)">确认结果</button>
            <button class="secondary" @tap="reviewPromoter(result._id, false)">提出争议</button>
          </view>
        </view>
      </view>

      <view class="subheading">合作账单</view>
      <view class="hint" v-if="entry.offer.pricing_model === 'BY_SLOT' && !entry.offer.slot_delivery_confirmed_at">展示期结束且买方确认履约后才产生应付；当前应付为 0。</view>
      <view v-if="canConfirmSlot(entry.offer)">
        <input class="field" :id="'slot-note-' + entry.offer._id" placeholder="填写上架与展示核对依据" v-model="slotNotes[entry.offer._id]" />
        <button class="primary" :id="'slot-confirm-' + entry.offer._id" @tap="confirmSlot(entry.offer._id)">确认展位已按约展示</button>
      </view>
      <view class="line" v-if="entry.offer.slot_delivery_confirmed_at">买方履约确认：{{ entry.offer.slot_delivery_note }}</view>
      <view class="line">双方确认 {{ entry.bill.confirmed_results }} 个结果 · 买方应付合计 {{ money(entry.bill.payable_cents) }} 元</view>
      <view class="line">其中入口店应收 {{ money(entry.bill.promoter_due_cents) }} 元，平台费用 {{ money(entry.bill.platform_fee_cents) }} 元（平台收付未接入）</view>
      <view class="line">入口店已确认实收 {{ money(entry.bill.confirmed_paid_cents) }} 元 · 待确认收款 {{ money(entry.bill.pending_receipt_cents) }} 元</view>
      <view class="hint" v-if="entry.bill.overpaid_cents > 0">⚠ 已记录收款超出当前有效应收 {{ money(entry.bill.overpaid_cents) }} 元，须人工核对退款或抵扣，不自动改写实收。</view>
      <view v-if="isBuyer(entry.offer) && entry.bill.remaining_cents > 0 && entry.bill.pending_receipt_cents === 0">
        <input class="field" :id="'payment-ref-' + entry.offer._id" placeholder="线下付款凭据／流水号（不在小程序内付款）" v-model="paymentRefs[entry.offer._id]" />
        <button class="primary" :id="'payment-submit-' + entry.offer._id" @tap="recordPayment(entry.offer._id)">登记已向入口店付款 {{ money(entry.bill.remaining_cents) }} 元</button>
      </view>
      <view class="result" v-for="payment in entry.payments" :key="payment._id">
        <view class="line">付款记录 {{ money(payment.amount_cents) }} 元 · {{ payment.status === 'CONFIRMED' ? '双方确认实收' : '待入口店确认' }}</view>
        <view class="hint">凭据：{{ payment.payment_reference }}</view>
        <button class="primary" :id="'receipt-confirm-' + payment._id" v-if="isPromoter(entry.offer) && payment.status === 'PENDING_RECEIPT'" @tap="confirmReceipt(payment._id)">确认实际收到该款</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { USE_MOCK } from '@/api/adapter';
import { useMerchantStore, DEMO_MERCHANTS } from '@/store/merchant';
import { getDemoCouponTitle, publishCooperation, listCooperations, acceptCooperation, pauseCooperation, listCooperationResults, buyerReviewResult, promoterReviewResult, confirmSlotDelivery, getCooperationBill, listCooperationPayments, submitOfflinePayment, confirmOfflineReceipt, type PublishCooperationInput } from '@/api/cooperation';
import { getMerchantCouponTemplates } from '@/api/couponManage';
import { getPublicMerchants } from '@/api/merchant';
import type { CooperationBill, CooperationOffer, CooperationPayment, CooperationResult } from '@/types/cooperation';
import type { CouponTemplate } from '@/types/coupon';
import type { Merchant } from '@/types/merchant';

interface CooperationEntry { offer: CooperationOffer; results: CooperationResult[]; bill: CooperationBill; payments: CooperationPayment[] }
const store = useMerchantStore();
const merchant = computed(() => store.currentMerchant);
const merchantId = computed(() => merchant.value?._id || '');
const targetCoupons = ref<CouponTemplate[]>([]);
const promoters = ref<Merchant[]>([]);
const promoterNames = computed(() => promoters.value.map(item => item.name));
const promoterIndex = computed(() => Math.max(0, promoters.value.findIndex(item => item._id === form.value.promoterMerchantId)));
const targetCouponNames = computed(() => targetCoupons.value.map(item => item.title));
const targetCouponIndex = computed(() => Math.max(0, targetCoupons.value.findIndex(item => item._id === form.value.targetCouponId)));
const pricingNames = ['按有效新客', '按展位周期'];
const pricingIndex = ref(0);
const today = new Date();
const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const end = new Date(today.getTime() + 30 * 86400000);
const form = ref<PublishCooperationInput>({
  promoterMerchantId: 'shop_001', targetCouponId: '', pricingModel: 'PER_RESULT', unitPriceYuan: '', slotPriceYuan: '', platformFeeYuan: '', budgetYuan: '',
  startDate: dateString(today), endDate: dateString(end), newCustomerRule: '', newCustomerWindowDays: ''
});
const entries = ref<CooperationEntry[]>([]);
const reviewNotes = ref<Record<string, string>>({});
const paymentRefs = ref<Record<string, string>>({});
const slotNotes = ref<Record<string, string>>({});

const merchantName = (id: string) => DEMO_MERCHANTS.find(item => item._id === id)?.name || id;
const couponTitle = getDemoCouponTitle;
const money = (cents: number) => (cents / 100).toFixed(2);
const isBuyer = (offer: CooperationOffer) => offer.buyer_merchant_id === merchant.value?._id;
const isPromoter = (offer: CooperationOffer) => offer.promoter_merchant_id === merchant.value?._id;
const statusText = (status: string) => ({ OFFERED: '待入口店接受', PENDING_ADMIN: '待平台审核', ACTIVE: '合作进行中', PAUSED: '已暂停新领券', ENDED: '已结束', REJECTED: '平台审核未通过' } as Record<string, string>)[status] || status;
const resultStatusText = (status: string) => ({ PENDING_BUYER: '待买方核对', PENDING_PROMOTER: '待入口店核对', CONFIRMED: '双方已确认', INELIGIBLE: '无效结果', DISPUTED: '存在争议', INVALIDATED: '已更正为无效' } as Record<string, string>)[status] || status;

const load = async () => {
  if (!merchant.value) return;
  targetCoupons.value = (await getMerchantCouponTemplates(merchant.value._id)).filter(item => item.status === 'ACTIVE');
  promoters.value = (await getPublicMerchants({ pageSize: 30 })).list.filter((item: Merchant) => item._id !== merchant.value!._id);
  if (!promoters.value.some(item => item._id === form.value.promoterMerchantId)) form.value.promoterMerchantId = promoters.value[0]?._id || '';
  if (!targetCoupons.value.some(item => item._id === form.value.targetCouponId)) form.value.targetCouponId = targetCoupons.value[0]?._id || '';
  const offers = await listCooperations(merchant.value._id);
  entries.value = await Promise.all(offers.map(async offer => ({
    offer,
    results: await listCooperationResults(offer._id, merchant.value!._id),
    bill: await getCooperationBill(offer._id, merchant.value!._id),
    payments: await listCooperationPayments(offer._id, merchant.value!._id)
  })));
};
onShow(load);

const onCouponChange = (event: any) => {
  form.value.targetCouponId = targetCoupons.value[Number(event.detail.value)]?._id || '';
};
const onPromoterChange = (event: any) => { form.value.promoterMerchantId = promoters.value[Number(event.detail.value)]?._id || ''; };
const onPricingChange = (event: any) => {
  pricingIndex.value = Number(event.detail.value);
  form.value.pricingModel = pricingIndex.value === 1 ? 'BY_SLOT' : 'PER_RESULT';
};
const canConfirmSlot = (offer: CooperationOffer) => offer.pricing_model === 'BY_SLOT' && isBuyer(offer) && !!offer.accepted_at && !offer.slot_delivery_confirmed_at && offer.status !== 'PAUSED' && Date.now() >= new Date(`${offer.end_date}T00:00:00+08:00`).getTime() + 86400000;

const publish = async () => {
  if (!merchant.value) return;
  await run(() => publishCooperation(merchant.value!._id, form.value));
};

const accept = (id: string) => run(() => acceptCooperation(id, merchantId.value));
const pause = (id: string) => run(() => pauseCooperation(id, merchantId.value));
const reviewBuyer = (id: string, valid: boolean) => run(() => buyerReviewResult(id, merchantId.value, valid, reviewNotes.value[id] || ''));
const reviewPromoter = (id: string, valid: boolean) => run(() => promoterReviewResult(id, merchantId.value, valid, reviewNotes.value[id] || ''));
const recordPayment = (id: string) => run(() => submitOfflinePayment(id, merchantId.value, paymentRefs.value[id] || ''));
const confirmReceipt = (id: string) => run(() => confirmOfflineReceipt(id, merchantId.value));
const confirmSlot = (id: string) => run(() => confirmSlotDelivery(id, merchantId.value, slotNotes.value[id] || ''));

const run = async (action: () => Promise<unknown>) => {
  try {
    await action();
    await load();
    uni.showToast({ title: USE_MOCK ? '本地演示记录已更新' : '合作记录已更新', icon: 'none' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '操作失败', icon: 'none' });
  }
};
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; color: var(--zs-ink); background: var(--zs-canvas); }
.notice { margin-bottom: 17rpx; padding: 17rpx 19rpx; border: 1rpx solid #f1dfbc; border-radius: 13rpx; color: #876a3e; background: #fff6e7; font-size: 20rpx; line-height: 1.45; }
.panel { margin-bottom: 17rpx; padding: 24rpx; border: 1rpx solid var(--zs-border); border-radius: 19rpx; background: #fff; box-shadow: 0 4rpx 16rpx rgba(21,57,38,.035); }
.heading { color: var(--zs-ink); font-size: 28rpx; font-weight: 750; line-height: 1.35; }
.subheading { margin-top: 27rpx; padding-top: 19rpx; border-top: 1rpx solid var(--zs-border); color: var(--zs-ink); font-size: 25rpx; font-weight: 750; }
.hint { margin: 10rpx 0; color: var(--zs-muted); font-size: 20rpx; line-height: 1.5; }
.status { display: inline-block; margin-top: 11rpx; padding: 6rpx 11rpx; border-radius: 8rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 20rpx; font-weight: 700; }
.line { margin: 11rpx 0; color: #4c6654; font-size: 21rpx; line-height: 1.5; }
.field-label { display: block; margin-top: 21rpx; color: var(--zs-ink); font-size: 22rpx; font-weight: 700; }
.field, .picker, .rule-field { width: 100%; min-height: 72rpx; margin-top: 9rpx; padding: 0 17rpx; box-sizing: border-box; border: 1rpx solid var(--zs-border); border-radius: 11rpx; color: var(--zs-ink); background: #f8faf7; font-size: 22rpx; }
.picker { display: flex; align-items: center; padding: 14rpx 17rpx; }
.rule-field { height: 155rpx; padding: 15rpx 17rpx; }
.date-row, .action-row { display: flex; gap: 10rpx; }
.date-row picker, .action-row button { flex: 1; min-width: 0; }
button { margin: 16rpx 0 0; padding: 0 18rpx; min-height: 62rpx; line-height: 62rpx; border-radius: 31rpx; color: var(--zs-green); background: var(--zs-green-soft); font-size: 21rpx; }
.primary { color: white; background: var(--zs-green); font-weight: 700; }
.secondary { color: #65796a; background: #eef2ed; }
.result { margin-top: 15rpx; padding-top: 17rpx; border-top: 1rpx solid var(--zs-border); }
</style>
