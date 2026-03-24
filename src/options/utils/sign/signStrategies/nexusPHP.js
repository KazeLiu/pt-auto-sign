export function nexusPHP() {
    const signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText ?? '';
    const signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText ?? '';

    // 这是正常的nexus架构页面，进入就算是签到成功
    if (signTitle === '抱歉' || signTitle === '错误' || signTitle.includes('签到成功')) {
        return {
            sign: true,
            pending: false,
            title: signTitle,
            text: signText,
            msg: signTitle || signText || '签到成功',
            detail: signText,
        };
    }

    //所有策略都失败
    return {
        sign: false,
        pending: false,
        title: signTitle,
        text: signText,
        msg: signTitle || signText || '未识别到 NexusPHP 签到结果',
        detail: signText,
    };
}
