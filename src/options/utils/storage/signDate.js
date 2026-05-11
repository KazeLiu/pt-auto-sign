import { storage } from './index';
import { getDateString } from '../index.js';

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
        dailyResults: {},
        lastResult: null,
        lastUpdate: Date.now()
    };
}

function getRecordDates(record) {
    return Array.isArray(record?.dates) ? record.dates : [];
}

function getRecordDailyResults(record) {
    if (!record?.dailyResults || typeof record.dailyResults !== 'object' || Array.isArray(record.dailyResults)) {
        return {};
    }
    return record.dailyResults;
}

function normalizeSignResult(result = {}, dateStr = getDateString()) {
    return {
        sign: Boolean(result?.sign),
        pending: Boolean(result?.pending),
        status: result?.status ?? (result?.sign ? 'signed' : 'failed'),
        msg: result?.msg ?? '',
        title: result?.title ?? '',
        text: result?.text ?? '',
        detail: result?.detail ?? result?.text ?? '',
        date: dateStr,
        updatedAt: Date.now()
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
            dailyResults: {
                [dateStr]: normalizeSignResult({
                    sign: true,
                    status: 'signed',
                    msg: '签到成功'
                }, dateStr)
            },
        }),
        old => {
            const dates = getRecordDates(old);
            const dailyResults = getRecordDailyResults(old);
            const existingResult = dailyResults[dateStr] ?? old.lastResult ?? {};
            const signedResult = normalizeSignResult({
                ...existingResult,
                sign: true,
                pending: false,
                status: existingResult.status && existingResult.status !== 'failed'
                    ? existingResult.status
                    : 'signed',
                msg: existingResult.msg || '签到成功'
            }, dateStr);

            return {
                ...old,
                dates: dates.includes(dateStr)
                    ? dates
                    : [...dates, dateStr],
                dailyResults: {
                    ...dailyResults,
                    [dateStr]: signedResult
                },
                lastResult: signedResult,
                lastUpdate: Date.now()
            };
        }
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
    const normalizedResult = normalizeSignResult(result, dateStr);

    const list = await storage.listUpsert(
        STORAGE_KEY,
        item => item.key === siteKey,
        () => ({
            ...createEmptyRecord(siteKey),
            dates: normalizedResult.sign ? [dateStr] : [],
            dailyResults: {
                [dateStr]: normalizedResult
            },
            lastResult: normalizedResult,
            lastUpdate: Date.now()
        }),
        old => {
            const dates = getRecordDates(old);
            const dailyResults = getRecordDailyResults(old);

            return {
                ...old,
                dates: normalizedResult.sign && !dates.includes(dateStr)
                    ? [...dates, dateStr]
                    : dates,
                dailyResults: {
                    ...dailyResults,
                    [dateStr]: normalizedResult
                },
                lastResult: normalizedResult,
                lastUpdate: Date.now()
            };
        }
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
