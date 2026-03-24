export function pttMain() {
    const body = document.querySelector('body');
    const bodyText = body?.innerText ?? '';
    if (bodyText.includes('签到成功')) {
        return {
            sign: true,
            pending: false,
            title: '签到成功',
            text: bodyText,
            msg: '签到成功',
            detail: bodyText,
        };
    }
    if (bodyText.includes('已签到')) {
        return {
            sign: true,
            pending: false,
            title: '已签到',
            text: bodyText,
            msg: '已签到',
            detail: bodyText,
        };
    }
    return {
        sign: false,
        pending: false,
        title: '',
        text: bodyText,
        msg: '未识别到 PTT 签到结果',
        detail: bodyText,
    };
}
