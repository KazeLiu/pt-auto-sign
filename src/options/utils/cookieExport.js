import browser from "webextension-polyfill";

export async function collectSiteCookies(sites) {
    const targets = sites.map(site => {
        let url;
        try {
            url = new URL(site.site);
        } catch {
            throw new Error(`站点「${site.name}」的地址无效，请先编辑修正`);
        }
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error(`站点「${site.name}」的地址须以 http:// 或 https:// 开头`);
        }
        return {name: site.name, url};
    });

    const allCookies = await browser.cookies.getAll({});
    const cookies = [];
    const emptySites = [];

    for (const {name, url} of targets) {
        const matchingCookies = allCookies.filter(cookie => {
            const domain = cookie.domain.replace(/^\./, '').toLowerCase();
            // 保留适用于站点的父域 Cookie，但不收集兄弟域或无关后缀域的 Cookie。
            return url.hostname === domain
                || (!cookie.hostOnly && url.hostname.endsWith(`.${domain}`));
        });
        if (matchingCookies.length === 0) {
            emptySites.push(name);
        }
        cookies.push(...matchingCookies.map(cookie => ({...cookie, site: name, siteUrl: url.href})));
    }

    return {cookies, emptySites, siteCount: targets.length - emptySites.length};
}
