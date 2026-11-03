export function ssdMain() {
    const createResult = ({
        sign = false,
        pending = false,
        status,
        title = '',
        text = '',
        msg = '',
        detail = '',
    } = {}) => ({
        sign,
        pending,
        ...(status ? {status} : {}),
        title,
        text,
        msg: msg || title || text || (sign ? '签到成功' : '签到失败'),
        detail: detail || text,
    });

    const normalizeText = (text = '') => String(text).replace(/\s+/g, ' ').trim();

    const isVisible = (node) => {
        if (!node) return false;
        const style = window.getComputedStyle(node);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            node.getClientRects().length > 0;
    };

    const getOpenNewsModal = () => Array.from(document.querySelectorAll('#news_modal'))
        .find(modal => {
            const isDialogOpen = modal.tagName.toLowerCase() !== 'dialog' ||
                modal.open ||
                modal.hasAttribute('open');
            return isDialogOpen && isVisible(modal);
        });

    const getConfirmButton = () => {
        const modal = getOpenNewsModal();
        const scope = modal || document;
        const button = scope.querySelector('#NewsModalCloseBtn');
        if (button && isVisible(button)) return button;

        return Array.from(scope.querySelectorAll('button, input[type="button"], input[type="submit"]'))
            .find(node => {
                const text = normalizeText(node.innerText || node.value || '');
                return isVisible(node) && /我已知晓|已知晓|确认|知道/.test(text);
            });
    };

    return new Promise((resolve) => {
        const maxTime = 15000;
        const interval = 500;
        const maxConfirmCount = 10;
        let spentTime = 0;
        let confirmedCount = 0;
        let lastModalText = '';

        const timer = setInterval(() => {
            spentTime += interval;

            const modal = getOpenNewsModal();
            const confirmButton = getConfirmButton();

            if (confirmButton && confirmedCount < maxConfirmCount) {
                lastModalText = normalizeText(modal?.innerText || confirmButton.innerText || confirmButton.value || '');
                confirmButton.click();
                confirmedCount += 1;
                return;
            }

            if (confirmedCount > 0 && !confirmButton) {
                clearInterval(timer);
                resolve(createResult({
                    sign: true,
                    title: '公告确认完成',
                    text: `已确认 ${confirmedCount} 条未读公告`,
                    msg: `已确认 ${confirmedCount} 条未读公告`,
                    detail: lastModalText,
                }));
                return;
            }

            if (spentTime >= maxTime) {
                clearInterval(timer);
                if (confirmedCount > 0) {
                    resolve(createResult({
                        sign: false,
                        pending: true,
                        status: 'page-barrier',
                        title: '公告确认未完成',
                        text: `已尝试确认 ${confirmedCount} 次，但弹窗仍未关闭`,
                        msg: '公告弹窗仍存在，需要人工确认',
                        detail: lastModalText,
                    }));
                    return;
                }

                const pageText = normalizeText(document.body?.innerText || '');
                resolve(createResult({
                    sign: false,
                    pending: true,
                    status: 'assumed-signed',
                    title: '无法确认公告状态',
                    text: '未发现未读公告弹窗，无法确认是否已完成',
                    msg: '未发现可验证的签到成功证据，待确认',
                    detail: pageText.slice(0, 200),
                }));
            }
        }, interval);
    });
}
