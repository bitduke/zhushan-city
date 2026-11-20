export type InfoStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'OFFLINE' | 'EXPIRED';

export interface InfoItem {
  _id: string;
  user_id: string;
  author_name: string;
  category_id: string; // 租房, 二手, 家政, 拼车, 绿松石名片
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
  expires_at: string;
}
