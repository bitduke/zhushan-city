const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');
const defaults = require('./base.json');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
const uuid = () => crypto.randomUUID().replace(/-/g, '');
class BusinessError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, message) => { throw new BusinessError(code, message); };
async function configured(section) {
  const result = await db.collection('app_config').doc(section).get();
  return result.data?.items || defaults[section];
}
async function validated(input = {}) {
  const name = String(input.name || '').trim();
  const town = String(input.town || '').trim();
  const address = String(input.address || '').trim();
  const phone = String(input.contact_phone || '').trim();
  const hours = String(input.business_hours || '').trim();
  const note = String(input.qualification_note || '').trim();
  const categoryId = String(input.category_id || '');
  const dailyLimit = Number(input.daily_booking_limit || 0);
  const images = input.qualification_images || [];
  const [categories, towns] = await Promise.all([configured('merchantCategories'), configured('towns')]);
  const category = categories.find(item => item.id === categoryId && item.active);
  if (name.length < 2 || name.length > 40 || !category || !towns.some(item => item.name === town && item.active) || address.length < 6 || !/^1[3-9]\d{9}$/.test(phone) || hours.length < 5 || note.length < 8) fail('INVALID_FORM', '请补全真实店名、有效品类与乡镇、地址、电话、营业时间和资质说明');
  if (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 100) fail('INVALID_CAPACITY', '每日接待上限须为 0–100');
  if (!Array.isArray(images) || images.length > 9 || images.some(item => typeof item !== 'string' || !item.startsWith('cloud://'))) fail('INVALID_IMAGES', '资质图片须先上传云存储，最多 9 张');
  return { name, category_id: categoryId, category_name: category.name, town, address, contact_phone: phone, business_hours: hours, daily_booking_limit: dailyLimit, qualification_note: note, qualification_images: images };
}

async function admin(reader, openid) {
  const user = (await reader.collection('user').doc(`user_${hash(openid)}`).get()).data;
  if (!user || user.status !== 'ACTIVE' || user.role !== 'ADMIN') fail('FORBIDDEN', '无管理员权限');
}

function publicMerchant(item) {
  const { owner_openid, owner_id, openid_hash, search_text, ...safe } = item;
  return safe;
}
async function withQualificationUrls(application) {
  const files = (Array.isArray(application.qualification_images) ? application.qualification_images : []).filter(fileID => typeof fileID === 'string' && fileID.startsWith('cloud://')).slice(0, 9);
  if (!files.length) return { ...application, qualification_image_urls: [] };
  try {
    const result = await cloud.getTempFileURL({ fileList: files });
    const urls = new Map((result.fileList || []).filter(file => file.status === 0 && file.tempFileURL).map(file => [file.fileID, file.tempFileURL]));
    return { ...application, qualification_image_urls: files.map(fileID => urls.get(fileID)).filter(Boolean) };
  } catch (error) {
    console.error('[merchantManage] qualification link failed', { message: error.message });
    return { ...application, qualification_image_urls: [] };
  }
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { success: false, code: 'UNAUTHENTICATED', message: '无法确认微信身份' };
  const action = event.action;
  try {
    if (!['list', 'detail'].includes(action) && (await db.collection('user').doc(`user_${hash(openid)}`).get()).data?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    if (action === 'list') {
      const page = Math.max(1, Math.floor(Number(event.page) || 1));
      const pageSize = Math.max(1, Math.min(30, Math.floor(Number(event.pageSize) || 10)));
      const query = { status: 'APPROVED' };
      if (event.categoryId && event.categoryId !== 'all') query.category_id = String(event.categoryId);
      if (event.town && event.town !== '全竹山') query.town = String(event.town);
      const keyword = String(event.keyword || '').trim().slice(0, 30);
      if (keyword) query.search_text = db.RegExp({ regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options: 'i' });
      const collection = db.collection('merchant');
      const [count, response] = await Promise.all([
        collection.where(query).count(),
        collection.where(query).orderBy('name', 'asc').skip((page - 1) * pageSize).limit(pageSize).get()
      ]);
      const total = count.total || 0;
      return { success: true, list: (response.data || []).map(publicMerchant), page, pageSize, total, hasMore: page * pageSize < total };
    }
    if (action === 'detail') {
      const item = (await db.collection('merchant').doc(String(event.id || '')).get()).data;
      return { success: true, merchant: item && item.status === 'APPROVED' ? publicMerchant(item) : null };
    }
    if (action === 'mine') {
      const [applications, merchants] = await Promise.all([
        db.collection('merchant_application').where({ applicant_user_id: hash(openid) }).orderBy('created_at', 'desc').limit(100).get(),
        db.collection('merchant').where({ owner_id: hash(openid) }).limit(100).get()
      ]);
      return { success: true, applications: (applications.data || []).map(item => { const { applicant_openid, ...safe } = item; return safe; }), merchants: merchants.data || [] };
    }
    if (action === 'apply') {
      const clean = await validated(event.data);
      const markerId = `app_open_${hash(`${openid}:${clean.name}`)}`;
      const application = await db.runTransaction(async transaction => {
        const marker = (await transaction.collection('merchant_application_open').doc(markerId).get()).data;
        if (marker && marker.status === 'PENDING') fail('ALREADY_PENDING', '该店已有待审核申请');
        const id = `merchant_app_${uuid()}`;
        const item = { _id: id, applicant_user_id: hash(openid), applicant_openid: openid, ...clean, status: 'PENDING', created_at: new Date().toISOString() };
        await transaction.collection('merchant_application').doc(id).set({ data: item });
        await transaction.collection('merchant_application_open').doc(markerId).set({ data: { application_id: id, status: 'PENDING' } });
        return item;
      });
      const { applicant_openid, ...safe } = application;
      return { success: true, application: safe };
    }
    if (action === 'update') {
      const clean = await validated(event.data);
      const merchantId = String(event.id || '');
      const application = await db.runTransaction(async transaction => {
        const merchant = (await transaction.collection('merchant').doc(merchantId).get()).data;
        if (!merchant || merchant.owner_openid !== openid || merchant.status !== 'APPROVED') fail('FORBIDDEN', '无权变更该店');
        const markerId = `app_change_${hash(merchantId)}`;
        const marker = (await transaction.collection('merchant_application_open').doc(markerId).get()).data;
        if (marker && marker.status === 'PENDING') fail('ALREADY_PENDING', '已有待审变更');
        const id = `merchant_app_${uuid()}`;
        const item = { _id: id, merchant_id: merchantId, applicant_user_id: hash(openid), applicant_openid: openid, ...clean, status: 'PENDING', created_at: new Date().toISOString() };
        await transaction.collection('merchant_application').doc(id).set({ data: item });
        await transaction.collection('merchant').doc(merchantId).update({ data: { status: 'PENDING' } });
        await transaction.collection('merchant_application_open').doc(markerId).set({ data: { application_id: id, status: 'PENDING' } });
        return item;
      });
      const { applicant_openid, ...safe } = application;
      return { success: true, application: safe };
    }
    if (action === 'adminPending' || action === 'adminAll' || action === 'adminAudit') {
      await admin(db, openid);
      if (action === 'adminPending') {
        const response = await db.collection('merchant_application').where({ status: 'PENDING' }).limit(100).get();
        return { success: true, list: await Promise.all((response.data || []).map(withQualificationUrls)) };
      }
      if (action === 'adminAll') return { success: true, list: (await db.collection('merchant').limit(100).get()).data || [] };
      return { success: true, list: (await db.collection('audit_log').where({ target_type: 'MERCHANT' }).orderBy('created_at', 'desc').limit(100).get()).data || [] };
    }
    if (action === 'adminReview') {
      const id = String(event.id || '');
      const approve = event.approve === true;
      const reason = String(event.reason || '').trim();
      if (!approve && reason.length < 3) fail('INVALID_REASON', '拒绝时须填写原因');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const application = (await transaction.collection('merchant_application').doc(id).get()).data;
        if (!application || application.status !== 'PENDING') fail('INVALID_STATUS', '申请已处理');
        if (approve) {
          const categories = (await transaction.collection('app_config').doc('merchantCategories').get()).data?.items || defaults.merchantCategories;
          const towns = (await transaction.collection('app_config').doc('towns').get()).data?.items || defaults.towns;
          if (!categories.some(category => category.id === application.category_id && category.active) || !towns.some(town => town.name === application.town && town.active)) fail('CONFIG_INACTIVE', '品类或乡镇已停用，不能审核公开');
        }
        let merchantId = application.merchant_id;
        if (merchantId) {
          const current = (await transaction.collection('merchant').doc(merchantId).get()).data;
          if (!current || current.owner_id !== application.applicant_user_id) fail('MERCHANT_MISSING', '原店铺不存在');
          if (approve) await transaction.collection('merchant').doc(merchantId).update({ data: {
            name: application.name, category_id: application.category_id, category_name: application.category_name,
            town: application.town, address: application.address, phone: application.contact_phone,
            business_hours: application.business_hours, daily_booking_limit: application.daily_booking_limit,
            search_text: `${application.name} ${application.category_name} ${application.town} ${current.description || ''}`.toLocaleLowerCase(), status: 'APPROVED'
          } });
          else await transaction.collection('merchant').doc(merchantId).update({ data: { status: 'APPROVED' } });
        } else if (approve) {
          merchantId = `shop_${uuid()}`;
          const token = `m${crypto.randomBytes(8).toString('hex')}`;
          await transaction.collection('merchant').doc(merchantId).set({ data: {
            _id: merchantId, owner_id: application.applicant_user_id, owner_openid: application.applicant_openid,
            name: application.name, category_id: application.category_id, category_name: application.category_name,
            town: application.town, address: application.address, phone: application.contact_phone,
            business_hours: application.business_hours, daily_booking_limit: application.daily_booking_limit,
            avatar: '', images: [], description: '', search_text: `${application.name} ${application.category_name} ${application.town}`.toLocaleLowerCase(),
            status: 'APPROVED', qrcode_token: token, created_at: new Date().toISOString()
          } });
          await transaction.collection('merchant_staff').doc(`staff_${hash(`${merchantId}:${application.applicant_openid}`)}`).set({ data: {
            merchant_id: merchantId, user_id: application.applicant_user_id, role: 'OWNER', status: 'ACTIVE', can_verify: true, can_handle_appointment: true
          } });
          await transaction.collection('scan_token').doc(token).set({ data: { type: 'MERCHANT', target_id: merchantId, status: 'ACTIVE', created_at: new Date().toISOString() } });
        }
        await transaction.collection('merchant_application').doc(id).update({ data: { merchant_id: merchantId || '', status: approve ? 'APPROVED' : 'REJECTED', review_reason: reason, reviewed_at: new Date().toISOString() } });
        const markerId = application.merchant_id ? `app_change_${hash(application.merchant_id)}` : `app_open_${hash(`${application.applicant_openid}:${application.name}`)}`;
        await transaction.collection('merchant_application_open').doc(markerId).set({ data: { application_id: id, status: 'CLOSED' } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'MERCHANT', target_id: merchantId || id, actor_id: hash(openid), action: approve ? 'MERCHANT_APPROVE' : 'MERCHANT_REJECT', reason: reason || '审核通过', created_at: new Date().toISOString() } });
      });
      return { success: true };
    }
    if (action === 'adminSuspend') {
      const id = String(event.id || '');
      const reason = String(event.reason || '').trim();
      if (reason.length < 3) fail('INVALID_REASON', '请填写停用原因');
      await db.runTransaction(async transaction => {
        await admin(transaction, openid);
        const merchant = (await transaction.collection('merchant').doc(id).get()).data;
        if (!merchant || merchant.status !== 'APPROVED') fail('INVALID_STATUS', '店铺不可停用');
        await transaction.collection('merchant').doc(id).update({ data: { status: 'SUSPENDED' } });
        if (merchant.qrcode_token) await transaction.collection('scan_token').doc(merchant.qrcode_token).update({ data: { status: 'PAUSED' } });
        await transaction.collection('audit_log').doc(`audit_${uuid()}`).set({ data: { target_type: 'MERCHANT', target_id: id, actor_id: hash(openid), action: 'MERCHANT_SUSPEND', reason, created_at: new Date().toISOString() } });
      });
      return { success: true };
    }
    fail('INVALID_ACTION', '操作无效');
  } catch (error) {
    if (error instanceof BusinessError) return { success: false, code: error.code, message: error.message };
    console.error('[merchantManage] failed', { message: error.message });
    return { success: false, code: 'MERCHANT_FAILED', message: '商家服务暂不可用' };
  }
};
