export function btSchoolMain() {
    const checkInBtn = document.querySelector('a[href*="action=addbonus"]');

    if (!checkInBtn) {
        return {
            sign: false,
            pending: true,
            status: 'assumed-signed',
            title: '无法确认签到状态',
            text: '找不到签到按钮，无法确认页面状态',
            msg: '未找到签到入口，待确认',
            detail: '找不到签到按钮，可能是页面结构变化或登录状态异常',
        };
    }

    checkInBtn.click();
    return {
        sign: false,
        pending: true,
        status: 'action-triggered',
        title: '已触发签到',
        text: '已触发签到按钮，等待站点结果',
        msg: '已触发签到，待确认',
        detail: '按钮已点击，但当前页面没有可验证的成功结果',
    };
}
