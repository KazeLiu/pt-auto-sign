export function hanhanMain() {
    let modalBtn = document.querySelector('.register-now-info');
    if (modalBtn) {
        return {
            sign: true,
            title: '已经打卡',
            text: modalBtn.innerText
        }
    }
    return {
        sign: false
    }
}