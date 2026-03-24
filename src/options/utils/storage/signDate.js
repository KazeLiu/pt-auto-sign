import { storage } from './index';

const STORAGE_KEY = 'site_sign_records';

/**
 * 创建站点签到记录的默认结构。
 *
 * @param {string} siteKey - 站点唯一标识。
 * @returns {{key: string, dates: string[], lastResult: null, lastUpdate: number}} 默认记录对象。
 */
function createEmptyRecord(siteKey) {
    return {
        key: siteKey,
        dates: [],
        lastResult: null,
        lastUpdate: Date.now()
    };
}

/**
 * 记录指定站点的签到日期。
 *
 * 若站点记录不存在则创建；若日期已存在则保持原样，仅刷新更新时间。
 *
 * @param {string} siteKey - 站点名称，比如 `M-Team`。
 * @param {string} dateStr - 日期字符串，比如 `2025-12-01`。
 * @returns {Promise<void>}
 */
export async function addSignDate(siteKey, dateStr) {
    const list = await storage.listUpsert(
        STORAGE_KEY,
        item => item.key === siteKey,
        () => ({
            ...createEmptyRecord(siteKey),
            dates: [dateStr],
        }),
        old => ({
            ...old,
            dates: old.dates.includes(dateStr)
                ? old.dates
                : [...old.dates, dateStr],
            lastUpdate: Date.now()
        })
    );
    console.log(`签到记录更新成功`, list);
}

/**
 * 更新站点最近一次签到结果。
 *
 * 结果会被整理为统一结构，供首页展示状态、备注和失败原因。
 *
 * @param {string} siteKey - 站点名称。
 * @param {{
 *   sign?: boolean,
 *   pending?: boolean,
 *   status?: string,
 *   msg?: string,
 *   title?: string,
 *   text?: string,
 *   detail?: string
 * }} [result={}] - 原始签到结果。
 * @returns {Promise<void>}
 */
export async function updateSignResult(siteKey, result = {}) {
    const normalizedResult = {
        sign: Boolean(result?.sign),
        pending: Boolean(result?.pending),
        status: result?.status ?? (result?.sign ? 'signed' : 'failed'),
        msg: result?.msg ?? '',
        title: result?.title ?? '',
        text: result?.text ?? '',
        detail: result?.detail ?? result?.text ?? '',
        updatedAt: Date.now()
    };

    const list = await storage.listUpsert(
        STORAGE_KEY,
        item => item.key === siteKey,
        () => ({
            ...createEmptyRecord(siteKey),
            lastResult: normalizedResult,
            lastUpdate: Date.now()
        }),
        old => ({
            ...old,
            lastResult: normalizedResult,
            lastUpdate: Date.now()
        })
    );

    console.log(`签到结果更新成功`, list);
}

/**
 * 获取全部站点签到记录。
 *
 * @returns {Promise<Array>} 签到记录列表。
 */
export async function getSignRecords() {
    return storage.get(STORAGE_KEY, []);
}
