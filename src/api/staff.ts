import { USE_MOCK, callCloudFunction } from './adapter';
import { readMockState, writeMockState, nextMockId } from './mockState';
import { useUserStore } from '@/store/user';
import type { MerchantStaff, StaffInvite } from '@/types/merchant';

async function cloudStaff(action: string, payload: Record<string, unknown> = {}) {
  const result = await callCloudFunction<any>('staffManage', { action, ...payload });
  if (!result.success) throw new Error(result.message || '员工服务暂不可用');
  return result;
}
const userId = () => useUserStore().profile?._id || 'u_guest_demo';

export async function createStaffInvite(merchantId: string, canVerify: boolean, canAppointment: boolean): Promise<StaffInvite> {
  if (!USE_MOCK) {
    const result = await cloudStaff('createInvite', { merchantId, canVerify, canAppointment });
    return { token: result.invite.token, merchant_id: merchantId, can_verify: canVerify, can_handle_appointment: canAppointment, status: 'ACTIVE', expires_at: result.invite.expires_at };
  }
  const state = readMockState();
  if (!state.merchants.some(item => item._id === merchantId && item.owner_id === userId() && item.status === 'APPROVED')) throw new Error('只有已审核店主可邀请员工');
  if (!canVerify && !canAppointment) throw new Error('至少选择一项权限');
  const invite: StaffInvite = { token: `si_demo_${state.nextId}`, merchant_id: merchantId, can_verify: canVerify, can_handle_appointment: canAppointment, status: 'ACTIVE', expires_at: new Date(Date.now() + 86400000).toISOString() };
  state.nextId += 1;
  state.staffInvites.push(invite);
  writeMockState(state);
  return invite;
}

export async function acceptStaffInvite(token: string): Promise<MerchantStaff> {
  if (!USE_MOCK) return (await cloudStaff('acceptInvite', { token })).staff;
  const state = readMockState();
  const invite = state.staffInvites.find(item => item.token === token && item.status === 'ACTIVE' && new Date(item.expires_at).getTime() > Date.now());
  if (!invite) throw new Error('邀请不存在或已失效');
  const merchant = state.merchants.find(item => item._id === invite.merchant_id && item.status === 'APPROVED');
  if (!merchant) throw new Error('门店不可用');
  if (merchant.owner_id === userId()) throw new Error('店主无需接受员工邀请；需由另一微信身份接受');
  const staff: MerchantStaff = { _id: nextMockId(state, 'staff'), merchant_id: merchant._id, user_id: userId(), role: 'STAFF', status: 'ACTIVE', can_verify: invite.can_verify, can_handle_appointment: invite.can_handle_appointment };
  state.merchantStaff.push(staff);
  invite.status = 'USED';
  writeMockState(state);
  return staff;
}

export async function listStaff(merchantId: string): Promise<MerchantStaff[]> {
  if (!USE_MOCK) return (await cloudStaff('list', { merchantId })).list || [];
  const state = readMockState();
  if (!state.merchants.some(item => item._id === merchantId && item.owner_id === userId())) throw new Error('无权查看员工');
  return state.merchantStaff.filter(item => item.merchant_id === merchantId);
}

export async function disableStaff(merchantId: string, staffId: string): Promise<void> {
  if (!USE_MOCK) { await cloudStaff('disable', { merchantId, staffId }); return; }
  const state = readMockState();
  if (!state.merchants.some(item => item._id === merchantId && item.owner_id === userId())) throw new Error('只有店主可停用员工');
  const staff = state.merchantStaff.find(item => item._id === staffId && item.merchant_id === merchantId && item.role !== 'OWNER' && item.status === 'ACTIVE');
  if (!staff) throw new Error('员工不可停用');
  staff.status = 'DISABLED';
  writeMockState(state);
}

export async function myStaffBindings(): Promise<MerchantStaff[]> {
  if (!USE_MOCK) return (await cloudStaff('myStaff')).list || [];
  return readMockState().merchantStaff.filter(item => item.user_id === userId() && item.status === 'ACTIVE');
}
