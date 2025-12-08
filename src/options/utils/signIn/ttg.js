export function ttgMain() {
    let signedHtml = document.querySelector('.smallfont #sp_signed')
    if (signedHtml) {
        return {
            sign: true,
            title: '已经打卡',
            text: signedHtml.innerText
        }
    }
    return {
        sign: false
    };
    // modalBtn.click();
    //
    // return new Promise((resolve) => {
    //     const maxTime = 15000; // 最多等15秒，防止死循环
    //     let spentTime = 0;
    //
    //     // 定义一个检查器
    //     const intervalId = setInterval(() => {
    //         spentTime += 500;
    //         let text = document.getElementById('simpleModal').innerText
    //         const isTargetPageLoaded = getSignInfo(text);
    //         if (isTargetPageLoaded.sign) {
    //             clearInterval(intervalId);
    //             resolve(isTargetPageLoaded);
    //         }
    //
    //         // 超时判断
    //         if (spentTime >= maxTime) {
    //             clearInterval(intervalId);
    //             resolve(isTargetPageLoaded);
    //         }
    //     }, 500);
    // });
    //
    // function getSignInfo(innerText) {
    //     if (innerText.includes('每日打卡')) {
    //         return {
    //             sign: true,
    //             title: '签到成功',
    //             text: innerText
    //         }
    //     }
    //     return {
    //         sign: false
    //     };
    // }
}