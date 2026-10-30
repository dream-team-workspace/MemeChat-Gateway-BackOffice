// Activity logs are partitioned by the gateway's local calendar day and use
// dd_mm_yyyy in the admin API. The browser date input uses yyyy-mm-dd.
const INPUT_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Today in the browser's local time, in the native date-input format. */
export function todayDateInput() {
  const now = new Date();
  return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
}

/** Convert yyyy-mm-dd to the gateway's dd_mm_yyyy. Invalid input returns undefined. */
export function dateInputToApiDate(value: string) {
  if (!INPUT_DATE.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  return pad(day) + "_" + pad(month) + "_" + year;
}
/** A complete, current-era date the activity API can use. Partial typing is rejected. */
export function isUsableDateInput(value: string) {
  const year = Number(value.slice(0, 4));
  const currentYear = new Date().getFullYear();
  return (
    dateInputToApiDate(value) !== undefined &&
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= currentYear
  );
}
