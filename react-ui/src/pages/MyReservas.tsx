import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { HoraUsuarios } from "../types/types";
import styles from "../css/Home.module.css";
import { FaPlus, FaTrashAlt } from "react-icons/fa";
import { IconContext } from "react-icons";
import { motion } from "framer-motion";
import Font from "react-font";

import { useDeleteReserva } from "../hooks/useDeleteReserva";
import { useAddReserva } from "../hooks/useAddReserva";
import { useUserReservation } from "../hooks/useUserReservation";
import List from "../components/List";
import { fetchReservas } from "../hooks/api";
import ConfirmModal from '../components/ConfirmModal';

export default function MyReservas() {
  const { name } = useAuth();
  const { data: userReservationHour } = useUserReservation();
  const [selectedUsuario, setSelectedUsuario] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');

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

  const handleUsuarioClick = (usuario: string) => {
      setSelectedUsuario(usuario === name ? null : name);
    }

  const { mutate: deleteReserva } = useDeleteReserva();
  const { mutate: addReserva } = useAddReserva();

  const handleAddClick = (hora: string) => {
    if (!name) {
      setAddError("No hay usuario autenticado");
      return;
    }
    
    // Automatically add the logged-in user
    addReserva(
      { hora, usuario: name },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["reservas"] });
          setAddSuccess(true);
          setTimeout(() => setAddSuccess(false), 3000);
        },
        onError: (error) => {
          setAddError(error instanceof Error ? error.message : "Error al agregar reserva");
          setTimeout(() => setAddError(''), 3000);
        },
      }
    );
  };

  const handleCancelDelete = () => {
    setIsConfirmModalOpen(false);
    setUsuarioToDelete(null);
  };

  const handleConfirmDelete = (nombreHora: string | null) => {
    if (!nombreHora) return;
    let nombre = nombreHora.split("-")[0];
    let hora = nombreHora.split("-")[1];
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

  const handleDeleteClick = (hora: string, name: string) => {
    setUsuarioToDelete(name + "-" + hora);
    setIsConfirmModalOpen(true);
  };


  if (isLoading) return <div className={styles.loading}>Loading...</div>;
  if (isError) return <div className={styles.error}>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.fullPage}>
      <div className="leftColumn">
        <button className={styles.iconBtn} ></button>
      </div>

      <div className={styles.container}>
        <Font family="Bungee Inline">
          <h2>Mis Reservas</h2>
        </Font>
        {name && (
          <p style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
            Usuario: <strong>{name}</strong>
          </p>
        )}

        {userReservationHour && (
          <p style={{
            marginBottom: '20px',
            textAlign: 'center',
            color: '#2e7d32',
            fontWeight: 'bold',
            fontSize: '1.1em',
            padding: '10px',
            backgroundColor: '#e8f5e9',
            borderRadius: '4px'
          }}>
            Tu reserva: <span style={{ fontSize: '1.2em' }}>{userReservationHour}</span>
          </p>
        )}

        {addSuccess && (
          <div style={{
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            ✓ Reserva agregada correctamente
          </div>
        )}

        {addError && (
          <div style={{
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            ✗ {addError}
          </div>
        )}

        

        <List<HoraUsuarios>
          data={reservas || []}
          renderItem={(reserva: HoraUsuarios) => {
            const isUserReserved = userReservationHour === reserva.hora;
            return (
            <div key={reserva.hora} style={{
              backgroundColor: isUserReserved ? '#07ce3250' : 'transparent',
              padding: isUserReserved ? '8px' : '0',
              borderRadius: isUserReserved ? '4px' : '0',
              border: isUserReserved ? '2px solid #254e01ff' : 'none',
              width: '100%',
            }}>
              <strong>{reserva.hora}</strong>
              {isUserReserved && <span style={{ marginLeft: '10px', color: '#423838ff', fontWeight: 'bold' }}>✓ Reservado</span>}
              <button
                onClick={() => handleAddClick(reserva.hora)}
                className={styles.iconButton}
                title="Agregar mi reserva"
              >
                <IconContext.Provider value={{ color: "green" }}>
                  <div>
                    <FaPlus className={styles.iconButtonAdd} />
                  </div>
                </IconContext.Provider>
              </button>
              {/* Names list hidden - keep only add/delete functionality */}
              {name && (
                <motion.span
                  className={styles.iconButtons}
                  initial={false}
                  animate={
                    selectedUsuario === name
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.5 }
                  }
                  transition={{
                    duration: 0.25,
                    ease: [0.175, 0.885, 0.32, 1.275],
                  }}
                  style={{
                    pointerEvents:
                      selectedUsuario === name ? "auto" : "none",
                  }}
                >
                  <button
                    onClick={() => handleDeleteClick(reserva.hora, name)}
                    className={styles.iconButton}
                    title="Eliminar mi reserva"
                  >
                    <IconContext.Provider value={{ color: "red" }}>
                      <div>
                        <FaTrashAlt />
                      </div>
                    </IconContext.Provider>
                  </button>
                </motion.span>
              )}
            </div>
            );
          }}
          getHora={(reserva: HoraUsuarios) => reserva.hora}
        />

      </div>

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
