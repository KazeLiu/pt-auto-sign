/**
 * 控制页面与生命周期
 */

import browser from "webextension-polyfill";

export async function createSignTab(url, opts) {
    return await browser.tabs.create({url, ...opts});
}

export async function closeTabSafe(tabId) {
    try {
        await browser.tabs.remove(tabId);
    } catch {
        // tab 已不存在，无需处理
    }
}
