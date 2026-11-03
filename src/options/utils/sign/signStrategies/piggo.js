export async function piggoMain() {
    const normalizeText = node => String(node?.innerText ?? node?.textContent ?? '')
        .replace(/\s+/g, ' ').trim();
    const guardKey = 'ptAutoSignPiggoTriggered';
    const page = document.documentElement;
    const deadline = Date.now() + 15000;
    let selectedToday = false;
    const unconfirmed = detail => ({
        sign: false,
        pending: true,
        status: 'action-triggered',
        title: '猪猪签到结果待确认',
        text: normalizeText(document.querySelector('.cal-att')),
        msg: '已触发猪猪签到，待确认',
        detail,
    });

    while (Date.now() < deadline) {
        const loading = document.querySelector('.cal-wrap[aria-busy="true"], .cal-nav select:disabled');
        const todayButton = Array.from(document.querySelectorAll('.cal-toolbar button'))
            .find(button => normalizeText(button) === '今天');

        if (!loading && todayButton) {
            // 日历也能补签或查看历史日期，必须先回到今天，不能把历史记录当成今日已签到。
            if (!todayButton.disabled) {
                if (!selectedToday) {
                    selectedToday = true;
                    todayButton.click();
                }
            } else {
                const pill = document.querySelector('.cal-att .cal-att-pill');
                const text = normalizeText(pill);
                if (/^已签到(?:\s|·|$)/.test(text)) {
                    const detail = normalizeText(document.querySelector('.cal-help'));
                    return {
                        sign: true,
                        pending: false,
                        status: 'signed',
                        title: '猪猪今日已签到',
                        text,
                        msg: text,
                        detail: [text, detail].filter(Boolean).join('\n'),
                    };
                }

                const signButton = document.querySelector('.cal-att button.cal-att-pill.act');
                if (page.dataset[guardKey] !== 'true' && !signButton?.disabled
                    && /^签到(?:\s|·|$)/.test(normalizeText(signButton))) {
                    // 在点击前留下标记，重注入也不重复提交；补签按钮不匹配此条件。
                    page.dataset[guardKey] = 'true';
                    try {
                        signButton.click();
                    } catch {
                        return unconfirmed('触发猪猪签到时发生异常，未再次点击；请到猪猪日历确认结果');
                    }
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (page.dataset[guardKey] === 'true') {
        return unconfirmed('等待今日已签到状态超过 15 秒，未再次点击；请到猪猪日历确认结果');
    }

    return {
        sign: false,
        pending: false,
        status: 'failed',
        title: '未识别到猪猪今日签到入口',
        text: normalizeText(document.querySelector('.cal-page > .muted')),
        msg: '未识别到猪猪今日签到入口，请使用 https://piggo.me/calendar',
        detail: normalizeText(document.querySelector('.cal-att')),
    };
}
