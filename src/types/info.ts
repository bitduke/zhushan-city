export type InfoStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'OFFLINE' | 'EXPIRED';

export interface InfoItem {
  _id: string;
  user_id: string;
  author_name: string;
  category_id: string; // 租房、二手、家政、拼车、转让/合作等
  category_name: string;
  town: string;
  title: string;
  content: string;
  price?: number;
  price_desc?: string;
  images: string[];
  contact_phone: string;
  contact_consent: boolean; // 是否同意公开联系方式
  status: InfoStatus;
  view_count: number;
  created_at: string;
  updated_at?: string;
  expires_at: string;
  review_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  offline_reason?: string;
}

export interface InfoReport {
  _id: string;
  info_id: string;
  reporter_user_id: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolution?: 'DISMISSED' | 'OFFLINED';
  resolution_reason?: string;
  created_at: string;
  resolved_at?: string;
}

export interface InfoAuditLog {
  _id: string;
  actor_id: string;
  action: string;
  target_id: string;
  reason: string;
  created_at: string;
}
