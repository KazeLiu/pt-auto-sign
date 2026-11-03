export function validateSiteList(sites = []) {
    if (!Array.isArray(sites)) {
        throw new TypeError('站点配置必须是数组');
    }

    const names = new Set();
    for (const site of sites) {
        const name = String(site?.name ?? '').trim();
        if (!name) {
            throw new Error('站点名称不能为空');
        }
        if (names.has(name)) {
            throw new Error(`站点名称必须唯一：${name}`);
        }
        names.add(name);
    }

    return sites;
}
