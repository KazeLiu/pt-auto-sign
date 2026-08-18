export function ttgMain() {
    const signedHtml = document.querySelector('.smallfont #sp_signed');
    if (signedHtml?.innerText === '已签到') {
        return {
            sign: true,
            pending: false,
            title: '已签到',
            text: signedHtml.innerText,
            msg: '今日已签到',
            detail: signedHtml.innerText,
        };
    }

    const signBtnHtml = document.querySelector('.smallfont #sp_signed a#signed');
    if (signBtnHtml?.innerText === '签到') {
        signBtnHtml.click();
        return {
            sign: false,
            pending: true,
            status: 'action-triggered',
            title: '已触发签到',
            text: signBtnHtml.innerText,
            msg: '已触发签到，待确认',
            detail: '按钮已点击，但尚未识别到站点返回的签到结果',
        };
    }

    return {
        sign: false,
        pending: false,
        title: '',
        text: '',
        msg: '未识别到 TTG 签到入口',
        detail: '',
    };
}
