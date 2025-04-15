import { useQuery } from "@tanstack/react-query";
import { fetchUsuarios } from "../hooks/api"; 
import { useAddReserva } from "../hooks/useAddReserva"; 
import styles from "../css/ModalReservas.module.css"; 
import {useState} from "react";

import Font from 'react-font';

interface UserSelectModalProps {
  hora: string;
  onClose: () => void; 
  onSelect: (usuario: string) => void; 
  existingUsuarios: string[]; 
}

const UserSelectModal = ({ hora, onClose, onSelect, existingUsuarios }: UserSelectModalProps) => {
  const { data: usuarios, isLoading, isError, error } = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsuarios,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutateAsync: addReserva, isLoading: isMutating } = useAddReserva();


  const handleUserSelect = async (usuario: string) => {
    try {
      await addReserva({ hora, usuario });
      onSelect(usuario);
      onClose();
    } catch (error) {
      setErrorMsg((error as Error).message);
    }
  };
      
  if (isLoading) return <div>Loading users...</div>;
  if (isError) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.modalOverlay}>
      {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
      <div className={styles.modalWrapper}>
        <div className={styles.modalContent}>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
          <Font family='Bungee Inline'>
            <h2 >Reserva a un usuario:</h2>
          </Font>
          <ul className={styles.userList}>
            {usuarios
            ?.sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((usuario) => (
                <li key={usuario.nombre} className={styles.modalUserItem}>
                <button
                  onClick={() => handleUserSelect(usuario.nombre)}
                  className={styles.modalUserItemButton}
                  disabled={isMutating || existingUsuarios.includes(usuario.nombre)}
                >
                  {usuario.nombre}
                </button>
                </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserSelectModal;
