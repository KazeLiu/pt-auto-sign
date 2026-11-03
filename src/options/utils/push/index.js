import {getSettingData} from '../storage/settingData.js';
import {sendPushWithSettings} from './transport.js';

// Keep notification errors separate from sign-in outcomes.
export async function sendPushNotice(title, description = '', {settings, ...options} = {}) {
    try {
        return await sendPushWithSettings(settings ?? await getSettingData(), title, description, options);
    } catch {
        return {ok: false, skipped: false, message: '推送失败，请检查推送配置和网络'};
    }
}
