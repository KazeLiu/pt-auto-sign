/**
 * 这个函数会被注入到目标页面中执行。
 * 它本身不能访问扩展程序的变量，所以逻辑要全封闭。
 */
export function nexusMain() {
    return new Promise((resolve) => {
        const maxTime = 15000; // 最多等15秒，防止死循环
        let spentTime = 0;

        // 定义一个检查器
        const intervalId = setInterval(() => {
            spentTime += 500;

            // 如果还在 Cloudflare 验证页，通常没有任何明显的 NexusPHP 特征，或者只有“Verify”字样
            // 只要检测到了关键字，就返回成功与关键字
            const isTargetPageLoaded = getSignInfo();
            if (isTargetPageLoaded.sign) {
                clearInterval(intervalId);
                resolve(isTargetPageLoaded);
            }

            // 超时判断
            if (spentTime >= maxTime) {
                clearInterval(intervalId);
                resolve(isTargetPageLoaded);
            }
        }, 500);
    });

    /**
     * 适配普通NexusPHP
     * 从页面文本中提取“签到已得”后面的积分数字。
     */
    function getSignInfo() {
        let signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText;
        let signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText;
        if (signTitle === '抱歉' || signTitle === '签到成功' || signTitle === '错误') {
            return {
                sign: true,
                title: signTitle,
                text: signText
            }
        }
        //所有策略都失败
        return {
            sign: false
        };
    }

}