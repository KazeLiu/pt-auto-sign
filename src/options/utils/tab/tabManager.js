/**
 * 控制页面与生命周期
 */

import browser from "webextension-polyfill";

export async function createSignTab(url) {
    return await browser.tabs.create({ url, active: true });
}

export async function closeTabSafe(tabId) {
    try {
        await browser.tabs.remove(tabId);
    } catch {
        // tab 已不存在，无需处理
    }
}
