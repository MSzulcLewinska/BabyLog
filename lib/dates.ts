export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonthYear(date: Date): string {
  const text = date.toLocaleDateString('pl-PL', {
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const weekday = next.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + mondayOffset);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function lastNDates(days: number, from = new Date()): string[] {
  return Array.from({ length: days }, (_, index) =>
    toDateKey(addDays(from, index - (days - 1)))
  );
}

export function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstWeekdayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = Array.from(
    { length: firstWeekdayOffset },
    () => null
  );
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return few;
  }
  return many;
}

export function formatChildAge(
  birthDateKey: string,
  reference: Date = new Date()
): string {
  const birth = parseDateKey(birthDateKey);
  const today = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  );

  if (today.getTime() < birth.getTime()) {
    return '';
  }

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years >= 1) {
    const yearLabel = `${years} ${plural(years, 'rok', 'lata', 'lat')}`;
    return months > 0 ? `${yearLabel} i ${months} mies.` : yearLabel;
  }

  if (months >= 1) {
    return `${months} ${plural(months, 'miesiąc', 'miesiące', 'miesięcy')}`;
  }

  const days = Math.floor((today.getTime() - birth.getTime()) / DAY_MS);

  if (days < 7) {
    return days === 0 ? 'noworodek' : `${days} ${plural(days, 'dzień', 'dni', 'dni')}`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks} ${plural(weeks, 'tydzień', 'tygodnie', 'tygodni')}`;
}
