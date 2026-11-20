export const VERIFY_ERROR_CODES = {
  NOT_FOUND: 4001,      // 券码不存在
  WRONG_MERCHANT: 4002, // 券不属于本商家
  ALREADY_USED: 4003,   // 券已使用
  EXPIRED: 4004,        // 券已过期
  NOT_ACTIVE: 4005,     // 券未到生效时间
  SUSPENDED: 4006,      // 商家或券已被停用
  BOOKING_REQUIRED: 4007// 需先完成预约确认方可核销
} as const;

export const VERIFY_ERROR_MESSAGES: Record<number, string> = {
  [VERIFY_ERROR_CODES.NOT_FOUND]: '核销失败：券码不存在或无效',
  [VERIFY_ERROR_CODES.WRONG_MERCHANT]: '核销失败：此券不属于本店，请出示本店有效券',
  [VERIFY_ERROR_CODES.ALREADY_USED]: '核销失败：该券已被核销，无法重复使用',
  [VERIFY_ERROR_CODES.EXPIRED]: '核销失败：该券已过有效期',
  [VERIFY_ERROR_CODES.NOT_ACTIVE]: '核销失败：该券未到生效时间',
  [VERIFY_ERROR_CODES.SUSPENDED]: '核销失败：该卡券或商户服务已被暂停',
  [VERIFY_ERROR_CODES.BOOKING_REQUIRED]: '核销失败：该服务券需提前预约，且经商家确认到店后方可核销'
};
