export function pttMain() {
    const body = document.querySelector('body');
    const bodyText = body?.innerText ?? '';
    const lines = String(bodyText).split(/\n+/).map(line => line.trim()).filter(Boolean);
    const successLine = lines.find(line => /(?:签到成功|已签到|已经签到|今日已签到|今日已经签到)/.test(line));
    const loginLine = lines.find(line => /(?:请先|需要先|未登录).{0,8}(?:登录|登入|登錄)|权限不足|權限不足/.test(line));
    if (loginLine) {
        return {
            sign: false,
            pending: false,
            status: 'login-required',
            title: '需要登录',
            text: bodyText,
            msg: loginLine,
            detail: bodyText,
        };
    }
    if (successLine) {
        return {
            sign: true,
            pending: false,
            title: '签到成功',
            text: bodyText,
            msg: successLine,
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
