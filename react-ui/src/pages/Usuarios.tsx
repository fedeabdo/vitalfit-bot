import { Usuario } from '../types/types';

import { useQuery } from '@tanstack/react-query';
import { fetchUsuarios } from '../hooks/api';

import styles from "../css/Usuarios.module.css"
import Font from 'react-font'

import List from '../components/List';

export default function Usuarios(){
  const { data: usuarios, isLoading, isError, error } = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsuarios,
  });

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
        data={usuarios}
      />
    </div>
  </div>
  )
}