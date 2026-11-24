import { callCloudFunction } from './adapter';

export interface ManagedUser {
  _id: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at?: string;
  status_reason?: string;
}

export interface ManagedAudit {
  _id: string;
  target_type: string;
  target_id: string;
  actor_id: string;
  action: string;
  reason: string;
  created_at: string;
}

export async function adminAllAudits(): Promise<ManagedAudit[]> {
  const response = await callCloudFunction<{ success: boolean; list: ManagedAudit[]; message?: string }>('userManage', { action: 'audit' });
  if (!response.success) throw new Error(response.message || '审计记录加载失败');
  return response.list || [];
}

export async function adminListUsers(page = 1): Promise<{ list: ManagedUser[]; total: number; hasMore: boolean }> {
  const response = await callCloudFunction<{ success: boolean; list: ManagedUser[]; total: number; hasMore: boolean; message?: string }>('userManage', { action: 'list', page });
  if (!response.success) throw new Error(response.message || '用户列表加载失败');
  return { list: response.list || [], total: response.total || 0, hasMore: !!response.hasMore };
}

export async function adminSetUserStatus(userId: string, status: ManagedUser['status'], reason: string): Promise<void> {
  const response = await callCloudFunction<{ success: boolean; message?: string }>('userManage', { action: 'setStatus', userId, status, reason });
  if (!response.success) throw new Error(response.message || '用户状态更新失败');
}
