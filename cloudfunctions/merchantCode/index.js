const cloud = require('wx-server-sdk');
const crypto = require('node:crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = require('./pgCompat')(cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV, throwOnNotFound: false }));
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  const merchantId = String(event.merchantId || '');
  if (!openid || !/^[A-Za-z0-9_-]{1,96}$/.test(merchantId)) return { success: false, code: 'INVALID_INPUT', message: '门店参数无效' };
  try {
    const user = (await db.collection('user').doc(`user_${hash(openid)}`).get()).data;
    if (user?.status === 'SUSPENDED') return { success: false, code: 'USER_SUSPENDED', message: '账号已停用' };
    const merchant = (await db.collection('merchant').doc(merchantId).get()).data;
    if (!merchant || merchant.status !== 'APPROVED') return { success: false, code: 'MERCHANT_INACTIVE', message: '门店尚未审核通过或已停用' };
    const staff = (await db.collection('merchant_staff').doc(`staff_${hash(`${merchantId}:${openid}`)}`).get()).data;
    if (merchant.owner_openid !== openid && user?.role !== 'ADMIN' && !(staff && staff.status === 'ACTIVE')) return { success: false, code: 'FORBIDDEN', message: '无权查看门店码' };
    const token = String(merchant.qrcode_token || '');
    const mapping = token ? (await db.collection('scan_token').doc(token).get()).data : null;
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(token) || !mapping || mapping.status !== 'ACTIVE' || mapping.type !== 'MERCHANT' || mapping.target_id !== merchantId) return { success: false, code: 'TOKEN_INACTIVE', message: '门店码尚未就绪' };

    const requestedVersion = process.env.WXACODE_ENV_VERSION || 'develop';
    const envVersion = ['develop', 'trial', 'release'].includes(requestedVersion) ? requestedVersion : 'develop';
    const existing = merchant.qrcode_file_ids?.[envVersion];
    if (existing) return { success: true, fileID: existing, envVersion };
    const result = await cloud.openapi.wxacode.getUnlimited({ scene: `t=${token}`, page: 'pages/index/index', checkPath: envVersion === 'release', envVersion, width: 430 });
    if (!result?.buffer) throw new Error('wxacode buffer missing');
    const upload = await cloud.uploadFile({ cloudPath: `merchant-codes/${merchantId}/${token}-${envVersion}.png`, fileContent: result.buffer });
    if (!upload?.fileID) throw new Error('wxacode upload missing fileID');
    await db.collection('merchant').doc(merchantId).update({ data: { qrcode_file_ids: { ...(merchant.qrcode_file_ids || {}), [envVersion]: upload.fileID }, updated_at: new Date().toISOString() } });
    return { success: true, fileID: upload.fileID, envVersion };
  } catch (error) {
    console.error('[merchantCode] failed', { message: error.message });
    return { success: false, code: 'CODE_FAILED', message: '小程序码生成失败，请确认 AppID、云环境关联和版本后重试' };
  }
};
