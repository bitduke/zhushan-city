export type AppointmentStatus =
  | 'REQUESTED'   // 用户已提交时段，待商家确认
  | 'CONFIRMED'   // 商家已确认
  | 'REJECTED'    // 商家拒绝 (客满/时段不合)
  | 'CANCELLED'   // 用户取消
  | 'ARRIVED'     // 顾客已到店
  | 'NO_SHOW'     // 未到店失约
  | 'COMPLETED';  // 服务核销完成

export interface Appointment {
  _id: string;
  user_id: string;
  user_coupon_id: string;
  merchant_id: string;
  merchant_name: string;
  coupon_title: string;
  contact_name: string;
  contact_phone: string;
  contact_consent_at?: string;
  requested_time_slot: string; // 用户期望时段
  confirmed_time_slot?: string;// 商家确认时段
  status: AppointmentStatus;
  reject_reason?: string;
  is_first_visit?: boolean;    // 商家在到店时确认的是否首访
  requested_at: string;
  confirmed_at?: string;
  arrived_at?: string;
  completed_at?: string;
}
