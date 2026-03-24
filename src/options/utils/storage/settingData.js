import {storage} from './index';

export const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = {
    allOpen: false,
    autoSign: false,
    autoSignTime: '00:00',
    openIyuuPush: false,
    iyuuId: '',
    debugSignFlow: false,
    debugPauseMs: 15000,
};

/**
 * 获取插件设置数据。
 *
 * @returns {Promise<Object>} 设置对象，不存在时返回默认配置。
 */
export async function getSettingData() {
    const data = await storage.get(SETTINGS_KEY, {});
    return {
        ...DEFAULT_SETTINGS,
        ...data,
    };
}

/**
 * 保存插件设置数据。
 *
 * @param {Object} value - 完整设置对象。
 * @returns {Promise<void>}
 */
export async function setSettingData(value) {
    await storage.set(SETTINGS_KEY, {
        ...DEFAULT_SETTINGS,
        ...value,
    });
}
