export function nexusPHP() {
    const normalizeText = (text = '') => String(text)
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\s*\n\s*/g, '\n')
        .trim();

    const getFirstText = (selectors) => {
        for (const selector of selectors) {
            const text = normalizeText(document.querySelector(selector)?.innerText ?? '');
            if (text) return text;
        }
        return '';
    };

    const getTextList = (selectors) => selectors
        .flatMap(selector => Array.from(document.querySelectorAll(selector)))
        .map(node => normalizeText(node.innerText ?? node.textContent ?? ''))
        .filter(Boolean);

    const signTitle = getFirstText([
        'td.outer table.main .embedded h2',
        'table.main .embedded h2',
        '.embedded h2',
        'h2',
        'h1',
        'title'
    ]) || normalizeText(document.title ?? '');

    const signText = normalizeText(Array.from(new Set(getTextList([
        'td.outer table.main .embedded table .text',
        'td.outer table.main .embedded .text',
        'table.main .embedded table .text',
        '.embedded .text',
        'td.text',
        '.text'
    ]))).join('\n'));

    const bodyText = normalizeText(document.body?.innerText ?? '');
    const fullText = normalizeText([signTitle, signText, bodyText].filter(Boolean).join('\n'));
    const lines = fullText.split('\n').map(line => line.trim()).filter(Boolean);

    const successPatterns = [
        /签到成功/,
        /簽到成功/,
        /(?:今天|今日|本日).{0,12}已(?:经|經)?[签簽]到/,
        /(?:已|已经|已經)[签簽]到/,
        /(?:已经|已經)[签簽]过/,
        /感谢[，,\s]*(?:今天|今日).{0,8}已(?:经|經)?[签簽]到/,
        /感謝[，,\s]*(?:今天|今日).{0,8}已(?:經)?簽到/,
        /请勿重复[签簽]到/,
        /請勿重複簽到/,
        /不要重复[签簽]到/
    ];
    const failurePatterns = [
        /(?:请|請).{0,8}(?:登录|登入|登錄)/,
        /(?:未|没有|沒有).{0,4}(?:登录|登入|登錄)/,
        /权限不足/,
        /權限不足/,
        /无权访问/,
        /無權訪問/,
        /页面不存在/,
        /頁面不存在/
    ];

    const matchLine = (patterns) => lines.find(line => patterns.some(pattern => pattern.test(line))) ?? '';
    const successLine = matchLine(successPatterns);
    const failureLine = matchLine(failurePatterns);

    // NexusPHP 常把“今日已签到/请勿重复签到”放在抱歉或错误页正文里，正文命中才算成功。
    if (successLine && !failureLine) {
        return {
            sign: true,
            pending: false,
            status: 'signed',
            title: signTitle,
            text: signText || bodyText,
            msg: successLine || signTitle || '签到成功',
            detail: signText || bodyText,
        };
    }

    //所有策略都失败
    return {
        sign: false,
        pending: false,
        status: 'failed',
        title: signTitle,
        text: signText || bodyText,
        msg: failureLine || signTitle || signText || '未识别到 NexusPHP 签到结果',
        detail: signText || bodyText,
    };
}
