const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');
const defaults = require('./base.json');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const _ = db.command;
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const uuid = () => crypto.randomUUID().replace(/-/g, '');
class BusinessError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new BusinessError(code, message); };

async function admin(reader, openid) {
  const user = (await reader.collection('user').doc(`user_${hash(openid)}`).get()).data;
  if (!user || user.status !== 'ACTIVE' || user.role !== 'ADMIN') fail('FORBIDDEN', '无管理员权限');
}
function publicInfo(item) {
  const { openid, search_text, ...safe } = item;
  return { ...safe, contact_phone: item.contact_consent ? item.contact_phone : '' };
}
async function publicInfoWithImages(item) {
  const safe = publicInfo(item);
  const files = (Array.isArray(item.images) ? item.images : []).filter(fileID => typeof fileID === 'string' && fileID.startsWith('cloud://')).slice(0, 9);
  if (!files.length) return { ...safe, images: [] };
  try {
    const result = await cloud.getTempFileURL({ fileList: files });
    const urls = new Map((result.fileList || []).filter(file => file.status === 0 && file.tempFileURL).map(file => [file.fileID, file.tempFileURL]));
    return { ...safe, images: files.map(fileID => urls.get(fileID)).filter(Boolean) };
  } catch (error) {
    console.error('[infoManage] public image link failed', { message: error.message });
    return { ...safe, images: [] };
  }
}
async function configured(section) {
  const result = await db.collection('app_config').doc(section).get();
  return result.data?.items || defaults[section];
}
async function validate(input = {}) {
  const categoryId = String(input.category_id || '');
  const town = String(input.town || '').trim();
  const title = String(input.title || '').trim();
  const content = String(input.content || '').trim();
  const phone = String(input.contact_phone || '').trim();
  const priceDesc = String(input.price_desc || '').trim();
  const images = input.images || [];
  const [categories, towns] = await Promise.all([configured('infoCategories'), configured('towns')]);
  const category = categories.find(item => item.id === categoryId && item.active);
  if (!category || !towns.some(item => item.name === town && item.active) || title.length < 4 || title.length > 30 || content.length < 10 || !/^1[3-9]\d{9}$/.test(phone) || input.contact_consent !== true) fail('INVALID_FORM', '请补全有效分类、地区、标题、描述、电话与公开同意');
  if (!Array.isArray(images) || images.length > 9 || images.some(item => typeof item !== 'string' || !item.startsWith('cloud://'))) fail('INVALID_IMAGES', '图片须先上传云存储，最多 9 张');
  return { category_id: categoryId, category_name: category.name, town, title, content, contact_phone: phone, contact_consent: true, contact_consent_at: new Date().toISOString(), price_desc: priceDesc, images, search_text: `${category.name} ${town} ${title} ${content}`.toLocaleLowerCase() };
}
const audit = (transaction, openid, action, targetId, reason) => transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'INFO', actor_id: hash(openid), action, target_id: targetId, reason, created_at: new Date().toISOString() } });

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const action = event.action;
  try {
    if (!['list', 'detail'].includes(action) && (await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    if (action === 'list') {
      const page = Math.max(1, Math.floor(Number(event.page) || 1));
      const pageSize = Math.max(1, Math.min(30, Math.floor(Number(event.pageSize) || 10)));
      const query = { status: 'APPROVED', expires_at: _.gt(new Date().toISOString()) };
      if (event.categoryId && event.categoryId !== 'all') query.category_id = String(event.categoryId);
      if (event.town && event.town !== '全竹山') query.town = String(event.town);
      const keyword = String(event.keyword || '').trim().slice(0, 30);
      if (keyword) query.search_text = db.RegExp({ regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' });
      const collection = db.collection('info');
      const [count, response] = await Promise.all([
        collection.where(query).count(),
        collection.where(query).orderBy('created_at', 'desc').skip((page - 1) * pageSize).limit(pageSize).get()
      ]);
      const total = count.total || 0;
      return { success: true, list: await Promise.all((response.data || []).map(publicInfoWithImages)), page, pageSize, total, hasMore: page * pageSize < total };
    }
    if (action === 'detail') {
      const item = (await db.collection('info').doc(String(event.id || '')).get()).data;
      const visible = item && ((item.status === 'APPROVED' && new Date(item.expires_at).getTime() > Date.now()) || item.user_id === hash(openid));
      return { success: true, item: visible ? (item.user_id === hash(openid) ? item : await publicInfoWithImages(item)) : null };
    }
    if (action === 'mine') {
      const response = await db.collection('info').where({ user_id: hash(openid) }).orderBy('created_at', 'desc').limit(100).get();
      return { success: true, list: response.data || [] };
    }
    if (action === 'create') {
      const clean = await validate(event.data);
      const id = `info_${uuid()}`;
      const now = new Date().toISOString();
      const item = { _id: id, user_id: hash(openid), author_name: String(event.authorName || '竹山居民').slice(0, 20), ...clean, status: 'PENDING', view_count: 0, created_at: now, updated_at: now, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() };
      await db.runTransaction(async transaction => {
        await transaction.collection('info').doc(id).set({ data: item });
        await audit(transaction, openid, 'INFO_SUBMIT', id, '发布待审');
      });
      return { success: true, item };
    }
    if (action === 'update' || action === 'offline' || action === 'renew') {
      const id = String(event.id || '');
      const clean = action === 'update' ? await validate(event.data) : null;
      const item = await db.runTransaction(async transaction => {
        const existing = (await transaction.collection('info').doc(id).get()).data;
        if (!existing || existing.user_id !== hash(openid)) fail('FORBIDDEN', '无权操作该信息');
        const patch = { updated_at: new Date().toISOString() };
        if (action === 'update') {
          if (existing.status === 'OFFLINE') fail('INVALID_STATUS', '已下架信息请先申请续期');
          Object.assign(patch, clean, { status: 'PENDING', review_reason: '' });
        } else if (action === 'offline') patch.status = 'OFFLINE';
        else {
          if (!['EXPIRED', 'OFFLINE', 'REJECTED'].includes(existing.status)) fail('INVALID_STATUS', '当前状态无需续期');
          patch.status = 'PENDING'; patch.expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
        }
        await transaction.collection('info').doc(id).update({ data: patch });
        await audit(transaction, openid, `INFO_${action.toUpperCase()}`, id, action === 'update' ? '编辑后重新审核并暂时下架' : action === 'offline' ? '发布者下架' : '申请续期重审');
        return { ...existing, ...patch };
      });
      return { success: true, item };
    }
    if (action === 'report') {
      const id = String(event.id || '');
      const reason = String(event.reason || '').trim();
      if (reason.length < 3) fail('INVALID_REASON', '请填写举报原因');
      const markerId = `report_open_${hash(`${openid}:${id}`)}`;
      const report = await db.runTransaction(async transaction => {
        const info = (await transaction.collection('info').doc(id).get()).data;
        if (!info || info.status !== 'APPROVED' || new Date(info.expires_at).getTime() <= Date.now()) fail('INFO_INACTIVE', '信息不可举报');
        const marker = (await transaction.collection('report_open').doc(markerId).get()).data;
        if (marker && marker.status === 'OPEN') fail('ALREADY_REPORTED', '你已有待处理举报');
        const reportId = `report_${uuid()}`;
        const item = { _id: reportId, info_id: id, reporter_user_id: hash(openid), marker_id: markerId, reason, status: 'OPEN', created_at: new Date().toISOString() };
        await transaction.collection('report').doc(reportId).set({ data: item });
        await transaction.collection('report_open').doc(markerId).set({ data: { report_id: reportId, status: 'OPEN' } });
        return item;
      });
      return { success: true, report };
    }
    if (['adminPending', 'adminAll', 'adminReports', 'adminAudit'].includes(action)) {
      await admin(db, openid);
      const collection = action === 'adminReports' ? 'report' : action === 'adminAudit' ? 'audit_log' : 'info';
      const query = action === 'adminPending' ? { status: 'PENDING' } : action === 'adminReports' ? { status: 'OPEN' } : action === 'adminAudit' ? { target_type: 'INFO' } : {};
      const response = await db.collection(collection).where(query).orderBy('created_at', 'desc').limit(100).get();
      return { success: true, list: response.data || [] };
    }
    if (action === 'adminReview') {
      const id = String(event.id || '');
      const approve = event.approve === true;
      const reason = String(event.reason || '').trim();
      if (!approve && reason.length < 3) fail('INVALID_REASON', '拒绝时须填写原因');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const item = (await transaction.collection('info').doc(id).get()).data;
        if (!item || item.status !== 'PENDING') fail('INVALID_STATUS', '信息已不在待审队列');
        if (approve) {
          const categories = (await transaction.collection('app_config').doc('infoCategories').get()).data?.items || defaults.infoCategories;
          const towns = (await transaction.collection('app_config').doc('towns').get()).data?.items || defaults.towns;
          if (!categories.some(category => category.id === item.category_id && category.active) || !towns.some(town => town.name === item.town && town.active)) fail('CONFIG_INACTIVE', '分类或乡镇已停用，不能审核公开');
        }
        const now = new Date().toISOString();
        await transaction.collection('info').doc(id).update({ data: {
          status: approve ? 'APPROVED' : 'REJECTED', review_reason: reason,
          reviewed_by: hash(openid), reviewed_at: now, updated_at: now,
          ...(approve ? { expires_at: new Date(Date.now() + 30 * 86400000).toISOString() } : {})
        } });
        await audit(transaction, openid, approve ? 'INFO_APPROVE' : 'INFO_REJECT', id, reason || '审核通过');
      });
      return { success: true };
    }
    if (action === 'adminHandleReport') {
      const id = String(event.id || '');
      const offline = event.offline === true;
      const reason = String(event.reason || '').trim();
      if (reason.length < 3) fail('INVALID_REASON', '请填写处理理由');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const report = (await transaction.collection('report').doc(id).get()).data;
        if (!report || report.status !== 'OPEN') fail('INVALID_STATUS', '举报已处理');
        const now = new Date().toISOString();
        await transaction.collection('report').doc(id).update({ data: { status: 'RESOLVED', resolution: offline ? 'OFFLINED' : 'DISMISSED', resolution_reason: reason, resolved_at: now } });
        if (offline) {
          const info = (await transaction.collection('info').doc(report.info_id).get()).data;
          if (info) await transaction.collection('info').doc(report.info_id).update({ data: { status: 'OFFLINE', offline_reason: reason, updated_at: now } });
        }
        await transaction.collection('report_open').doc(report.marker_id).set({ data: { report_id: id, status: 'CLOSED' } });
        await audit(transaction, openid, offline ? 'REPORT_OFFLINE' : 'REPORT_DISMISS', report.info_id, reason);
      });
      return { success: true };
    }
    fail('INVALID_ACTION', '操作无效');
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[infoManage] failed', { message: error.message });
    return { success: false, code: 'INFO_FAILED', message: '便民信息服务暂不可用' };
  }
};
