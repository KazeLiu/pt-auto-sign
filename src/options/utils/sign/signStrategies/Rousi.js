export function RousiMain() {
    const checkedInBtn = document.querySelector('button[title^="已签到"]');
    if (checkedInBtn) {
        return {
            sign: true,
            title: '已经打卡',
            text:signInBtn.title
        }
    }

    const signInBtn = document.querySelector('button[title^="签到"]');
    if (signInBtn) {
        signInBtn.click();
    }

    return new Promise((resolve) => {
        const maxTime = 15000; // 最多等15秒，防止死循环
        let spentTime = 0;

        // 启动定时器，每 500 毫秒扫描一次页面
        const intervalId = setInterval(() => {
            spentTime += 500;

            // 定位弹窗内的标题和内容元素。
            // 注意：Tailwind 类名中的方括号 [ ] 在 querySelector 中需要用 \\ 转义
            const titleEl = document.querySelector('.fixed.z-\\[200\\] span.text-sm.font-medium');
            const contentEl = document.querySelector('.fixed.z-\\[200\\] div.text-xs.opacity-90');

            // 只有当标题元素出现时，才提取它的文字
            if (titleEl) {
                const title = titleEl.innerText || '';
                // 内容元素如果不存在，就给个空字符串，避免报错
                const content = contentEl ? contentEl.innerText : '';

                const isTargetPageLoaded = getSignInfo(title, content);

                if (isTargetPageLoaded.sign) {
                    clearInterval(intervalId);
                    resolve(isTargetPageLoaded);
                    return; // 查找到结果就立刻跳出
                }
            }

            // 超时判断
            if (spentTime >= maxTime) {
                clearInterval(intervalId);
                resolve({ sign: false, msg: '签到弹窗等待超时' }); // 给一个明确的失败提示
            }
        }, 500);
    });

    function getSignInfo(title, content) {
        if (title.includes('签到成功')) {
            return {
                sign: true,
                title: '签到成功',
                text: content || title // 如果没有副标题内容，就把主标题填进去
            };
        }
        return {
            sign: false
        };
    }
}