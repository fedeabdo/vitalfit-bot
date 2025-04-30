import { useQuery } from "@tanstack/react-query";
import { fetchUsuarios } from "../hooks/api";
import styles from "../css/ModalUsuarios.module.css";
import { useState } from "react";
import Font from "react-font";
import { Usuario } from "../types/types";

interface UsuarioSelectorModalProps {
  onClose: () => void;
  onSelect: (usuario: string) => void;
  existingUsuarios: string[];
}

const UsuarioSelectorModal = ({
  onClose,
  onSelect,
  existingUsuarios,
}: UsuarioSelectorModalProps) => {
  const { data: usuarios, isLoading, isError, error } = useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: fetchUsuarios,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUserClick = (usuario: string) => {
    onSelect(usuario);
    onClose();
  };

  if (isLoading) return <div>Cargando usuarios...</div>;
  if (isError) return <div>Error: {(error as Error).message}</div>;

  const filteredUsuarios = usuarios?.filter(
    (u) => !existingUsuarios.includes(u.nombre)
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.fullPage}>
        <div className={styles.container}>
          <Font family="Bungee Inline">
              <h2>Selecciona un usuario:</h2>
            </Font>
        <div className={styles.modalWrapper}>
          <div className={styles.modalContent}>
            <button onClick={onClose} className={styles.closeButton}>×</button>

            {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}

            <ul className={styles.userList}>
              {filteredUsuarios?.length ? (
                filteredUsuarios
                  .sort((a, b) => a.nombre.localeCompare(b.nombre))
                  .map((usuario) => (
                    <li key={usuario.nombre} className={styles.modalUserItem}>
                      <button
                        onClick={() => handleUserClick(usuario.nombre)}
                        className={styles.modalUserItemButton}
                      >
                        {usuario.nombre}
                      </button>
                    </li>
                  ))
              ) : (
                <li>No hay usuarios disponibles para agregar.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default UsuarioSelectorModal;
