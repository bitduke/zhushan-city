import type { Appointment } from '@/types/appointment';
import type { UserCoupon, CouponTemplate } from '@/types/coupon';
import type { CooperationOffer, CooperationResult, CooperationPayment } from '@/types/cooperation';
import type { InfoItem, InfoReport, InfoAuditLog } from '@/types/info';
import homeMock from '@/mock/home.json';
import shopDetailMock from '@/mock/shopDetail_A.json';
import { DEMO_MERCHANTS } from '@/store/merchant';
import type { Merchant, MerchantApplication, MerchantStaff, StaffInvite } from '@/types/merchant';
import baseConfig from '../../cloudfunctions/configManage/base.json';
import type { AppConfig } from '@/types/config';

const STORAGE_KEY = 'zhushan_mock_core_v1';

export interface MockVerifyLog {
  coupon_code: string;
  coupon_title: string;
  merchant_id: string;
  verified_at: string;
}

export interface MockScanLog {
  token: string;
  source_merchant_id: string;
  user_id: string;
  scanned_at: string;
}

export interface MockCoreState {
  coupons: UserCoupon[];
  appointments: Appointment[];
  verifyLogs: MockVerifyLog[];
  cooperations: CooperationOffer[];
  cooperationResults: CooperationResult[];
  cooperationPayments: CooperationPayment[];
  infos: InfoItem[];
  infoReports: InfoReport[];
  infoAuditLogs: InfoAuditLog[];
  merchants: Merchant[];
  merchantApplications: MerchantApplication[];
  merchantStaff: MerchantStaff[];
  staffInvites: StaffInvite[];
  merchantAuditLogs: InfoAuditLog[];
  couponTemplates: CouponTemplate[];
  scanLogs: MockScanLog[];
  config: AppConfig;
  nextId: number;
}

const initialConfig = (): AppConfig => JSON.parse(JSON.stringify(baseConfig));

function seedCouponTemplates(): CouponTemplate[] {
  return [shopDetailMock.self_coupon, ...shopDetailMock.cross_coupons].map(item => ({
    ...item,
    type: item.type as CouponTemplate['type'],
    usage_mode: item.usage_mode as CouponTemplate['usage_mode'],
    claimed_count: 0,
    redeemed_count: 0,
    per_user_limit: 1,
    status: 'ACTIVE' as const
  }));
}

function seedInfos(): InfoItem[] {
  const now = Date.now();
  const categoryIds: Record<string, string> = { 房屋租售: 'house', 二手闲置: 'idle', '转让/合作': 'transfer' };
  return homeMock.recent_infos.map((item, index) => ({
    _id: item._id,
    user_id: 'demo_seed',
    author_name: `演示·${item.author_name}`,
    category_id: categoryIds[item.category_name] || 'other',
    category_name: item.category_name,
    town: item.town,
    title: item.title,
    content: '此为本地演示信息。真实内容需由发布者提交并经平台审核。',
    price: item.price,
    price_desc: item.price_desc,
    images: item.images,
    contact_phone: '',
    contact_consent: false,
    status: 'APPROVED' as const,
    view_count: 0,
    created_at: new Date(now - [10, 35, 60][index] * 60000).toISOString(),
    updated_at: new Date(now).toISOString(),
    expires_at: new Date(now + 30 * 86400000).toISOString()
  }));
}

function emptyState(): MockCoreState {
  return { coupons: [], appointments: [], verifyLogs: [], cooperations: [], cooperationResults: [], cooperationPayments: [], infos: seedInfos(), infoReports: [], infoAuditLogs: [], merchants: DEMO_MERCHANTS.map(item => ({ ...item })), merchantApplications: [], merchantStaff: [], staffInvites: [], merchantAuditLogs: [], couponTemplates: seedCouponTemplates(), scanLogs: [], config: initialConfig(), nextId: 1 };
}

export function readMockState(): MockCoreState {
  const stored = uni.getStorageSync(STORAGE_KEY);
  if (!stored || !Array.isArray(stored.coupons) || !Array.isArray(stored.appointments)) {
    const initial = emptyState();
    uni.setStorageSync(STORAGE_KEY, initial);
    return initial;
  }
  const state: MockCoreState = {
    coupons: stored.coupons,
    appointments: stored.appointments,
    verifyLogs: Array.isArray(stored.verifyLogs) ? stored.verifyLogs : [],
    cooperations: Array.isArray(stored.cooperations) ? stored.cooperations : [],
    cooperationResults: Array.isArray(stored.cooperationResults) ? stored.cooperationResults : [],
    cooperationPayments: Array.isArray(stored.cooperationPayments) ? stored.cooperationPayments : [],
    infos: Array.isArray(stored.infos) ? stored.infos : seedInfos(),
    infoReports: Array.isArray(stored.infoReports) ? stored.infoReports : [],
    infoAuditLogs: Array.isArray(stored.infoAuditLogs) ? stored.infoAuditLogs : [],
    merchants: Array.isArray(stored.merchants) ? stored.merchants : DEMO_MERCHANTS.map(item => ({ ...item })),
    merchantApplications: Array.isArray(stored.merchantApplications) ? stored.merchantApplications : [],
    merchantStaff: Array.isArray(stored.merchantStaff) ? stored.merchantStaff : [],
    staffInvites: Array.isArray(stored.staffInvites) ? stored.staffInvites : [],
    merchantAuditLogs: Array.isArray(stored.merchantAuditLogs) ? stored.merchantAuditLogs : [],
    couponTemplates: Array.isArray(stored.couponTemplates) ? stored.couponTemplates : seedCouponTemplates(),
    scanLogs: Array.isArray(stored.scanLogs) ? stored.scanLogs : [],
    config: stored.config && Array.isArray(stored.config.towns) ? stored.config : initialConfig(),
    nextId: Number.isInteger(stored.nextId) && stored.nextId > 0 ? stored.nextId : 1
  };
  let migrated = !Array.isArray(stored.infos) || !Array.isArray(stored.merchants) || !Array.isArray(stored.couponTemplates) || !Array.isArray(stored.scanLogs) || !stored.config;
  const legacyCategory = state.config.infoCategories.find(item => item.id === 'turquoise');
  if (legacyCategory) {
    Object.assign(legacyCategory, { id: 'transfer', name: '转让/合作', icon: 'handshake', desc: '门店转让/项目合作' });
    migrated = true;
  }
  const legacyDemo = state.infos.find(item => item._id === 'info_103' && item.user_id === 'demo_seed' && item.category_id === 'turquoise');
  if (legacyDemo) {
    const replacement = seedInfos().find(item => item._id === 'info_103');
    if (replacement) Object.assign(legacyDemo, replacement);
    migrated = true;
  }
  for (const demo of DEMO_MERCHANTS) {
    const merchant = state.merchants.find(item => item._id === demo._id);
    if (merchant && !merchant.qrcode_token) { merchant.qrcode_token = demo.qrcode_token; migrated = true; }
    if (merchant && merchant.daily_booking_limit === undefined) { merchant.daily_booking_limit = demo.daily_booking_limit; migrated = true; }
  }
  if (migrated) uni.setStorageSync(STORAGE_KEY, state);
  return state;
}

export function writeMockState(state: MockCoreState): void {
  uni.setStorageSync(STORAGE_KEY, state);
}

export function nextMockId(state: MockCoreState, prefix: string): string {
  const id = `${prefix}_${Date.now()}_${state.nextId}`;
  state.nextId += 1;
  return id;
}
