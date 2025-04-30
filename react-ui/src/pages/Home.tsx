import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HoraUsuarios } from "../types/types";
import styles from "../css/Home.module.css";
import { FaPlus, FaTrashAlt } from "react-icons/fa";
import { IconContext } from "react-icons";
import { motion } from "framer-motion";
import Font from "react-font";

import { useDeleteReserva } from "../hooks/useDeleteReserva";
import { useAddReserva } from "../hooks/useAddReserva";
import List from "../components/List";
import { fetchReservas } from "../hooks/api";
import UserSelectModal from "../components/AgregarUsuarioReservaModal";
import ConfirmModal from '../components/ConfirmModal';

export default function Home() {
  const [selectedUsuario, setSelectedUsuario] = useState<string | null>(null);
  const [modalHora, setModalHora] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const {
    data: reservas,
    isLoading,
    isError,
    error,
  } = useQuery<HoraUsuarios[]>({
    queryKey: ['reservas'],
    queryFn: fetchReservas,
    staleTime: 0,
  });

  const { mutate: deleteReserva } = useDeleteReserva();
  const { mutate: addReserva } = useAddReserva();

  const handleUsuarioClick = (usuario: string) => {
    setSelectedUsuario(usuario === selectedUsuario ? null : usuario);
  };

  const handleAddClick = (hora: string) => {
    setModalHora(hora);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); 
  };

  const handleCancelDelete = (nombre: string) => {
    setIsConfirmModalOpen(false);
    setUsuarioToDelete(null);
  };

  const handleConfirmDelete = (nombreHora: string) => {
    let nombre = nombreHora.split("-")[0];
    let hora = nombreHora.split("-")[1];
    console.log("nombre", nombre);
    console.log("hora", hora);
    deleteReserva(
          { hora, nombre },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["reservas"] });
              setIsConfirmModalOpen(false);
            },
            onError: (error) => {
              console.error("Error al eliminar usuario:", error);
            },
          }
        );
  };

  const handleDeleteClick = (hora: string, nombre: string) => {
    setUsuarioToDelete(nombre + "-" + hora);
    setIsConfirmModalOpen(true);
  };

  const handleSelectUsuario = (usuario: string) => {
    if (modalHora) {
      addReserva({ hora: modalHora, usuario });
      setModalHora(null);
      setIsModalOpen(false); 
    }
  };

  if (isLoading) return <div className={styles.loading}>Loading...</div>;
  if (isError) return <div className={styles.error}>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.fullPage}>
      <div className={styles.container}>
        <Font family="Bungee Inline">
          <h2>Reservas</h2>
        </Font>

        <List<HoraUsuarios>
          data={reservas || []}
          renderItem={(reserva: HoraUsuarios) => (
            <div key={reserva.hora}>
              <strong>{reserva.hora}</strong>
              <button
                onClick={() => handleAddClick(reserva.hora)}
                className={styles.iconButton}
                title="Add"
              >
                <IconContext.Provider value={{ color: "green" }}>
                  <div>
                    <FaPlus className={styles.iconButtonAdd} />
                  </div>
                </IconContext.Provider>
              </button>
              <ul className={styles.userList}>
                {reserva.usuarios.map((nombre, i) => (
                  <li key={i} className={styles.userItem}>
                    <span
                      onClick={
                        nombre === "No hay reservas"
                          ? undefined
                          : () => handleUsuarioClick(nombre)
                      }
                      className={`${styles.userName} ${
                        nombre === "No hay reservas" ? styles.disabledUser : ""
                      }`}
                    >
                      {nombre}
                    </span>
                    <motion.span
                      className={styles.iconButtons}
                      initial={false}
                      animate={
                        selectedUsuario === nombre
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.5 }
                      }
                      transition={{
                        duration: 0.25,
                        ease: [0.175, 0.885, 0.32, 1.275],
                      }}
                      style={{
                        pointerEvents:
                          selectedUsuario === nombre ? "auto" : "none",
                      }}
                    >
                      <button
                        onClick={() => handleDeleteClick(reserva.hora, nombre)}
                        className={styles.iconButton}
                        title="Delete"
                      >
                        <IconContext.Provider value={{ color: "red" }}>
                          <div>
                            <FaTrashAlt />
                          </div>
                        </IconContext.Provider>
                      </button>
                    </motion.span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        />

      </div>

 {isModalOpen && modalHora && (
        <UserSelectModal
          hora={modalHora}
          onClose={() => setIsModalOpen(false)}
          onSelect={handleSelectUsuario}
          existingUsuarios={reservas
            .find((reserva) => reserva.hora === modalHora)
            ?.usuarios.map((usuario) => usuario.nombre) || []}
        />
      )}

            {isConfirmModalOpen && (
            <ConfirmModal
                textoAConfirmar={`¿Está seguro de que desea eliminar la reserva ${usuarioToDelete}?`}
                onSelect={handleConfirmDelete}
                onClose={handleCancelDelete}
                value={usuarioToDelete}
            />
            )}
    </div>
  );
}
