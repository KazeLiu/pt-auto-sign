/**
 * 测试专用函数：验证 Tab ID 在刷新后是否改变，以及是否能持续注入代码
 */
function startRefreshTest(tabId) {
    console.log(`[Test Mode] 已启动刷新监控，目标 Tab ID: ${tabId}`);

    const testListener = async (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
            console.log(`[Test Mode] 检测到 Tab ${tabId} 加载完成/刷新，正在尝试注入测试代码...`);

            try {
                await chrome.scripting.executeScript({
                    target: {tabId}, func: (tId) => {
                        // 这段代码会在页面控制台执行
                        console.group("%c🧪 刷新测试 (Refresh Test)", "color: #ff007f; font-size: 14px;");
                        console.log(`%c当前时间: ${new Date().toLocaleString()}`, "color: blue;");
                        console.log(`%c原始 Tab ID (来自插件): ${tId}`, "color: green; font-weight: bold;");
                        console.log(`页面地址: ${location.href}`);
                        console.log("✅ 注入成功，Tab ID 未丢失！");
                        console.groupEnd();
                    }, args: [tabId]
                });
                console.log(`[Test Mode] Tab ${tabId} 测试代码注入成功！`);
            } catch (err) {
                console.error(`[Test Mode] Tab ${tabId} 注入失败 (可能页面已关闭或权限不足):`, err);
            }
        }
    };

    browser.tabs.onUpdated.addListener(testListener);
}
