import { QueryClient } from '@tanstack/react-query';
import { fetchReservas } from '../hooks/api'
import { HoraUsuarios, Reserva, HorarioJson } from '../types/types';
import React from 'react';
import styles from '../css/List.module.css';
import Font from 'react-font';

interface ListProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  onClick?: (item: T) => void;
}

function List<T>({ data, renderItem, onClick }: ListProps<T>) {
  if (!data || data.length === 0) {
    return <div className={styles.empty}>No data available.</div>;
  }

  return (
    <Font family='Lexend'>
      <ul className={styles.list}>
        {data.map((item, index) => (
          <li key={index} onClick={() => onClick?.(item)} className={styles.listItem}>
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </Font>
  );
}

export default List;

// Update the reservasLoader to use fetchReservas.
export const reservasLoader = (queryClient: QueryClient) => async () => {
  return queryClient.ensureQueryData({
    queryKey: ['reservas'],
    queryFn: fetchReservas,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

export const usuariosLoader = async () => {
  const response = await fetch('http://localhost:5100/api/usuarios');
  if (!response.ok) {
    throw new Response("Failed to fetch usuarios", { status: response.status });
  }
  const users = await response.json();
  return users;
};

export const horariosLoader = async (): Promise<HorarioJson[]> => {
  const response = await fetch('http://localhost:5100/api/horarios');
  const data: Record<string, string[]> = await response.json();

  return Object.entries(data).map(([diaHora, usuarios]) => ({
    diaHora,
    usuarios: usuarios.length > 0 ? usuarios : ["No hay usuarios"],
  }));
};
