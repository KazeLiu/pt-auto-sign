export function hanhanMain() {
    const modalBtn = document.querySelector('.register-now-info');
    const text = String(modalBtn?.innerText ?? modalBtn?.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (modalBtn && /(?:已|已经|已經).{0,8}(?:签到|簽到|打卡)|(?:签到|簽到|打卡).{0,8}(?:完成|成功)/.test(text)) {
        return {
            sign: true,
            pending: false,
            title: '已经打卡',
            text,
            msg: '已经打卡',
            detail: text,
        };
    }
    return {
        sign: false,
        pending: false,
        title: '',
        text: '',
        msg: '未检测到已签到标识',
        detail: text,
    };
}
