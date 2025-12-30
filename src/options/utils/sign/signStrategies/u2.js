/**
 * 自动签到函数
 *
 * 该函数用于在特定网页中自动完成签到操作。
 * 它会查找页面中的签到区域，自动填写签到内容并提交。
 *
 * @returns {Object} 返回签到结果对象
 * - sign {boolean}: 是否成功执行签到操作
 * - title {string}: 签到区域标题（可选）
 * - text {string}: 签到区域文本内容（可选）
 */
export function u2Main() {
    const signTitle = document.querySelector('td.outer table.main .embedded h2')?.innerText;
    const signText = document.querySelector('td.outer table.main .embedded table .text')?.innerText;
    // 已经签到成功（刷新后的状态）
    if (signText === '感谢，今天已签到。') {
        return {
            sign: true,
            title: signTitle,
            text: signText
        };
    }

    // 还在签到页，尝试提交
    if (signTitle === '签到区') {
        const textarea = document.querySelector('td.outer table.main .embedded textarea');
        const submitBtn = document.querySelector('td.outer table.main .embedded table.captcha input[type=submit]');

        if (textarea && submitBtn) {
            textarea.value = '59个UCoin';
            submitBtn.click();

            return {
                sign: false,
                pending: true
            };
        }
    }

    // 兜底失败
    return { sign: false };
}
