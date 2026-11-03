export async function RousiMain() {
    const normalizeText = node => String(node?.innerText ?? node?.textContent ?? '')
        .replace(/\s+/g, ' ').trim();
    const guardKey = 'ptAutoSignRousiTriggered';
    const page = document.documentElement;
    let deadline = Date.now() + 15000;
    const unconfirmed = detail => ({
        sign: false,
        pending: true,
        status: 'action-triggered',
        title: 'Rousi 签到结果待确认',
        text: normalizeText(document.querySelector('header button[title^="快捷签到"]')),
        msg: '已触发 Rousi 签到，待确认',
        detail,
    });

    while (Date.now() < deadline) {
        // 新版成功后将快捷签到按钮替换为已签到链接，不再使用旧版弹窗。
        const signedLink = document.querySelector('header a[role="button"][href="/account/economy"]');
        const text = normalizeText(signedLink);
        if (/^已签到(?:\s|$)/.test(text)) {
            return {
                sign: true,
                pending: false,
                status: 'signed',
                title: 'Rousi 今日已签到',
                text,
                msg: text,
                detail: text,
            };
        }

        const signButton = document.querySelector('header button[title^="快捷签到"]');
        if (page.dataset[guardKey] !== 'true' && !signButton?.disabled
            && normalizeText(signButton) === '签到') {
            // 标记留在文档中，策略重注入也不重复提交固定奖励签到。
            page.dataset[guardKey] = 'true';
            deadline = Date.now() + 15000;
            try {
                signButton.click();
            } catch {
                return unconfirmed('触发 Rousi 签到时发生异常，未再次点击；请到站点确认结果');
            }
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (page.dataset[guardKey] === 'true') {
        return unconfirmed('等待 Rousi 已签到状态超过 15 秒，未再次点击；请到站点确认结果');
    }

    return {
        sign: false,
        pending: false,
        status: 'failed',
        title: '未识别到 Rousi 签到入口',
        text: '',
        msg: '未识别到 Rousi 签到入口，请确认已登录 https://rousi.pro/',
        detail: '',
    };
}
