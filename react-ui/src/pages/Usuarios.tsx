import { useLoaderData } from 'react-router-dom';
import { Usuario } from '../types/types';
import styles from "../css/Usuarios.module.css"
import Font from 'react-font'

import List from '../components/List';

export default function Usuarios(){
    const reservas = useLoaderData() as Usuario[];


    return (
    <div className={styles.fullPage}>
        <div className={styles.container}>
          <Font family='Bungee Inline'>
            <h2>Usuarios</h2>
          </Font>
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