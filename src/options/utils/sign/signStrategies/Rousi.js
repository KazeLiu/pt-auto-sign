export function RousiMain() {
    const createResult = ({
        sign = false,
        pending = false,
        title = '',
        text = '',
        msg = '',
        detail = '',
    } = {}) => ({
        sign,
        pending,
        title,
        text,
        msg: msg || title || text || (sign ? '签到成功' : '签到失败'),
        detail: detail || text,
    });

    const checkedInBtn = document.querySelector('button[title^="已签到"]');
    if (checkedInBtn) {
        return createResult({
            sign: true,
            title: '已经打卡',
            text: checkedInBtn.title || checkedInBtn.innerText || '',
        });
    }

    const signInBtn = document.querySelector('button[title^="签到"]');
    if (signInBtn) {
        signInBtn.click();
    }

    return new Promise((resolve) => {
        const maxTime = 15000; // 最多等15秒，防止死循环
        let spentTime = 0;

        const intervalId = setInterval(() => {
            spentTime += 500;

            // 注意：Tailwind 类名中的方括号 [ ] 在 querySelector 中需要用 \ 转义
            const titleEl = document.querySelector('.fixed.z-\\[200\\] span.text-sm.font-medium');
            const contentEl = document.querySelector('.fixed.z-\\[200\\] div.text-xs.opacity-90');

            if (titleEl) {
                const title = titleEl.innerText || '';
                const content = contentEl ? contentEl.innerText : '';

                const result = getSignInfo(title, content);
                if (result.sign) {
                    clearInterval(intervalId);
                    resolve(result);
                    return;
                }
            }

            if (spentTime >= maxTime) {
                clearInterval(intervalId);
                resolve(createResult({msg: '签到弹窗等待超时'}));
            }
        }, 500);
    });

    function getSignInfo(title, content) {
        if (title.includes('签到成功')) {
            return createResult({
                sign: true,
                title: '签到成功',
                text: content || title,
            });
        }
        return createResult({sign: false});
    }
}
