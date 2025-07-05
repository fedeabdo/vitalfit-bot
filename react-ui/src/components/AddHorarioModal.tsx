import { useState } from "react";
import styles from "../css/HorariosEditModal.module.css";
import Font from "react-font";
import UsuarioSelectModal from "./UsuarioSelectModal";

interface AddHorarioModalProps {
  onClose: () => void;
  onSubmit: (diaHora: string, usuarios: string[]) => void;
}

const AddHorarioModal = ({ onClose, onSubmit }: AddHorarioModalProps) => {
  const [diaHora, setDiaHora] = useState("");
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

  const handleAddUser = (usuario: string) => {
    setUsuarios((prev) => [...prev, usuario]);
    setIsUserPickerOpen(false);
  };

  const handleRemoveUser = (usuario: string) => {
    setUsuarios((prev) => prev.filter((u) => u !== usuario));
  };

  const handleAddHorarioSubmit = async (diaHora: string, usuarios: string[]) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(diaHora, usuarios);
      onClose();
    } catch (error: any) {
      setErrorMsg(error.message || "Error al agregar horario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.fullPage}>
        <div className={styles.container}>
          <Font family="Bungee Inline">
            <h2>Agregar Horario</h2>
          </Font>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
          <div className={styles.modalWrapper}>
            <div className={styles.modalContent}>
              <label>
                <Font family="Lexend">Horario (ej: Lunes-8:00):</Font>
                <input
                  type="text"
                  value={diaHora}
                  onChange={(e) => setDiaHora(e.target.value)}
                  className={styles.inputField}
                  disabled={isSubmitting}
                />
              </label>
              <div>
                <div>
                  {usuarios.map((usuario) => (
                    <span key={usuario} className={styles.selectedUser}>
                      {usuario}
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(usuario)}
                        className={styles.removeUserButton}
                        disabled={isSubmitting}
                        title="Quitar usuario"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserPickerOpen(true)}
                  className={styles.modalButtonEdit + " " + styles.addUserButton}
                  disabled={isSubmitting}
                >
                  Agregar usuario
                </button>
              </div>
              <button
                onClick={() => handleAddHorarioSubmit(diaHora, usuarios)}
                className={styles.modalButtonEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Agregando..." : "Agregar"}
              </button>
            </div>
          </div>
            {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
        </div>
      </div>
      {isUserPickerOpen && (
        <UsuarioSelectModal
          onClose={() => setIsUserPickerOpen(false)}
          onSelect={handleAddUser}
          alreadySelected={usuarios}
        />
      )}
    </div>
  );
};

export default AddHorarioModal;