/*
 * 有些站是几个月不登录就销号，列表内的就访问下
 */
export function onlineMian() {
    const title = String(document.title ?? '');
    const bodyText = String(document.body?.innerText ?? '');
    const pageText = `${title}\n${bodyText}`;
    const path = String(window.location?.pathname ?? '');
    const hasPasswordInput = Boolean(document.querySelector("input[type='password']"));
    const isLoginRoute = /(?:^|\/)(?:login|signin|sign-in|auth)(?:[\/?#]|$)/i.test(path);
    const hasLoginText = /(?:请|請).{0,8}(?:登录|登入|登錄)|(?:登录|登入|登錄).{0,8}(?:继续|繼續)/i.test(pageText);

    if (hasPasswordInput || isLoginRoute || hasLoginText) {
        return {
            sign: false,
            pending: false,
            status: 'login-required',
            title: '需要登录',
            text: bodyText.slice(0, 200),
            msg: '访问页面跳转到登录状态',
            detail: window.location?.href || path,
        };
    }

    if (!document.body) {
        return {
            sign: false,
            pending: true,
            status: 'page-indeterminate',
            title: '页面尚未就绪',
            text: '',
            msg: '无法确认页面已成功访问',
            detail: window.location?.href || path,
        };
    }

    return {
        sign: true,
        pending: false,
        status: 'visited',
        title: '已访问',
        text: '仅访问页面以保持活跃状态',
        msg: '已访问',
        detail: '仅访问页面以保持活跃状态',
    };
}
