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

// 仅用于本机演示预览：当无演示样本时填充一份居民省钱+临期倒计时与商家同业诊断样板数据
export function ensureRichDemoPreviewData(userId = 'u_guest_demo'): void {
  const state = readMockState();
  const now = Date.now();
  let changed = false;

  if (!state.merchants.some(m => m._id === 'shop_peer_apparel')) {
    state.merchants.push({
      _id: 'shop_peer_apparel',
      owner_id: 'peer_owner_demo',
      name: '青竹坊精品服饰 (城关二店)',
      category_id: 'apparel',
      category_name: '服装女装',
      town: '城关镇',
      address: '竹山县人民路银泰商厦1楼',
      phone: '13900008888',
      avatar: '',
      images: [],
      description: '同行业演示基准对比门店',
      business_hours: '09:30 - 21:30',
      daily_booking_limit: 0,
      status: 'APPROVED',
      qrcode_token: 'mPeer01',
      created_at: '2026-11-01'
    });
    changed = true;
  }

  if (state.coupons.length === 0) {
    state.coupons.push(
      {
        _id: 'demo_uc_used_1',
        code: 'ZSDEMOUSED001',
        user_id: userId,
        coupon_id: 'demo_tpl_1',
        merchant_id: 'shop_001',
        merchant_name: '雅致名媛女装店 (城关人民路店)',
        category_id: 'apparel',
        category_name: '服装女装',
        source_merchant_id: 'shop_001',
        status: 'USED',
        claimed_at: new Date(now - 5 * 86400000).toISOString(),
        used_at: new Date(now - 3 * 86400000).toISOString(),
        expires_at: new Date(now + 20 * 86400000).toISOString(),
        rule_snapshot: {
          title: '盟友专享当季正价女装满128减25',
          type: 'FULL_REDUCTION',
          condition_amount: 128,
          discount_amount: 25,
          usage_mode: 'INSTANT',
          booking_required: false,
          valid_days: 30,
          instructions: '正价服饰满128立减25元。'
        }
      },
      {
        _id: 'demo_uc_used_2',
        code: 'ZSDEMOUSED002',
        user_id: userId,
        coupon_id: 'demo_tpl_2',
        merchant_id: 'shop_002',
        merchant_name: '奈奈日式美睫美甲沙龙',
        category_id: 'beauty',
        category_name: '美容美甲',
        source_merchant_id: 'shop_001',
        status: 'USED',
        claimed_at: new Date(now - 7 * 86400000).toISOString(),
        used_at: new Date(now - 2 * 86400000).toISOString(),
        expires_at: new Date(now + 15 * 86400000).toISOString(),
        rule_snapshot: {
          title: '纯色美甲护理体验满48抵15元',
          type: 'EXPERIENCE',
          condition_amount: 48,
          discount_amount: 15,
          usage_mode: 'WALK_IN',
          booking_required: false,
          valid_days: 30,
          instructions: '正价基础美甲护理可用。'
        }
      },
      {
        _id: 'demo_uc_soon_1',
        code: 'ZSDEMOSOON001',
        user_id: userId,
        coupon_id: 'demo_tpl_3',
        merchant_id: 'shop_001',
        merchant_name: '雅致名媛女装店 (城关人民路店)',
        category_id: 'apparel',
        category_name: '服装女装',
        source_merchant_id: 'shop_001',
        status: 'UNUSED',
        claimed_at: new Date(now - 2 * 86400000).toISOString(),
        expires_at: new Date(now + 18 * 3600000).toISOString(),
        rule_snapshot: {
          title: '街坊专享满88减18元换季券',
          type: 'FULL_REDUCTION',
          condition_amount: 88,
          discount_amount: 18,
          usage_mode: 'INSTANT',
          booking_required: false,
          valid_days: 7,
          instructions: '到店实付满88元立减18元。'
        }
      },
      {
        _id: 'demo_uc_unused_2',
        code: 'ZSDEMOBEAUTY01',
        user_id: userId,
        coupon_id: 'demo_tpl_4',
        merchant_id: 'shop_003',
        merchant_name: '御竹轩足道养生会所',
        category_id: 'foot_bath',
        category_name: '足道养生',
        source_merchant_id: 'shop_001',
        status: 'UNUSED',
        claimed_at: new Date(now - 1 * 86400000).toISOString(),
        expires_at: new Date(now + 14 * 86400000).toISOString(),
        rule_snapshot: {
          title: '下午闲时养生预约满98减20元',
          type: 'FULL_REDUCTION',
          condition_amount: 98,
          discount_amount: 20,
          usage_mode: 'BOOKING',
          booking_required: true,
          valid_days: 30,
          instructions: '限每天12:00-18:00预约进店使用。'
        }
      }
    );
    changed = true;
  }

  if (state.scanLogs.length === 0) {
    // shop_001: 20次扫码, 5次自己领券(25%获客率)
    for (let i = 0; i < 20; i++) {
      state.scanLogs.push({ token: 'mA001', source_merchant_id: 'shop_001', user_id: `demo_u_${i}`, scanned_at: nowIso(now - i * 3600000) });
    }
    // 同行对照店 shop_peer_apparel: 10次扫码, 6次领券(60%获客率)
    for (let i = 0; i < 10; i++) {
      state.scanLogs.push({ token: 'mPeer01', source_merchant_id: 'shop_peer_apparel', user_id: `peer_u_${i}`, scanned_at: nowIso(now - i * 3600000) });
    }
    for (let i = 0; i < 6; i++) {
      state.coupons.push({
        _id: `peer_uc_${i}`,
        code: `ZSPEER00${i}`,
        user_id: `peer_u_${i}`,
        coupon_id: 'peer_tpl',
        merchant_id: 'shop_peer_apparel',
        merchant_name: '青竹坊精品服饰 (城关二店)',
        category_id: 'apparel',
        category_name: '服装女装',
        source_merchant_id: 'shop_peer_apparel',
        status: i < 4 ? 'USED' : 'UNUSED',
        claimed_at: nowIso(now - 86400000),
        expires_at: nowIso(now + 20 * 86400000),
        rule_snapshot: { title: '同行对照券', type: 'FULL_REDUCTION', condition_amount: 100, discount_amount: 15, usage_mode: 'INSTANT', booking_required: false, valid_days: 30, instructions: '对照测试' }
      });
    }
    // 补充 shop_001 的其他4名领券记录，凑满6张领券样本以便产生精确对比率
    for (let i = 0; i < 4; i++) {
      state.coupons.push({
        _id: `shop1_extra_uc_${i}`,
        code: `ZSS1EXTRA0${i}`,
        user_id: `demo_u_${i}`,
        coupon_id: 'demo_tpl_1',
        merchant_id: 'shop_001',
        merchant_name: '雅致名媛女装店 (城关人民路店)',
        category_id: 'apparel',
        category_name: '服装女装',
        source_merchant_id: 'shop_001',
        status: 'UNUSED',
        claimed_at: nowIso(now - 86400000),
        expires_at: nowIso(now + 10 * 86400000),
        rule_snapshot: { title: '女装满减体验', type: 'FULL_REDUCTION', condition_amount: 128, discount_amount: 25, usage_mode: 'INSTANT', booking_required: false, valid_days: 30, instructions: '满128减25' }
      });
    }
    changed = true;
  }

  if (changed) writeMockState(state);
}

function nowIso(ms: number): string {
  return new Date(ms).toISOString();
}
