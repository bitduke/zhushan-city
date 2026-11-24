import { USE_MOCK, callCloudFunction } from './adapter';
import { nextMockId, readMockState, writeMockState, type MockCoreState } from './mockState';
import { useUserStore } from '@/store/user';
import type { Merchant, MerchantApplication } from '@/types/merchant';
import { myStaffBindings } from './staff';

export interface MerchantApplicationInput {
  name: string;
  category_id: string;
  town: string;
  address: string;
  contact_phone: string;
  business_hours: string;
  daily_booking_limit: string;
  qualification_note: string;
  qualification_images: string[];
}

function requireMock(): void {
  if (!USE_MOCK) throw new Error('模拟数据操作仅在本地模式可用');
}

async function cloudMerchant(action: string, payload: Record<string, unknown> = {}) {
  const result = await callCloudFunction<any>('merchantManage', { action, ...payload });
  if (!result.success) throw new Error(result.message || '商家服务暂不可用');
  return result;
}

function currentUserId(): string {
  return useUserStore().profile?._id || 'u_guest_demo';
}

function requireDemoAdmin(): void {
  if (!useUserStore().isDemoAdmin) throw new Error('只有管理员演示身份可操作');
}

function validatedInput(input: Partial<MerchantApplicationInput>) {
  const config = readMockState().config;
  const category = config.merchantCategories.find(item => item.id === input.category_id && item.active);
  if (!category) throw new Error('请选择有效商家品类');
  if (!config.towns.some(item => item.name === input.town && item.active)) throw new Error('请选择有效乡镇');
  const name = (input.name || '').trim();
  const address = (input.address || '').trim();
  const phone = (input.contact_phone || '').trim();
  const hours = (input.business_hours || '').trim();
  const dailyLimit = Number(input.daily_booking_limit || 0);
  const note = (input.qualification_note || '').trim();
  if (name.length < 2 || name.length > 40) throw new Error('店名须为 2–40 字');
  if (address.length < 6) throw new Error('请填写详细门店地址');
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请填写有效的 11 位联系电话');
  if (hours.length < 5) throw new Error('请填写营业时间');
  if (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 100) throw new Error('每日接待上限须为 0–100');
  if (note.length < 8) throw new Error('请填写至少 8 字的资质说明');
  const images = input.qualification_images || [];
  if (!Array.isArray(images) || images.length > 9) throw new Error('资质图片最多 9 张');
  return { name, category_id: category.id, category_name: category.name, town: input.town!, address, contact_phone: phone, business_hours: hours, daily_booking_limit: dailyLimit, qualification_note: note, qualification_images: images };
}

function audit(state: MockCoreState, action: string, targetId: string, reason: string, actorId = currentUserId()): void {
  state.merchantAuditLogs.unshift({ _id: nextMockId(state, 'merchant_audit'), actor_id: actorId, action, target_id: targetId, reason, created_at: new Date().toISOString() });
}

export async function applyMerchant(input: MerchantApplicationInput): Promise<MerchantApplication> {
  if (!USE_MOCK) return (await cloudMerchant('apply', { data: input })).application;
  requireMock();
  const clean = validatedInput(input);
  const state = readMockState();
  if (state.merchantApplications.some(item => item.applicant_user_id === currentUserId() && item.name === clean.name && item.status === 'PENDING')) throw new Error('该店已有待审核申请');
  const application: MerchantApplication = { _id: nextMockId(state, 'merchant_app'), applicant_user_id: currentUserId(), ...clean, status: 'PENDING', created_at: new Date().toISOString() };
  state.merchantApplications.push(application);
  audit(state, 'MERCHANT_APPLY', application._id, '提交商家入驻申请');
  writeMockState(state);
  return application;
}

export async function getMyMerchantApplications(): Promise<MerchantApplication[]> {
  if (!USE_MOCK) return (await cloudMerchant('mine')).applications || [];
  requireMock();
  return readMockState().merchantApplications.filter(item => item.applicant_user_id === currentUserId()).reverse();
}

export async function getMyMerchants(): Promise<Merchant[]> {
  if (!USE_MOCK) {
    const owned = ((await cloudMerchant('mine')).merchants || []).map((item: Merchant) => ({ ...item, access_role: 'OWNER' as const, can_verify: true, can_handle_appointment: true }));
    const bindings = await myStaffBindings();
    const staffed = await Promise.all(bindings.map(async (binding): Promise<Merchant | null> => {
      const merchant = (await cloudMerchant('detail', { id: binding.merchant_id })).merchant as Merchant | null;
      return merchant ? { ...merchant, access_role: binding.role, can_verify: binding.can_verify, can_handle_appointment: binding.can_handle_appointment } : null;
    }));
    return [...owned, ...staffed.filter((item): item is Merchant => !!item && !owned.some((own: Merchant) => own._id === item._id))];
  }
  requireMock();
  return readMockState().merchants.filter(item => item.owner_id === currentUserId()).map(item => ({ ...item, access_role: 'OWNER', can_verify: true, can_handle_appointment: true }));
}

export async function getPublicMerchants(params: { categoryId?: string; town?: string; keyword?: string; page?: number; pageSize?: number } = {}) {
  if (!USE_MOCK) return cloudMerchant('list', params);
  requireMock();
  const state = readMockState();
  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.max(1, Math.min(30, Math.floor(params.pageSize || 10)));
  const keyword = (params.keyword || '').trim().toLocaleLowerCase();
  const list = state.merchants.filter(item => item.status === 'APPROVED'
    && (!params.categoryId || params.categoryId === 'all' || item.category_id === params.categoryId)
    && (!params.town || params.town === '全竹山' || item.town === params.town)
    && (!keyword || `${item.category_name} ${item.town} ${item.name} ${item.description}`.toLocaleLowerCase().includes(keyword))
  ).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  const start = (page - 1) * pageSize;
  return { list: list.slice(start, start + pageSize), page, pageSize, total: list.length, hasMore: start + pageSize < list.length };
}

export async function getPublicMerchantDetail(id: string): Promise<Merchant | null> {
  if (!USE_MOCK) return (await cloudMerchant('detail', { id })).merchant || null;
  requireMock();
  return readMockState().merchants.find(item => item._id === id && item.status === 'APPROVED') || null;
}

export async function updateMerchant(id: string, input: MerchantApplicationInput): Promise<MerchantApplication> {
  if (!USE_MOCK) return (await cloudMerchant('update', { id, data: input })).application;
  requireMock();
  const clean = validatedInput(input);
  const state = readMockState();
  const merchant = state.merchants.find(item => item._id === id && item.owner_id === currentUserId() && item.status === 'APPROVED');
  if (!merchant) throw new Error('店铺不存在、未获批准或无权编辑');
  if (state.merchantApplications.some(item => item.merchant_id === id && item.status === 'PENDING')) throw new Error('该店已有待审变更');
  const application: MerchantApplication = { _id: nextMockId(state, 'merchant_app'), merchant_id: id, applicant_user_id: currentUserId(), ...clean, status: 'PENDING', created_at: new Date().toISOString() };
  state.merchantApplications.push(application);
  merchant.status = 'PENDING';
  audit(state, 'MERCHANT_UPDATE_REQUEST', id, '可信资料变更待审，公开页暂时隐藏');
  writeMockState(state);
  return application;
}

export async function adminPendingMerchantApplications(): Promise<MerchantApplication[]> {
  if (!USE_MOCK) return (await cloudMerchant('adminPending')).list || [];
  requireMock(); requireDemoAdmin();
  return readMockState().merchantApplications.filter(item => item.status === 'PENDING');
}

export async function adminAllMerchants(): Promise<Merchant[]> {
  if (!USE_MOCK) return (await cloudMerchant('adminAll')).list || [];
  requireMock(); requireDemoAdmin();
  return readMockState().merchants;
}

export async function adminReviewMerchantApplication(id: string, approve: boolean, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudMerchant('adminReview', { id, approve, reason }); return; }
  requireMock(); requireDemoAdmin();
  if (!approve && reason.trim().length < 3) throw new Error('拒绝时请填写原因');
  const state = readMockState();
  const application = state.merchantApplications.find(item => item._id === id && item.status === 'PENDING');
  if (!application) throw new Error('申请已变化或不在待审队列');
  if (approve && (!state.config.merchantCategories.some(category => category.id === application.category_id && category.active) || !state.config.towns.some(town => town.name === application.town && town.active))) throw new Error('品类或乡镇已停用，不能审核公开');
  const existing = application.merchant_id ? state.merchants.find(item => item._id === application.merchant_id) : null;
  if (approve) {
    if (existing) {
      Object.assign(existing, { name: application.name, category_id: application.category_id, category_name: application.category_name, town: application.town, address: application.address, phone: application.contact_phone, business_hours: application.business_hours, daily_booking_limit: application.daily_booking_limit || 0, status: 'APPROVED' });
    } else {
      const merchantId = nextMockId(state, 'shop');
      const merchant: Merchant = { _id: merchantId, owner_id: application.applicant_user_id, name: application.name, category_id: application.category_id, category_name: application.category_name, town: application.town, address: application.address, phone: application.contact_phone, business_hours: application.business_hours, daily_booking_limit: application.daily_booking_limit || 0, avatar: '', images: [], description: application.qualification_note, status: 'APPROVED', qrcode_token: `m${state.nextId}`, created_at: new Date().toISOString() };
      state.merchants.push(merchant);
      application.merchant_id = merchantId;
      state.merchantStaff.push({ merchant_id: merchantId, user_id: application.applicant_user_id, role: 'OWNER', status: 'ACTIVE', can_verify: true, can_handle_appointment: true });
    }
  } else if (existing) {
    existing.status = 'APPROVED';
  }
  application.status = approve ? 'APPROVED' : 'REJECTED';
  application.review_reason = reason.trim();
  application.reviewed_at = new Date().toISOString();
  audit(state, approve ? 'MERCHANT_APPROVE' : 'MERCHANT_REJECT', application.merchant_id || id, reason.trim() || '审核通过', 'demo_admin');
  writeMockState(state);
}

export async function adminSuspendMerchant(id: string, reason: string): Promise<void> {
  if (!USE_MOCK) { await cloudMerchant('adminSuspend', { id, reason }); return; }
  requireMock(); requireDemoAdmin();
  if (reason.trim().length < 3) throw new Error('请填写停用原因');
  const state = readMockState();
  const merchant = state.merchants.find(item => item._id === id && item.status === 'APPROVED');
  if (!merchant) throw new Error('商家不存在或不可停用');
  merchant.status = 'SUSPENDED';
  audit(state, 'MERCHANT_SUSPEND', id, reason.trim(), 'demo_admin');
  writeMockState(state);
}

export async function adminMerchantAuditLogs() {
  if (!USE_MOCK) return (await cloudMerchant('adminAudit')).list || [];
  requireMock(); requireDemoAdmin();
  return readMockState().merchantAuditLogs;
}
