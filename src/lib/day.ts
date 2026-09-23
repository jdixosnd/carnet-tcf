// Local day numbers, identical to the web app so backups stay compatible.
export function dayNum(d: Date = new Date()): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

/** A Date whose UTC fields are that local day's calendar date. */
export const dayToUTCDate = (day: number): Date => new Date(day * 86400000);

// Fixed English names: ICU month abbreviations vary ("Sept" in en-GB).
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "11 Sep" */
export function shortDate(day: number): string {
  const d = dayToUTCDate(day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** "Wed 17 Sep" */
export function weekdayDate(day: number): string {
  return `${WEEKDAYS[dayToUTCDate(day).getUTCDay()].slice(0, 3)} ${shortDate(day)}`;
}

/** "Wednesday 24 September" */
export function longDate(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
