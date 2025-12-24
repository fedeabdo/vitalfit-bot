import { Reserva, HorarioJson } from "../types/types";
import { fetchWithAuth } from "./fetchWithAuth";

type ReservasAPIResponse = Record<string, Reserva[]>;

export async function fetchReservas() {
  const res = await fetchWithAuth('https://vitalfit.uy/api/reservas');
  if (!res.ok) throw new Error('Failed to fetch');
  const data: ReservasAPIResponse = await res.json();

  return Object.entries(data).map(([hora, reservasPorHora]) => {
    const usuarios = reservasPorHora.map(r => r.usuario);
    return { hora, usuarios: usuarios.length ? usuarios : ['No hay reservas'] };
  });
}

export const fetchUsuarios = async () => {
  const response = await fetchWithAuth("https://vitalfit.uy/api/usuarios");

  if (!response.ok) {
    throw new Error("Failed to fetch usuarios");
  }

  const data = await response.json();

  if (Array.isArray(data) && typeof data[0] === 'object' && 'nombre' in data[0]) {
    return data.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }


  throw new Error("Unexpected data format");
};

export const fetchHorarios = async (): Promise<HorarioJson[]> => {
  const response = await fetchWithAuth('https://vitalfit.uy/api/horarios');
  const data: Record<string, string[]> = await response.json();

  return Object.entries(data).map(([diaHora, usuarios]) => ({
    diaHora,
    usuarios: usuarios.length > 0 ? usuarios : ["No hay usuarios"],
  }));
};
