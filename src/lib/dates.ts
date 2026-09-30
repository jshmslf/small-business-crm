// UTC+8 w/ no daylight saving
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

export function startOfTodayPH(now = new Date()) {
    const ph = new Date(now.getTime() + PH_OFFSET_MS);
    ph.setUTCHours(0, 0, 0, 0);
    return new Date(ph.getTime() - PH_OFFSET_MS);
}

export function startOfMonthPH(now = new Date()) {
    const ph = new Date(now.getTime() + PH_OFFSET_MS);
    ph.setUTCDate(1);
    ph.setUTCHours(0, 0, 0, 0);
    return new Date(ph.getTime() - PH_OFFSET_MS);
}

