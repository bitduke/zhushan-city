/**
 * 微信小程序订阅消息工具
 * 用于服务预约状态变更通知与核销成功提醒
 */
export const TEMPLATE_IDS = {
  APPOINTMENT_CONFIRM: 'TMPL_APPOINTMENT_CONFIRM_ID', // 预约确认通知
  COUPON_EXPIRING: 'TMPL_COUPON_EXPIRING_ID'         // 卡券即将过期提醒
};

export function requestAppointmentSubscription(): Promise<boolean> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.requestSubscribeMessage) {
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_IDS.APPOINTMENT_CONFIRM],
        success: (res) => {
          if (res[TEMPLATE_IDS.APPOINTMENT_CONFIRM] === 'accept') {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: () => {
          resolve(false);
        }
      });
      return;
    }
    // #endif
    resolve(true);
  });
}
