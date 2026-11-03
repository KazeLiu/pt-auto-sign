export async function ttgMain() {
    // executeScript only injects this function; helpers must stay inside it.
    const normalizeText = node => String(node?.innerText ?? node?.textContent ?? '')
        .replace(/\s+/g, ' ').trim();
    const detectSigned = () => {
        const text = normalizeText(document.querySelector('.smallfont #sp_signed'));
        if (text !== '已签到') return null;
        return {
            sign: true,
            pending: false,
            status: 'signed',
            title: '已签到',
            text,
            msg: '今日已签到',
            detail: text,
        };
    };

    const existing = detectSigned();
    if (existing) return existing;

    // Keep the guard on the document so reinjection cannot submit the same action again.
    const guardKey = 'ptAutoSignTtgTriggered';
    const alreadyTriggered = document.documentElement.dataset[guardKey] === 'true';
    const signBtnHtml = document.querySelector('.smallfont #sp_signed a#signed');
    if (!alreadyTriggered && normalizeText(signBtnHtml) !== '签到') {
        return {
            sign: false,
            pending: false,
            title: '',
            text: '',
            msg: '未识别到 TTG 签到入口',
            detail: '',
        };
    }

    return new Promise(resolve => {
        let finished = false;
        const unconfirmed = detail => ({
            sign: false,
            pending: true,
            status: 'action-triggered',
            title: '签到结果待确认',
            text: normalizeText(document.querySelector('.smallfont #sp_signed')),
            msg: '已触发签到，待确认',
            detail,
        });
        const finish = result => {
            if (finished) return;
            finished = true;
            observer.disconnect();
            clearTimeout(timeout);
            resolve(result);
        };
        const checkResult = () => {
            const result = detectSigned();
            if (result) finish(result);
        };
        const observer = new MutationObserver(checkResult);
        const timeout = setTimeout(() => {
            finish(detectSigned() || unconfirmed('等待 TTG 签到结果超过 15 秒，未再次点击；请到站点确认后再操作'));
        }, 15000);

        // TTG posts signed.php asynchronously, then replaces the link with “已签到”.
        // Start observing before the click so a fast response is not missed.
        const region = document.querySelector('.smallfont #sp_signed');
        observer.observe(region?.parentElement || document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        if (!alreadyTriggered) {
            document.documentElement.dataset[guardKey] = 'true';
            try {
                signBtnHtml.click();
            } catch {
                finish(unconfirmed('触发 TTG 签到时发生异常，未再次点击；请到站点确认结果'));
            }
        }
        checkResult();
    });
}
