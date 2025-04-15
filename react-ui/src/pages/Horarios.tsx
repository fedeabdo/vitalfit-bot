import styles from '../css/Horarios.module.css'
import { HorarioJson } from '../types/types';
import Font from 'react-font'
import { IconContext } from 'react-icons';
import { FaEdit } from 'react-icons/fa';

import { fetchHorarios } from '../hooks/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import HorariosEditModal from '../components/HorariosEditModal'
import List from '../components/List';
import { useEditHorario } from '../hooks/useEditHorario';


export default function Horarios() {
    const { data: horarios, isLoading, isError, error } = useQuery({
        queryKey: ["horarios"],
        queryFn: fetchHorarios,
    });

    const [modalData, setModalData] = useState<HorarioJson | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const {mutate: editHorario } = useEditHorario();


    function handleEditClick (horario: HorarioJson) {
        setModalData(horario);
        setIsModalOpen(true);
    }

    return (
        <div className={styles.fullPage}>
            <div className={styles.container}>
                <Font family='Bungee Inline'>
                    <h2>Horarios</h2>
                </Font>
                <List<HorarioJson>
                    renderItem={(horario: HorarioJson) => (
                        <div>
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
                        </div>
                    )}
                    data={horarios!}
                />
            </div>

            {isModalOpen && modalData && (
                <HorariosEditModal
                    data={modalData}
                    onSelect={() => {

                    }}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    )
}