export function PterMain() {
    let attendanceWrap = document.getElementById('attendance-wrap');
    if (attendanceWrap) {
        return {
            sign: true,
            title: '已经打卡',
            text: attendanceWrap.innerText
        }
    }

    let modalBtn = document.getElementById('do-attendance');
    if (!modalBtn) {
        console.error('找不到签到按钮！');
        return {sign: false, error: '找不到签到按钮'};
    }

    modalBtn.click();

    return new Promise((resolve) => {
        const maxTime = 15000; // 最多等15秒，防止死循环
        let spentTime = 0;

        // 定义一个检查器
        const intervalId = setInterval(() => {
            spentTime += 500;
            let title = document.querySelector('.jconfirm-title').innerText
            let content = document.querySelector('.jconfirm-content').innerText

            const isTargetPageLoaded = getSignInfo(title, content);
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

    function getSignInfo(title, content) {
        if (title.includes('签到成功')) {
            return {
                sign: true,
                title: '签到成功',
                text: content
            }
        }
        return {
            sign: false
        };
    }
}