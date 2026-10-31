export const defaultRefreshMinutes = 5;

export function parseRefreshMinutes(value: string): number {
  const minutes = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(minutes) || minutes < 1) {
    throw new Error("Vul een geheel aantal minuten van minimaal 1 in.");
  }
  return minutes;
}

export function refreshDue(lastUpdated: number, now: number, minutes: number): boolean {
  return (now - lastUpdated) / 60_000 >= minutes;
}
