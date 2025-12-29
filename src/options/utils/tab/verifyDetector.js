/**
 * 判定盾
 */


export async function detectVerifyPage(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: {tabId},
            func: () => {
                const text = document.body.innerText;
                const keywords = [
                    "Just a moment",
                    "Cloudflare",
                    "验证您是真人",
                    "正在进行安全检测",
                    "雷池 WAF",
                    "验证程序加载",
                    "耐心等待",
                    "正在验证",
                    "验证中"
                ];
                return keywords.some(k => text.includes(k));
            }
        });
        return results[0]?.result;
    } catch {
        return false;
    }
}
