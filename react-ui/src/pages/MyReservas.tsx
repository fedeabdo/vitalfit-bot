import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { HoraUsuarios } from "../types/types";
import styles from "../css/MyReservas.module.css";
import { FaPlus, FaTrashAlt } from "react-icons/fa";
import { BsArrowRepeat } from "react-icons/bs";
import { IconContext } from "react-icons";
import { motion } from "framer-motion";
import Font from "react-font";

import { useDeleteReserva } from "../hooks/useDeleteReserva";
import { useAddReserva } from "../hooks/useAddReserva";
import { useUserReservation } from "../hooks/useUserReservation";
import { useChangeReserva } from "../hooks/useChangeReserva";
import { fetchReservas } from "../hooks/api";

import List from "../components/List";
import ConfirmModal from '../components/ConfirmModal';
import DialogCloud from "../components/DialogCloud";
import EmojiBurst from "../components/EmojiBurst";


export default function MyReservas() {


  const dialogMessages = [
    "¡Esperamos torta!",
    "A mi tampoco me gustan las bulgaras :(",
    "No vale anotarse y no ir!",
    "Nando no me habilitó los días de licencia :(",
    "Yo sí tengo un alumno/a favorito...",
    "20 + 20 = 60 no?",
    "¿Sabías que Nando canta en la ducha?",
    "5 series de anotarse al fallo",
    "Nando me habilitó las cámaras para ver si realmente fuiste a entrenar O.O",
    "Adivino... 18:30?",
    "Qué bueno verte acá de nuevo!",
    "Recordá cancelar si no vas a ir :)",
    "No se cancela por lluvia :D",
    "Hay que entrenar mucho para ser MVP!",
    "No me clickees mucho que da cosquillas!",
    "Yo no sudo, brillo!",

  ];

    const shuffle = (arr: string[]) =>
  [...arr].sort(() => Math.random() - 0.5);

  const { name } = useAuth();
  const { data: userReservationHour } = useUserReservation();
  const [selectedUsuario, setSelectedUsuario] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogText, setDialogText] = useState<string | null>(null);
  const [queue, setQueue] = useState(() => shuffle(dialogMessages));
  const [showHeartDialog, setShowHeartDialog] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [isPopping, setIsPopping] = useState(false);


  const parseError = (errorMsg: string) => {
    errorMsg = errorMsg.replace('{"error":"', '');
    errorMsg = errorMsg.replace('"}', '');
    return errorMsg;
  }

  const getRandomMessage = () => {
    if (dialogMessages.length === 1) return dialogMessages[0];

    let next;
    do {
      next =
        dialogMessages[Math.floor(Math.random() * dialogMessages.length)];
    } while (next === dialogText);

    return next;
  };


  const getNextMessage = () => {
    setQueue(prev => {
      if (prev.length === 1) {
        return shuffle(dialogMessages);
      }
      return prev.slice(1);
    });

    return queue[0];
  };


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


  useEffect(() => {
  if (!isDialogOpen) return;

  const handleClickOutside = () => {
    setIsDialogOpen(false);
  };

  document.addEventListener("click", handleClickOutside);

  return () => {
    document.removeEventListener("click", handleClickOutside);
  };
}, [isDialogOpen]);



  const handleUsuarioClick = (usuario: string) => {
      setSelectedUsuario(usuario === name ? null : name);
    }

  const { mutate: deleteReserva } = useDeleteReserva();
  const { mutate: addReserva } = useAddReserva();
  const { mutate: changeReserva } = useChangeReserva();

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
          setTimeout(() => setAddError(''), 5000);
        },
      }
    );
  };

    const handleChangeClick = (hora: string) => {
    if (!name) {
      setAddError("No hay usuario autenticado");
      return;
    }

    changeReserva(
      { hora, usuario: name },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["reservas"] });
          setAddSuccess(true);
          setTimeout(() => setAddSuccess(false), 3000);
        },
        onError: (error) => {
          setAddError(error instanceof Error ? error.message : "Error al agregar reserva");
          setTimeout(() => setAddError(''), 5000);
        },
      }
    );
  };



  const isJosefina =
    name?.toLowerCase().trim() === "josefina barcelo";

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHeartDialog(prev => !prev);
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

  const handleHeadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    (e.nativeEvent as MouseEvent).stopImmediatePropagation();

    const explode = Math.random() < 0.06;

    setIsDialogOpen(true);
    setDialogText(getNextMessage());

    if (!explode) return;

  setTimeout(() => {
    setIsPopping(true);
  }, 450);

  setTimeout(() => {
    setIsDialogOpen(false);
    setIsPopping(false);
    setIsExploding(true);
  }, 550);

  setTimeout(() => {
    setIsExploding(false);
  }, 1300);
  };

  if (isLoading) return <div className={styles.loading}>Loading...</div>;
  if (isError) return <div className={styles.error}>Error: {(error as Error).message}</div>;

  return (
    <>
      <div className={styles.headWrapper}>
            <motion.button
              className={styles.iconBtn}
              onClick={handleHeadClick}
              title="Habla conmigo!"
              aria-label="Horacio"
              animate={{
                scale: isExploding ? [1, 1.15, 0.95, 1] : 1,
              }}
              transition={{
                duration: 0.65,          
                ease: [0.22, 1, 0.36, 1], 
                times: [0, 0.35, 0.7, 1], 
              }}
            >
            </motion.button>
          <span className={styles.mouthAnchor}>
          {isDialogOpen && (
            <div onClick={e => e.stopPropagation()}>
              <DialogCloud
                isOpen
                text={dialogText ?? ""}
                isPopping={isPopping}
              />
            </div>
          )}
            {isExploding && <EmojiBurst />}
          </span>
        </div>
    
      <main className={styles.fullPage}>
        <div className="leftColumn" style={{ position: "relative" }}>

        </div>


        <div className={styles.container}>
          <Font family="Lilita One"  >
            <h2>MIS RESERVAS</h2>
          </Font>

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
              ✗ {parseError(addError)}
            </div>
          )}
      
          <List<HoraUsuarios>
            data={reservas || []}
            renderItem={(reserva: HoraUsuarios) => {
              const isUserReserved = userReservationHour === reserva.hora;

              return (
                <div
                  key={reserva.hora}
                  style={{
                    backgroundColor: isUserReserved ? '#07ce3250' : 'transparent',
                    padding: '8px', // keep constant to avoid jump
                    borderRadius: '4px',
                    border: isUserReserved ? '2px solid #254e01ff' : '2px solid transparent',
                    width: '100%',
                  }}
                >
                  {/* GRID ROW */}
                  <div className={styles.listItemContent}>
                    {/* LEFT */}
                    <strong>{reserva.hora}</strong>

                    {/* CENTER (always rendered, opacity animated) */}
                    <motion.span
                      initial={false}
                      animate={{ opacity: isUserReserved ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={styles.reservado}
                    >
                      ✓ Reservado
                    </motion.span>

                    {/* RIGHT ACTIONS */}
                    <div className={styles.actions}>
                      {(!isUserReserved && userReservationHour === null || userReservationHour === undefined) && (
                        <button
                          onClick={() => handleAddClick(reserva.hora)}
                          className={styles.iconButton}
                          title="Agregar mi reserva"
                        >
                          <IconContext.Provider value={{ color: 'green' }}>
                            <FaPlus className={styles.iconButtonAdd} />
                          </IconContext.Provider>
                        </button>
                      )}
                      {(!isUserReserved && userReservationHour !== null && userReservationHour !== undefined) && (
                        <button
                          onClick={() => handleChangeClick(reserva.hora)}
                          className={styles.iconButton}
                          title="Cambiar mi reserva"
                        >
                          <IconContext.Provider value={{ color: 'orange' }}>
                            <BsArrowRepeat className={styles.iconButtonRepeat} />
                          </IconContext.Provider>
                        </button>
                      )}
                      {isUserReserved && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.2,
                            ease: 'easeOut',
                          }}
                          onClick={() => handleDeleteClick(reserva.hora, name)}
                          className={styles.iconButton}
                          title="Eliminar mi reserva"
                        >
                          <IconContext.Provider value={{ color: 'red' }}>
                            <FaTrashAlt />
                          </IconContext.Provider>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
            getHora={(reserva: HoraUsuarios) => reserva.hora}
          />

            {name && (
              <p className={styles.username} style={{ position: "relative" }}>
                {name}

              {isJosefina && (
                <>
                  <span
                    onClick={handleHeartClick}
                    style={{
                      marginLeft: "8px",
                      cursor: "pointer",
                      fontSize: "1.2em",
                    }}
                    title="Usuario especial"
                  >
                    <motion.span
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ❤️
                    </motion.span>
                  </span>

                  {showHeartDialog && (
                    <div style={{ position: "absolute", left: "0%", bottom: "0%" }}>
                      <DialogCloud
                        isOpen
                        text="⭐ Amiga del desarrollador"
                      />
                    </div>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        {isConfirmModalOpen && (
          <ConfirmModal
            textoAConfirmar={`¿Está seguro de que desea eliminar la reserva ${usuarioToDelete}?`}
            onSelect={handleConfirmDelete}
            onClose={handleCancelDelete}
            value={usuarioToDelete}
          />
        )}

      </main>
    </>
  );
}
