import React from 'react';
import { Reserva, HorarioJson} from '../types/types';
import styles from '../css/List.module.css';

interface ListProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
}

type ReservasAPIResponse = Record<string, Reserva[]>;


function List<T>({ data, renderItem }: ListProps<T>) {
  if (!data || data.length === 0) {
    return <div className={styles.empty}>No data available.</div>;
  }

  return (
    <ul className={styles.list}>
      {data.map((item, index) => (
        <li key={index} className={styles.listItem}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

export default List;
export const reservasLoader = async (): Promise<Reserva[]> => {
    const response = await fetch('http://localhost:5100/api/reservas');
    const data: ReservasAPIResponse = await response.json();

    const reservas: Reserva[] = Object.entries(data).flatMap(
      ([hora, reservasPorHora]) =>
        reservasPorHora.length > 0
          ? reservasPorHora.map((r: any) => ({
              hora,
              usuario: r.usuario
            }))
          : [{ hora, usuario: 'No hay reservas' }]
    );

    return reservas;
}


export const usuariosLoader = async () => {
    const response = await fetch('http://localhost:5100/api/usuarios');

    if (!response.ok) {
        throw new Response("Failed to fetch usuarios", { status: response.status });
    }

    const users = await response.json();
    return users;
}

export const horariosLoader = async (): Promise<HorarioJson[]> => {
  const response = await fetch('http://localhost:5100/api/horarios');
  const data: Record<string, string[]> = await response.json();

  return Object.entries(data).map(([diaHora, usuarios]) => ({
    diaHora, 
    usuarios: usuarios.length > 0 
      ? usuarios 
      : ["No hay usuarios"]
  }));
};