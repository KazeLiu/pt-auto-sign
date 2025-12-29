/**
 * 等待CF盾或者雷池的全屏盾
 */

import browser from "webextension-polyfill";
import {sleep} from "../index.js";
import {detectVerifyPage} from "./verifyDetector.js";

export async function waitUntilPageReady(tabId) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("页面加载超时"));
        }, 60000);

        const listener = async (updatedTabId, changeInfo) => {
            if (updatedTabId !== tabId || changeInfo.status !== "complete") return;

            await sleep(500);
            try {
                await browser.tabs.get(tabId);
            } catch {
                return;
            }

            const verify = await detectVerifyPage(tabId);
            if (verify) {
                console.log(`[Tab ${tabId}] 验证页，继续等待`);
                return;
            }

            cleanup();
            resolve();
        };

        function cleanup() {
            clearTimeout(timeout);
            browser.tabs.onUpdated.removeListener(listener);
        }

        browser.tabs.onUpdated.addListener(listener);
    });
}
