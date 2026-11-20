import { USE_MOCK, callCloudFunction } from './adapter';
import couponsMock from '@/mock/coupons.json';
import type { UserCoupon } from '@/types/coupon';
import { VERIFY_ERROR_CODES, VERIFY_ERROR_MESSAGES } from '@/constants/errCodes';

// 领券
export async function claimCoupon(params: {
  couponId: string;
  sourceMerchantId?: string;
}): Promise<UserCoupon> {
  if (USE_MOCK) {
    const isSelf = params.couponId === 'cp_self_001';
    const newCoupon: UserCoupon = {
      _id: 'uc_' + Date.now(),
      code: 'ZS' + Math.floor(10000000 + Math.random() * 90000000),
      user_id: 'u_guest_demo',
      coupon_id: params.couponId,
      merchant_id: isSelf ? 'shop_001' : 'shop_002',
      merchant_name: isSelf ? '雅致名媛女装店' : '奈奈日式美睫美甲沙龙',
      merchant_address: isSelf ? '竹山县人民路步行街中段18号' : '竹山县北大街银座二楼',
      merchant_phone: isSelf ? '13872810001' : '13972820002',
      source_merchant_id: params.sourceMerchantId,
      status: 'UNUSED',
      claimed_at: new Date().toLocaleString(),
      expires_at: '2026-12-31 23:59',
      rule_snapshot: {
        title: isSelf ? '本店试衣结账当场立减券' : '雅致老客专享·38元纯色美甲体验',
        type: isSelf ? 'FULL_REDUCTION' : 'EXPERIENCE',
        condition_amount: isSelf ? 200 : 0,
        discount_amount: isSelf ? 20 : 60,
        usage_mode: isSelf ? 'INSTANT' : 'BOOKING',
        booking_required: !isSelf,
        valid_days: 30,
        instructions: isSelf ? '出示当场核销立减20元' : '凭此券享38元体验，需提前预约'
      }
    };
    return newCoupon;
  }
  return callCloudFunction('couponClaim', params);
}

// 我的券包
export async function getMyCoupons(): Promise<UserCoupon[]> {
  if (USE_MOCK) {
    return couponsMock as UserCoupon[];
  }
  return callCloudFunction('getMyCoupons');
}

// 商家核销接口（含状态机与错误码处理）
export async function verifyCoupon(params: {
  code: string;
  operatorMerchantId: string;
}): Promise<{ success: boolean; code?: number; message?: string; coupon?: UserCoupon }> {
  if (USE_MOCK) {
    const list = couponsMock as UserCoupon[];
    const target = list.find(c => c.code.trim() === params.code.trim());

    if (!target) {
      return {
        success: false,
        code: VERIFY_ERROR_CODES.NOT_FOUND,
        message: VERIFY_ERROR_MESSAGES[VERIFY_ERROR_CODES.NOT_FOUND]
      };
    }
    if (target.merchant_id !== params.operatorMerchantId) {
      return {
        success: false,
        code: VERIFY_ERROR_CODES.WRONG_MERCHANT,
        message: VERIFY_ERROR_MESSAGES[VERIFY_ERROR_CODES.WRONG_MERCHANT]
      };
    }
    if (target.status === 'USED') {
      return {
        success: false,
        code: VERIFY_ERROR_CODES.ALREADY_USED,
        message: VERIFY_ERROR_MESSAGES[VERIFY_ERROR_CODES.ALREADY_USED]
      };
    }
    if (target.status === 'EXPIRED') {
      return {
        success: false,
        code: VERIFY_ERROR_CODES.EXPIRED,
        message: VERIFY_ERROR_MESSAGES[VERIFY_ERROR_CODES.EXPIRED]
      };
    }

    target.status = 'USED';
    target.used_at = new Date().toLocaleString();

    return {
      success: true,
      message: '核销成功！优惠已兑现。',
      coupon: target
    };
  }
  return callCloudFunction('couponVerify', params);
}
