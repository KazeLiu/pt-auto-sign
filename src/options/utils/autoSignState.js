import {isRecordSignedOnDate} from "./sign/signResult.js";

export function hasUnsignedEnabledSite(sites = [], records = [], dateStr) {
    const enabledSites = Array.isArray(sites) ? sites.filter(site => Boolean(site?.enabled)) : [];
    if (enabledSites.length === 0) return false;

    const recordMap = new Map(
        (Array.isArray(records) ? records : [])
            .filter(record => record?.key)
            .map(record => [record.key, record])
    );

    return enabledSites.some(site => !isRecordSignedOnDate(recordMap.get(site.name), dateStr));
}
