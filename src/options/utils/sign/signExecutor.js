/**
 * 注入执行代码
 */

import { getSignStrategy } from "./signStrategies";

export async function runSignScript(tabId, siteInfo) {
    const strategy = getSignStrategy(siteInfo.siteType);
    if (!strategy) {
        console.warn(`[签到流程] 未找到策略：${siteInfo.siteType}`);
        return { sign: false };
    }
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: strategy,
        });

        const result = results[0]?.result ?? { sign: false };
        console.log(`[签到流程] 执行结果：`, result);

        if (result.pending) {
            console.log(`[签到流程] 操作已触发，等待页面刷新后重试`);
            return { sign: false, pending: true };
        }

        return result;
    } catch (err) {
        console.error(`[签到流程] 执行失败：`, err);
        return { sign: false };
    }
}
