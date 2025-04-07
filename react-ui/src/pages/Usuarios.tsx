import { useLoaderData } from 'react-router-dom';
import { Usuario } from '../types/types';
import styles from "../css/Usuarios.module.css"

import List from '../components/List';

export default function Usuarios(){
    const reservas = useLoaderData() as Usuario[];


    return (
    <div className={styles.fullPage}>
        <div className={styles.container}>
        <h2>Usuarios</h2>
        <List<Usuario>
          renderItem={(usuario: Usuario) => (
            <div>
              <strong>{usuario.nombre}</strong> - {usuario.ci}
            </div>
          )}
          data={reservas}
        />
      </div>
    </div>
    )
}