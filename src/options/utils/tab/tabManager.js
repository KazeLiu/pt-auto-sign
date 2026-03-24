/**
 * 标签页生命周期管理工具。
 */

import browser from "webextension-polyfill";

/**
 * 创建用于签到的标签页。
 *
 * @param {string} url - 目标站点地址。
 * @param {Object} opts - 标签页附加配置，如 `active`、`pinned`。
 * @returns {Promise<browser.Tabs.Tab>} 新建的标签页对象。
 */
export async function createSignTab(url, opts) {
    return await browser.tabs.create({url, ...opts});
}

/**
 * 安全关闭标签页。
 *
 * 当标签页已被用户手动关闭或不存在时，忽略异常避免影响主流程。
 *
 * @param {number} tabId - 目标标签页 ID。
 * @returns {Promise<void>}
 */
export async function closeTabSafe(tabId) {
    try {
        await browser.tabs.remove(tabId);
    } catch {
        // tab 已不存在，无需处理
    }
}
