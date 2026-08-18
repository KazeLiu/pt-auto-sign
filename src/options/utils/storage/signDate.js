import { storage } from './index';
import { getDateString } from '../index.js';
import {mergeSignRecord} from '../sign/signResult.js';

const STORAGE_KEY = 'site_sign_records';

/**
 * 创建站点签到记录的默认结构。
 *
 * @param {string} siteKey - 站点唯一标识。
 * @returns {{key: string, dates: string[], lastResult: null, lastUpdate: number}} 默认记录对象。
 */
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
        () => mergeSignRecord(null, siteKey, {
            sign: true,
            pending: false,
            status: 'signed',
            msg: '签到成功'
        }, dateStr),
        old => mergeSignRecord(old, siteKey, {
            ...(old?.dailyResults?.[dateStr] ?? old?.lastResult ?? {}),
            sign: true,
            pending: false,
            status: 'signed',
            msg: old?.dailyResults?.[dateStr]?.msg || old?.lastResult?.msg || '签到成功'
        }, dateStr)
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
export async function updateSignResult(siteKey, result = {}, dateStr = getDateString()) {
    const list = await storage.listUpsert(
        STORAGE_KEY,
        item => item.key === siteKey,
        () => mergeSignRecord(null, siteKey, result, dateStr),
        old => mergeSignRecord(old, siteKey, result, dateStr)
    );

    console.log(`签到结果更新成功`, list);
    return list;
}

/**
 * 获取全部站点签到记录。
 *
 * @returns {Promise<Array>} 签到记录列表。
 */
export async function getSignRecords() {
    return storage.get(STORAGE_KEY, []);
}
