export function hanhanMain() {
    const modalBtn = document.querySelector('.register-now-info');
    if (modalBtn) {
        return {
            sign: true,
            pending: false,
            title: '已经打卡',
            text: modalBtn.innerText,
            msg: '已经打卡',
            detail: modalBtn.innerText,
        };
    }
    return {
        sign: false,
        pending: false,
        title: '',
        text: '',
        msg: '未检测到已签到标识',
        detail: '',
    };
}
