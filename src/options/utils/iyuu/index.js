import {getSettingData} from '../storage/settingData.js';
import {sendPushNotice} from '../push/index.js';

// Compatibility for callers expecting the original IYUU result shape.
export const sendIyuuNotice = async (text, desp = '') => {
    const settings = await getSettingData();
    const result = await sendPushNotice(text, desp, {settings: {...settings, pushProvider: 'iyuu'}});
    return result.skipped ? null : {errcode: result.ok ? 0 : -1, errmsg: result.message};
};
