export function haidanMain() {
    const modalBtn = document.getElementById('modalBtn');
    if (!modalBtn) {
        console.error('找不到签到按钮！');
        return {
            sign: false,
            pending: false,
            title: '',
            text: '',
            msg: '找不到按钮',
            detail: '找不到签到按钮',
        };
    }

    const buttonText = String(modalBtn.value || modalBtn.innerText || '').replace(/\s+/g, ' ').trim();
    if (/(?:已经|已經|今日已)(?:打卡|签到|簽到)/.test(buttonText)) {
        return {
            sign: true,
            pending: false,
            title: '已经打卡',
            text: '',
            msg: '已经打卡',
            detail: '',
        };
    }

    modalBtn.click();

    return new Promise((resolve) => {
        const maxTime = 15000; // 最多等15秒，防止死循环
        let spentTime = 0;

        const intervalId = setInterval(() => {
            spentTime += 500;
            const text = document.getElementById('simpleModal')?.innerText ?? '';
            const result = getSignInfo(text);
            if (result.sign) {
                clearInterval(intervalId);
                resolve(result);
                return;
            }

            if (spentTime >= maxTime) {
                clearInterval(intervalId);
                resolve(result);
            }
        }, 500);
    });

    function getSignInfo(innerText) {
        if (/(?:签到|簽到|打卡).{0,8}(?:成功|完成)|(?:今日|今天).{0,6}已.{0,4}(?:签到|簽到|打卡)/.test(innerText)) {
            return {
                sign: true,
                pending: false,
                title: '签到成功',
                text: innerText,
                msg: '签到成功',
                detail: innerText,
            };
        }
        return {
            sign: false,
            pending: false,
            title: '',
            text: innerText,
            msg: '未识别到海胆签到结果',
            detail: innerText,
        };
    }
}
