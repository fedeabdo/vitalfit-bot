import { useLoaderData } from 'react-router-dom';
import { Reserva } from '../types/types';
import styles from '../css/Home.module.css';

import List from '../components/List';

export default function Home() {
  // Use the useLoaderData hook to get the data loaded by reservasLoader
  const reservas = useLoaderData() as Reserva[];

  return (
  <div className={styles.fullPage}>
    <div className={styles.container}>
      <h2>Reservas</h2>
      <List<Reserva>
        renderItem={(reserva: Reserva) => (
          <div>
            <strong>{reserva.hora}</strong> - {reserva.usuario}
          </div>
        )}
        data={reservas}
      />
    </div>
  </div>

  );
}