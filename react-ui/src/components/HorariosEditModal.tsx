import styles from "../css/HorariosEditModal.module.css";
import { useState } from "react";
import Font from 'react-font';
import { useEditHorario } from "../hooks/useEditHorario";
import { useQuery } from "@tanstack/react-query";
import { fetchUsuarios } from '../hooks/api';
import { HorarioJson, Usuario, UpdateHorarioPayload } from "../types/types";
import UsuarioSelectModal from "./UsuarioSelectModal";
import { motion } from "framer-motion";

interface HorariosEditModalProps {
  data: HorarioJson;
  onClose: () => void;
  onSelect: (diaHora: string) => void;
}

const HorariosEditModal = ({ data, onClose, onSelect }: HorariosEditModalProps) => {
  const [usuarios, setUsuarios] = useState<string[]>(data.usuarios);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const { mutateAsync: updateHorario, isLoading: isMutating } = useEditHorario();

  const { data: validUsuariosData } = useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: fetchUsuarios,
  });

  const handleAddUser = (usuario: string) => {
    if (!usuarios.includes(usuario)) {
      setUsuarios((prev) => [...prev, usuario]);
    }
  };

  const handleRemoveUser = (usuario: string) => {
    setUsuarios((prev) => prev.filter((u) => u !== usuario));
  };

  const handleSave = async () => {
    try {
      const horario: UpdateHorarioPayload = {
        [data.diaHora]: usuarios,
      };
      await updateHorario(horario);
      onSelect(data.diaHora);
      onClose();
    } catch (error) {
      setErrorMsg((error as Error).message);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.container}>
        <Font family="Bungee Inline">
          <h1>Modifica el horario:</h1>
          <h2>{data.diaHora}</h2>
        </Font>
        <div className={styles.modalWrapper}>
          <div className={styles.modalContent}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
            <ul className={styles.userList}>
              {usuarios.map((usuario, index) => (
                <motion.li
                  key={index}
                  className={styles.modalUserItem}
                  onClick={() => handleRemoveUser(usuario)}
                  title="Haz clic para eliminar"
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: "#FBB900",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <Font family="Lexend">
                    {usuario} <p className={styles.crossAfterName}>[x]</p>
                  </Font>
                </motion.li>
              ))}
            </ul>
            <div className={styles.modalButtonContainer}>
              <button
                onClick={() => setIsUserModalOpen(true)}
                className={styles.modalButtonEdit}
              >
                <Font family="Lexend">Añadir Usuario</Font>
              </button>
              <button
                onClick={handleSave}
                className={styles.modalButtonEdit}
                disabled={isMutating}
              >
                <Font family="Lexend">Guardar cambios</Font>
              </button>
            </div>
            {isUserModalOpen && (
              <UsuarioSelectModal
                hora={data.diaHora}
                onClose={() => setIsUserModalOpen(false)}
                onSelect={handleAddUser}
                existingUsuarios={usuarios}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorariosEditModal;
