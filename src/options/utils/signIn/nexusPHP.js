/**
 * 这个函数会被注入到目标页面中执行。
 * 它本身不能访问扩展程序的变量，所以逻辑要全封闭。
 * 套了CF盾的会自刷新 要想办法在刷新后还植入代码并返回
 */
export function nexusMain() {
    if (checkError()) {
        return {
            sign: false,
            msg: '页面可能返回了 521 错误，请检查站点是否正常！'
        }
    }
    return new Promise((resolve) => {
        const maxTime = 30000; // 最多等30秒，防止死循环
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
        console.log(signTitle, signText)
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


    function checkError() {
        const text = document.body.innerText;
        const title = document.title;
        // 定义错误特征词，可以根据实际情况添加
        const errorKeywords = ['521', 'Web server is down'];

        return errorKeywords.some(key =>
            text.includes(key) || title.includes(key)
        );
    }
}