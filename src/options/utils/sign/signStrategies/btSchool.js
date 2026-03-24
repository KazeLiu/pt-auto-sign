export function btSchoolMain() {
    const checkInBtn = document.querySelector('a[href*="action=addbonus"]');

    if (!checkInBtn) {
        return {
            sign: true,
            pending: false,
            title: '签到成功',
            text: '找不到签到按钮，默认为签到成功',
            msg: '签到成功',
            detail: '找不到签到按钮，默认为签到成功',
        };
    }

    checkInBtn.click();
    return {
        sign: true,
        pending: false,
        title: '签到成功',
        text: '已触发签到按钮',
        msg: '签到成功',
        detail: '已触发签到按钮',
    };
}
