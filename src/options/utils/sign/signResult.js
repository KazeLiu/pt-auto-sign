import {getDateString} from "../index.js";

export const ACTION_TRIGGERED_STATUS = "action-triggered";
export const ASSUMED_SIGNED_STATUS = "assumed-signed";

function getDailyResults(record) {
    if (!record?.dailyResults || typeof record.dailyResults !== "object" || Array.isArray(record.dailyResults)) {
        return {};
    }
    return record.dailyResults;
}

function getRecordDates(record) {
    return Array.isArray(record?.dates) ? record.dates : [];
}

export function normalizeSignResult(result = {}, dateStr = getDateString()) {
    const sign = Boolean(result?.sign);
    const pending = Boolean(result?.pending);

    return {
        sign,
        pending,
        status: result?.status ?? (sign ? "signed" : pending ? "pending" : "failed"),
        msg: result?.msg ?? "",
        title: result?.title ?? "",
        text: result?.text ?? "",
        detail: result?.detail ?? result?.text ?? "",
        logs: result?.logs ?? "",
        date: dateStr,
        updatedAt: Date.now(),
    };
}

export function isConfirmedSignResult(result) {
    return Boolean(result?.sign);
}

export function isRecordSignedOnDate(record, dateStr) {
    const dailyResults = getDailyResults(record);
    if (Object.prototype.hasOwnProperty.call(dailyResults, dateStr)) {
        return isConfirmedSignResult(dailyResults[dateStr]);
    }
    return getRecordDates(record).includes(dateStr);
}

export function getRecordResultOnDate(record, dateStr) {
    const dailyResults = getDailyResults(record);
    if (Object.prototype.hasOwnProperty.call(dailyResults, dateStr)) {
        return dailyResults[dateStr];
    }
    if (getRecordDates(record).includes(dateStr)) {
        return normalizeSignResult({sign: true, status: "signed", msg: "签到成功"}, dateStr);
    }
    return null;
}

export function mergeSignRecord(record, siteKey, result = {}, dateStr = getDateString()) {
    const oldRecord = record ?? {
        key: siteKey,
        dates: [],
        dailyResults: {},
        lastResult: null,
        lastUpdate: Date.now(),
    };
    const normalizedResult = normalizeSignResult(result, dateStr);
    const dates = getRecordDates(oldRecord);
    const nextDates = normalizedResult.sign && !dates.includes(dateStr)
        ? [...dates, dateStr]
        : dates;

    return {
        ...oldRecord,
        key: siteKey,
        dates: nextDates,
        dailyResults: {
            ...getDailyResults(oldRecord),
            [dateStr]: normalizedResult,
        },
        lastResult: normalizedResult,
        lastUpdate: Date.now(),
    };
}
