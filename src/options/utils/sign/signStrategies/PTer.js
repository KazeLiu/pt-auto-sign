export function PterMain() {
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

    const waitForResult = ({interval = 500, timeout = 15000, check, onTimeout}) => new Promise((resolve) => {
        let elapsed = 0;
        const timer = setInterval(() => {
            elapsed += interval;
            const result = check();
            if (result?.sign || result?.pending) {
                clearInterval(timer);
                resolve(result);
                return;
            }

            if (elapsed >= timeout) {
                clearInterval(timer);
                resolve(onTimeout ? onTimeout() : createResult({msg: '等待页面结果超时'}));
            }
        }, interval);
    });

    const attendanceWrap = document.getElementById('attendance-wrap');
    const attendanceText = attendanceWrap?.innerText ?? '';

    if (attendanceText.includes('签到已得')) {
        return createResult({
            sign: true,
            title: '已经打卡',
            text: attendanceText,
        });
    }

    if (attendanceText.includes('签到得猫粮')) {
        const modalBtn = document.getElementById('do-attendance');
        if (!modalBtn) {
            return createResult({
                msg: '找不到签到按钮',
                text: attendanceText,
            });
        }
        modalBtn.click();
    }

    return waitForResult({
        check: () => {
            const title = document.querySelector('.jconfirm-title')?.innerText ?? '';
            const content = document.querySelector('.jconfirm-content')?.innerText ?? '';
            if (title.includes('签到成功')) {
                return createResult({
                    sign: true,
                    title: '签到成功',
                    text: content || title,
                });
            }
            return null;
        },
        onTimeout: () => createResult({
            msg: 'Pter 签到弹窗等待超时',
            text: document.querySelector('.jconfirm-content')?.innerText ?? attendanceText,
        })
    });
}
