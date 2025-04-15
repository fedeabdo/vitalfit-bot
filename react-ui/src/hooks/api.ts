import { Reserva, HorarioJson } from "../types/types";

type ReservasAPIResponse = Record<string, Reserva[]>;

export async function fetchReservas() {
  const res = await fetch('http://localhost:5100/api/reservas');
  if (!res.ok) throw new Error('Failed to fetch');
  const data: ReservasAPIResponse = await res.json();

  return Object.entries(data).map(([hora, reservasPorHora]) => {
    const usuarios = reservasPorHora.map(r => r.usuario);
    return { hora, usuarios: usuarios.length ? usuarios : ['No hay reservas'] };
  });
}

export const fetchUsuarios = async () => {
    const response = await fetch("http://localhost:5100/api/usuarios");

    if (!response.ok) {
      throw new Error("Failed to fetch usuarios");
    }
  
    const data = await response.json();
    return data;
  };


export const fetchHorarios = async (): Promise<HorarioJson[]> => {
  const response = await fetch('http://localhost:5100/api/horarios');
  const data: Record<string, string[]> = await response.json();

  return Object.entries(data).map(([diaHora, usuarios]) => ({
    diaHora,
    usuarios: usuarios.length > 0 ? usuarios : ["No hay usuarios"],
  }));
};
