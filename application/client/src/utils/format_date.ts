const dateFormatter = new Intl.DateTimeFormat("ja", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ja", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const relativeFormatter = new Intl.RelativeTimeFormat("ja", {
  numeric: "auto",
});

const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 30, unit: "days" },
  { amount: 12, unit: "months" },
  { amount: Infinity, unit: "years" },
];

export function formatDateJa(date: string): string {
  return dateFormatter.format(new Date(date));
}

export function formatTimeJa(date: string): string {
  return timeFormatter.format(new Date(date));
}

export function formatRelativeTimeJa(date: string): string {
  let duration = (new Date(date).getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return dateFormatter.format(new Date(date));
}
