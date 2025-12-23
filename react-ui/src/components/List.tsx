import { QueryClient } from '@tanstack/react-query';
import { fetchReservas } from '../hooks/api'
import { HoraUsuarios, Reserva, HorarioJson } from '../types/types';
import React from 'react';
import styles from '../css/List.module.css';
import Font from 'react-font';

import  ListItem  from './ListItem';

interface ListProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  getHora: (item: T) => string;
  onClick?: (item: T) => void;
}

function List<T>({ data, renderItem, getHora, onClick }: ListProps<T>) {
  if (!data || data.length === 0) {
    return <div className={styles.empty}>No data available.</div>;
  }

  

  return (
    <Font family="Lexend">
      <ul className={`${styles.list} ${styles.scrollable}`}>
        {data.map((item, index) => (
          <ListItem
            key={index}
            item={item}
            hora={getHora(item)}
            renderItem={renderItem}
            onClick={onClick}
          />
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
  const response = await fetch('http://5.161.43.130:5100/api/usuarios');
  if (!response.ok) {
    throw new Response("Failed to fetch usuarios", { status: response.status });
  }
  const users = await response.json();
  return users;
};

export const horariosLoader = async (): Promise<HorarioJson[]> => {
  const response = await fetch('http://5.161.43.130:5100/api/horarios');
  const data: Record<string, string[]> = await response.json();

  return Object.entries(data).map(([diaHora, usuarios]) => ({
    diaHora,
    usuarios: usuarios.length > 0 ? usuarios : ["No hay usuarios"],
  }));
};



