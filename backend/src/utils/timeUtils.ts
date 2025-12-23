export function esMasDeLas2030(): boolean {
  const now = new Date();
  return now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30);
}

export function esDomingoALas13(): boolean {
  const now = new Date();
  return now.getDay() === 0 && (now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() > 0));
}


export function faltanMasDe4Horas(hora: string): boolean {
  const now = new Date();
  const [horaStr, minutoStr] = hora.split(':');
  const reservaDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(horaStr), parseInt(minutoStr));
  if (esMasDeLas2030() || esDomingoALas13()){
     reservaDate.setDate(reservaDate.getDate() + 1);
  }

  const diffInMs = reservaDate.getTime() - now.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  return diffInHours > 4;
}