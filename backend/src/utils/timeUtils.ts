export function esMasDeLas2030(): boolean {
  const now = new Date();
  return now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30);
}

export function esDomingoALas13(): boolean {
  const now = new Date();
  return now.getDay() === 0 && (now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() > 0));
}