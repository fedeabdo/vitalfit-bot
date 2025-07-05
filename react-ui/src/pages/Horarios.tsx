import styles from '../css/Horarios.module.css';
import { DeleteHorarioPayload, HorarioJson, tiempo } from '../types/types';
import Font from 'react-font';
import { IconContext } from 'react-icons';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';

import { fetchHorarios } from '../hooks/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import HorariosEditModal from '../components/HorariosEditModal';
import List from '../components/List';
import { useDeleteHorario } from '../hooks/useDeleteHorario';
import ConfirmModal from '../components/ConfirmModal';
import AddHorarioModal from '../components/AddHorarioModal';
import { useAddHorario } from '../hooks/useAddHorario';
import { useEditHorario } from '../hooks/useEditHorario';

const daysOrder = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function Horarios() {
    const { data: horarios, isLoading, isError, error } = useQuery({
        queryKey: ["horarios"],
        queryFn: fetchHorarios,
    });

    const [modalData, setModalData] = useState<HorarioJson | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHorario, setSelectedHorario] = useState<string | null>(null); 
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [horarioToDelete, setHorarioToDelete] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { mutate: deleteHorario } = useDeleteHorario();
    const { mutateAsync: addHorario } = useAddHorario();
    const { mutate: editHorario } = useEditHorario();

    function handleEditClick(horario: HorarioJson) {
        setModalData(horario);
        setIsModalOpen(true);
    }

    const handleDeleteClick = (hora: string) => {
        setHorarioToDelete(hora);
        setIsConfirmModalOpen(true);
      };

      const handleConfirmDelete = (hora: string | null) => {
        if (!hora) {
          console.error("No horario selected for deletion");
          return;
        }
        const horarioABorrar: DeleteHorarioPayload = { horario: hora as tiempo };
        deleteHorario(horarioABorrar);
        setIsConfirmModalOpen(false);
      };

    const handleCancelDelete = () => {
        setIsConfirmModalOpen(false);
        setHorarioToDelete(null); 
    }

    const handleHorarioClick = (hora: string) => {
        setSelectedHorario(hora === selectedHorario ? null : hora);
    };

    const handleAddHorarioClick = () => {
        setIsAddModalOpen(true);
    };

    const handleAddHorarioSubmit = async (diaHora: string, usuarios: string[]) => {
        return addHorario({ diaHora, usuarios });
    };

    const handleEditHorarioSubmit = (diaHora: string, usuarios: string[]) => {
        return new Promise<void>((resolve, reject) => {
          editHorario(
            { diaHora, usuarios },
            {
              onSuccess: () => resolve(),
              onError: (error: any) => reject(error),
            }
          );
        });
      };

    const sortedHorarios = (horarios ?? []).slice().sort((a, b) => {
        const [dayA, hourA] = a.diaHora.split("-");
        const [dayB, hourB] = b.diaHora.split("-");
        const dayIndexA = daysOrder.indexOf(dayA);
        const dayIndexB = daysOrder.indexOf(dayB);
  
        if (dayIndexA !== dayIndexB) {
          return dayIndexA - dayIndexB;
        }
        const [hA, mA] = hourA.split(":").map(Number);
        const [hB, mB] = hourB.split(":").map(Number);
        return hA !== hB ? hA - hB : mA - mB;
      });

    return (
        <div className={styles.fullPage}>
            <div className={styles.container}>
                <Font family="Bungee Inline">
                    <div className={styles.header}>
                        <h2>Horarios</h2>
                        <button
                            className={styles.iconButtonAdd}
                            title="Agregar Horario"
                            onClick={handleAddHorarioClick}
                        >
                            <IconContext.Provider value={{ color: "green", size: "1.5em" }}>
                                <FaPlus />
                            </IconContext.Provider>
                        </button>
                    </div>
                </Font>
                <List<HorarioJson>
                    renderItem={(horario: HorarioJson) => (
                        <div
                            className={styles.listItem}
                            onClick={() => handleHorarioClick(horario.diaHora)}
                        >
                            <button
                                onClick={() => handleEditClick(horario)}
                                className={styles.iconButton}
                                title="Edit"
                            >
                                <IconContext.Provider value={{ color: "green" }}>
                                    <div>
                                        <FaEdit />
                                    </div>
                                </IconContext.Provider>
                            </button>
                            <strong>{horario.diaHora}</strong> - {horario.usuarios.join(', ')}
                            <motion.div
                                className={styles.iconButtons}
                                initial={false}
                                animate={
                                    selectedHorario === horario.diaHora
                                        ? { opacity: 1, scale: 1 }
                                        : { opacity: 0, scale: 0.5 }
                                }
                                transition={{
                                    duration: 0.25,
                                    ease: [0.175, 0.885, 0.32, 1.275],
                                }}
                                style={{
                                    display: "inline-block",
                                    pointerEvents: selectedHorario === horario.diaHora ? "auto" : "none",
                                }}
                            >
                                <button
                                    onClick={() => handleDeleteClick(horario.diaHora)}
                                    className={styles.iconButton}
                                    title="Delete"
                                >
                                    <IconContext.Provider value={{ color: "red" }}>
                                        <div>
                                            <FaTrash />
                                        </div>
                                    </IconContext.Provider>
                                </button>
                            </motion.div>
                        </div>
                    )}
                    data={sortedHorarios}
                />
            </div>

            {isModalOpen && modalData && (
                <HorariosEditModal
                    data={modalData}
                    onSelect={() => {}}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {isAddModalOpen && (
                <AddHorarioModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={handleAddHorarioSubmit}
                />
            )}

            {isConfirmModalOpen && (
            <ConfirmModal
                textoAConfirmar="¿Está seguro de que desea eliminar este horario?"
                onSelect={handleConfirmDelete}
                onClose={handleCancelDelete}
                value={horarioToDelete}
            />
            )}
        </div>
    );
}