// Date helpers pinned to India Standard Time, whatever timezone the server runs in.

const IST_OFFSET_MIN = 330;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function istParts(now = new Date()) {
  const t = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  return { date: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export const todayIST = (now) => istParts(now).date;
export const minutesNowIST = (now) => istParts(now).minutes;

export function timeNowIST(now) {
  const m = minutesNowIST(now);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const weekday = (iso) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export function isIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function prettyDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${weekday(iso).slice(0, 3)}, ${d.getUTCDate()} ${d.toLocaleString("en-IN", { month: "short", timeZone: "UTC" })}`;
}
