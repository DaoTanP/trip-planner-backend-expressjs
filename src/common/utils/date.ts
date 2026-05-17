export const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

export const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
