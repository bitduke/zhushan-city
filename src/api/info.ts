import { USE_MOCK, callCloudFunction } from './adapter';
import { nextMockId, readMockState, writeMockState, type MockCoreState } from './mockState';
import { useUserStore } from '@/store/user';
import type { InfoItem, InfoReport } from '@/types/info';

export interface InfoListParams {
  categoryId?: string;
  town?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function requireMock(): void {
  if (!USE_MOCK) throw new Error('模拟数据操作仅在本地模式可用');
}

async function cloudInfo(action: string, payload: Record<string, unknown> = {}) {
  const result = await callCloudFunction<any>('infoManage', { action, ...payload });
  if (!result.success) throw new Error(result.message || '便民信息服务暂不可用');
  return result;
}

function currentUserId(): string {
  return useUserStore().profile?._id || 'u_guest_demo';
}

function requireDemoAdmin(): void {
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
}

function updateExpired(state: MockCoreState): boolean {
  let changed = false;
  for (const item of state.infos) {
    if (item.status === 'APPROVED' && new Date(item.expires_at).getTime() <= Date.now()) {
      item.status = 'EXPIRED';
      changed = true;
    }
  }
  return changed;
}

function readCurrentState(): MockCoreState {
  const state = readMockState();
  if (updateExpired(state)) writeMockState(state);
  return state;
}

function publicCopy(item: InfoItem): InfoItem {
  return { ...item, contact_phone: item.contact_consent ? item.contact_phone : '' };
}

export async function getInfoList(params: InfoListParams = {}) {
  const keyword = (params.keyword || '').trim() === '租房' ? '房屋租售' : (params.keyword || '').trim();
  if (!USE_MOCK) return cloudInfo('list', { ...params, keyword });
  requireMock();
  const state = readCurrentState();
  const normalizedKeyword = keyword.toLocaleLowerCase();
  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.max(1, Math.min(30, Math.floor(params.pageSize || 10)));
  const list = state.infos.filter(item =>
    item.status === 'APPROVED' &&
    new Date(item.expires_at).getTime() > Date.now() &&
    (!params.categoryId || params.categoryId === 'all' || item.category_id === params.categoryId) &&
    (!params.town || params.town === '全竹山' || item.town === params.town) &&
    (!normalizedKeyword || `${item.category_name} ${item.town} ${item.title} ${item.content}`.toLocaleLowerCase().includes(normalizedKeyword))
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const start = (page - 1) * pageSize;
  return { list: list.slice(start, start + pageSize).map(publicCopy), page, pageSize, total: list.length, hasMore: start + pageSize < list.length };
}

export async function getInfoDetail(id: string): Promise<InfoItem | null> {
  if (!USE_MOCK) return (await cloudInfo('detail', { id })).item || null;
  requireMock();
  const item = readCurrentState().infos.find(info => info._id === id);
  if (!item) return null;
  if (item.user_id !== currentUserId() && item.status !== 'APPROVED') return null;
  if (item.user_id !== currentUserId() && new Date(item.expires_at).getTime() <= Date.now()) return null;
  return item.user_id === currentUserId() ? { ...item } : publicCopy(item);
}

export async function getMyInfos(): Promise<InfoItem[]> {
  if (!USE_MOCK) return (await cloudInfo('mine')).list || [];
  requireMock();
  return readCurrentState().infos.filter(item => item.user_id === currentUserId()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function validatedForm(data: Partial<InfoItem>) {
  const config = readMockState().config;
  const category = config.infoCategories.find(item => item.id === data.category_id && item.active);
  if (!category) throw new Error('请选择有效信息分类');
  if (!config.towns.some(item => item.name === data.town && item.active)) throw new Error('请选择有效乡镇');
  const title = (data.title || '').trim();
  const content = (data.content || '').trim();
  const phone = (data.contact_phone || '').trim();
  if (title.length < 4 || title.length > 30) throw new Error('标题须为 4–30 字');
  if (content.length < 10) throw new Error('详细描述至少 10 字');
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请填写有效的 11 位手机号');
  if (!data.contact_consent) throw new Error('请明确同意公开联系电话');
  const images = data.images || [];
  if (!Array.isArray(images) || images.length > 9) throw new Error('最多上传 9 张图片');
  return { category_id: category.id, category_name: category.name, town: data.town!, title, content, price_desc: (data.price_desc || '').trim(), contact_phone: phone, contact_consent: true, images };
}

function audit(state: MockCoreState, action: string, targetId: string, reason: string, actorId = currentUserId()): void {
  state.infoAuditLogs.unshift({ _id: nextMockId(state, 'audit'), actor_id: actorId, action, target_id: targetId, reason, created_at: new Date().toISOString() });
}

export async function publishInfo(data: Partial<InfoItem>) {
  if (!USE_MOCK) {
    const result = await cloudInfo('create', { data, authorName: useUserStore().profile?.nickname || '竹山居民' });
    return { success: true, item: result.item, message: '已提交审核，请在“我的发布”查看状态' };
  }
  requireMock();
  const clean = validatedForm(data);
  const state = readCurrentState();
  const now = new Date().toISOString();
  const item: InfoItem = {
    ...clean,
    _id: nextMockId(state, 'info'),
    user_id: currentUserId(),
    author_name: useUserStore().profile?.nickname || '竹山居民',
    status: 'PENDING',
    view_count: 0,
    created_at: now,
    updated_at: now,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
  };
  state.infos.push(item);
  audit(state, 'INFO_SUBMIT', item._id, '发布待审');
  writeMockState(state);
  return { success: true, item, message: '已进入本地演示审核队列；真实平台审核尚未接入' };
}

export async function updateInfo(id: string, data: Partial<InfoItem>): Promise<InfoItem> {
  if (!USE_MOCK) return (await cloudInfo('update', { id, data })).item;
  requireMock();
  const clean = validatedForm(data);
  const state = readCurrentState();
  const item = state.infos.find(info => info._id === id && info.user_id === currentUserId());
  if (!item) throw new Error('信息不存在或无权编辑');
  if (item.status === 'OFFLINE') throw new Error('已下架信息请先申请续期');
  Object.assign(item, clean, { status: 'PENDING', updated_at: new Date().toISOString(), review_reason: '' });
  audit(state, 'INFO_UPDATE', id, '编辑后重新审核并暂时下架');
  writeMockState(state);
  return { ...item };
}

export async function offlineInfo(id: string): Promise<void> {
  if (!USE_MOCK) { await cloudInfo('offline', { id }); return; }
  requireMock();
  const state = readCurrentState();
  const item = state.infos.find(info => info._id === id && info.user_id === currentUserId());
  if (!item) throw new Error('信息不存在或无权下架');
  if (item.status === 'OFFLINE') return;
  item.status = 'OFFLINE';
  item.updated_at = new Date().toISOString();
  audit(state, 'INFO_OFFLINE', id, '发布者主动下架');
  writeMockState(state);
}

export async function renewInfo(id: string): Promise<void> {
  if (!USE_MOCK) { await cloudInfo('renew', { id }); return; }
  requireMock();
  const state = readCurrentState();
  const item = state.infos.find(info => info._id === id && info.user_id === currentUserId());
  if (!item) throw new Error('信息不存在或无权续期');
  if (!['EXPIRED', 'OFFLINE', 'REJECTED'].includes(item.status)) throw new Error('当前状态无需续期');
  item.status = 'PENDING';
  item.expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
  item.updated_at = new Date().toISOString();
  audit(state, 'INFO_RENEW', id, '申请续期并重新审核');
  writeMockState(state);
}

export async function reportInfo(id: string, reason: string): Promise<InfoReport> {
  if (!USE_MOCK) return (await cloudInfo('report', { id, reason })).report;
  requireMock();
  if (reason.trim().length < 3) throw new Error('请填写举报原因');
  const state = readCurrentState();
  const info = state.infos.find(item => item._id === id && item.status === 'APPROVED');
  if (!info) throw new Error('该信息不可举报');
  if (state.infoReports.some(item => item.info_id === id && item.reporter_user_id === currentUserId() && item.status === 'OPEN')) throw new Error('你已提交过待处理举报');
  const report: InfoReport = { _id: nextMockId(state, 'report'), info_id: id, reporter_user_id: currentUserId(), reason: reason.trim(), status: 'OPEN', created_at: new Date().toISOString() };
  state.infoReports.push(report);
  writeMockState(state);
  return report;
}

export async function adminPendingInfos(): Promise<InfoItem[]> {
  if (!USE_MOCK) return (await cloudInfo('adminPending')).list || [];
  requireMock(); requireDemoAdmin();
  return readCurrentState().infos.filter(item => item.status === 'PENDING');
}

export async function adminAllInfos(): Promise<InfoItem[]> {
  if (!USE_MOCK) return (await cloudInfo('adminAll')).list || [];
  requireMock(); requireDemoAdmin();
  return readCurrentState().infos;
}

export async function adminReviewInfo(id: string, approve: boolean, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudInfo('adminReview', { id, approve, reason }); return; }
  requireMock(); requireDemoAdmin();
  if (!approve && reason.trim().length < 3) throw new Error('拒绝时须填写原因');
  const state = readCurrentState();
  const item = state.infos.find(info => info._id === id && info.status === 'PENDING');
  if (!item) throw new Error('信息已变化或不在待审队列');
  if (approve && (!state.config.infoCategories.some(category => category.id === item.category_id && category.active) || !state.config.towns.some(town => town.name === item.town && town.active))) throw new Error('分类或乡镇已停用，不能审核公开');
  item.status = approve ? 'APPROVED' : 'REJECTED';
  item.review_reason = reason.trim();
  item.reviewed_by = 'demo_admin';
  item.reviewed_at = new Date().toISOString();
  item.updated_at = item.reviewed_at;
  if (approve) item.expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
  audit(state, approve ? 'INFO_APPROVE' : 'INFO_REJECT', id, reason.trim() || '审核通过', 'demo_admin');
  writeMockState(state);
}

export async function adminOpenReports(): Promise<InfoReport[]> {
  if (!USE_MOCK) return (await cloudInfo('adminReports')).list || [];
  requireMock(); requireDemoAdmin();
  return readCurrentState().infoReports.filter(item => item.status === 'OPEN');
}

export async function adminHandleReport(id: string, offline: boolean, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudInfo('adminHandleReport', { id, offline, reason }); return; }
  requireMock(); requireDemoAdmin();
  if (reason.trim().length < 3) throw new Error('请填写处理理由');
  const state = readCurrentState();
  const report = state.infoReports.find(item => item._id === id && item.status === 'OPEN');
  if (!report) throw new Error('举报已处理或不存在');
  report.status = 'RESOLVED';
  report.resolution = offline ? 'OFFLINED' : 'DISMISSED';
  report.resolution_reason = reason.trim();
  report.resolved_at = new Date().toISOString();
  if (offline) {
    const item = state.infos.find(info => info._id === report.info_id);
    if (item) {
      item.status = 'OFFLINE';
      item.offline_reason = reason.trim();
      item.updated_at = report.resolved_at;
    }
  }
  audit(state, offline ? 'REPORT_OFFLINE' : 'REPORT_DISMISS', report.info_id, reason.trim(), 'demo_admin');
  writeMockState(state);
}

export async function adminAuditLogs() {
  if (!USE_MOCK) return (await cloudInfo('adminAudit')).list || [];
  requireMock(); requireDemoAdmin();
  return readCurrentState().infoAuditLogs;
}
