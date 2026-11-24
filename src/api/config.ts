import { USE_MOCK, callCloudFunction } from './adapter';
import { readMockState, writeMockState, nextMockId } from './mockState';
import { useUserStore } from '@/store/user';
import type { AppConfig } from '@/types/config';

const filtered = (config: AppConfig): AppConfig => ({
  towns: config.towns.filter(item => item.active),
  infoCategories: config.infoCategories.filter(item => item.active),
  merchantCategories: config.merchantCategories.filter(item => item.active)
});
export async function getAppConfig(): Promise<AppConfig> {
  if (!USE_MOCK) {
    const response = await callCloudFunction<{ success: boolean; config?: AppConfig; message?: string }>('configManage', { action: 'list' });
    if (!response.success || !response.config) throw new Error(response.message || '配置加载失败');
    return response.config;
  }
  return filtered(readMockState().config);
}
export async function getAdminConfig(): Promise<AppConfig> {
  if (!USE_MOCK) {
    const response = await callCloudFunction<{ success: boolean; config?: AppConfig; message?: string }>('configManage', { action: 'adminList' });
    if (!response.success || !response.config) throw new Error(response.message || '配置加载失败');
    return response.config;
  }
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  return readMockState().config;
}
export async function setConfigActive(section: keyof AppConfig, id: string, active: boolean): Promise<void> {
  if (!USE_MOCK) {
    const response = await callCloudFunction<{ success: boolean; message?: string }>('configManage', { action: 'setActive', section, id, active });
    if (!response.success) throw new Error(response.message || '配置更新失败');
    return;
  }
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
  const state = readMockState();
  const list = state.config[section];
  const item = list.find(entry => entry.id === id);
  if (!item) throw new Error('配置项不存在');
  if (!active && list.filter(entry => entry.active).length <= 1) throw new Error('至少保留一项可用');
  item.active = active;
  state.infoAuditLogs.unshift({ _id: nextMockId(state, 'audit'), actor_id: 'demo_admin', action: active ? 'CONFIG_ENABLE' : 'CONFIG_DISABLE', target_id: `${section}:${id}`, reason: '管理员调整可用范围', created_at: new Date().toISOString() });
  writeMockState(state);
}
