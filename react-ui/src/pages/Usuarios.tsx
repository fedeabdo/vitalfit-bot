import { Usuario } from '../types/types';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchUsuarios } from '../hooks/api';
import { useDeleteUsuario } from '../hooks/useDeleteUsuario';
import { useSyncUsuarios } from "../hooks/useSyncUsuarios";


import styles from "../css/Usuarios.module.css";
import Font from 'react-font';
import { IconContext } from 'react-icons';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';

import { useAddUsuario } from '../hooks/useAddUsuario';
import List from '../components/List';
import AddUserModal from "../components/AddUserModal";
import ConfirmModal from '../components/ConfirmModal';


export default function Usuarios() {
  const queryClient = useQueryClient();
  const { data: usuarios, isLoading, isError, error } = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsuarios,
  });

  const { mutate: deleteUsuario } = useDeleteUsuario();
  const {mutate: addUsuario} = useAddUsuario();
  const { mutate: syncUsuarios, isPending: isSyncing } = useSyncUsuarios();
  const [selectedUsuario, setSelectedUsuario] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<string | null>(null);


  const handleDeleteClick = (nombre: string | null) => {
    setUsuarioToDelete(nombre);
    setIsConfirmModalOpen(true);
  }

  const handleConfirmDelete = (nombre: string) => {
    deleteUsuario(
      { nombre },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["usuarios"] });
          setIsConfirmModalOpen(false);
        },
        onError: (error) => {
          console.error("Error al eliminar usuario:", error);
        },
      }
    );
  };

  const handleCancelDelete = (nombre: string) => {
    setIsConfirmModalOpen(false);
    setUsuarioToDelete(null);
  };

  const handleUsuarioClick = (nombre: string) => {
    setSelectedUsuario((prev) => (prev === nombre ? null : nombre));
  };

  const handleAddUserClick = () => {
    setIsModalOpen(true);
  };

  const handleAddUserSubmit = (nombre: string, ci: string) => {
    addUsuario(
      { nombre, ci },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["usuarios"] });
          setIsModalOpen(false);
        },
        onError: (error) => {
          console.error("Error al agregar usuario:", error);
        },
      }
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.fullPage}>
      <div className={styles.container}>
        <Font family="Lilita One">
          <div className={styles.header}>
            <h2>USUARIOS</h2>
            <button
              className={styles.iconButtonAdd}
              title="Add User"
              onClick={handleAddUserClick}
            >
              <IconContext.Provider value={{ color: "green", size: "1.5em" }}>
                <FaPlus />
              </IconContext.Provider>
            </button>
          </div>
        </Font>
        <List<Usuario>
          data={usuarios || []}
          onClick={(usuario) => handleUsuarioClick(usuario.nombre)}
          renderItem={(usuario: Usuario) => (
            <div className={styles.userItem}>
              <strong>{usuario.nombre}</strong>
              <motion.div
                className={styles.iconButtons}
                initial={false}
                animate={
                  selectedUsuario === usuario.nombre
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.5 }
                }
                transition={{
                  duration: 0.25,
                  ease: [0.175, 0.885, 0.32, 1.275],
                }}
                style={{
                  display: "inline-block",
                  pointerEvents: selectedUsuario === usuario.nombre ? "auto" : "none",
                }}
              >
                <button
                  onClick={() => handleDeleteClick(usuario.nombre)}
                  className={styles.iconButton}
                  title="Delete"
                >
                  <IconContext.Provider value={{ color: "red" }}>
                    <FaTrash />
                  </IconContext.Provider>
                </button>
              </motion.div>
            </div>
          )}
          getHora={(usuario: Usuario) => ""}
        />
      </div>
      {isModalOpen && (
        <AddUserModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddUserSubmit}
        />
      )}

      {isConfirmModalOpen && (
      <ConfirmModal
          textoAConfirmar={`¿Está seguro de que desea eliminar al usuario ${usuarioToDelete}?`}
          onSelect={handleConfirmDelete}
          onClose={handleCancelDelete}
          value={usuarioToDelete}
      />
      )}

      <button
        className={`${styles.syncButton} ${isSyncing ? styles.loading : ""}`}
        onClick={() => syncUsuarios()}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <span className={styles.spinner} />
        ) : (
          "Sincronizar usuarios"
        )}
      </button>
      {isSyncing && <div className={styles.overlay}>Sincronizando usuarios…</div>}


    </div>
  );
}