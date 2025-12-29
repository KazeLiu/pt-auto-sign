export function btSchoolMain() {
    const checkInBtn = document.querySelector('a[href*="action=addbonus"]');

    if (!checkInBtn) {
        return {
            sign: true,
            title: '签到成功',
            text: '找不到签到按钮，默认为签到成功'
        };
    }
}