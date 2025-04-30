import { useState } from "react";
import styles from "../css/AgregarUsuarioModal.module.css";
import Font from "react-font";

interface AddUserModalProps {
  onClose: () => void;
  onSubmit: (nombre: string, ci: string) => void;
}

const AddUserModal = ({ onClose, onSubmit }: AddUserModalProps) => {
  const [nombre, setNombre] = useState("");
  const [ci, setCi] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!nombre || !ci) {
      setErrorMsg("Por favor, complete ambos campos.");
      return;
    }
    onSubmit(nombre, ci);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
        <div className={styles.fullPage}>
            <div className={styles.container}>
                <Font family="Bungee Inline">
                <h2>Agregar Usuario</h2>
                </Font>
                <button onClick={onClose} className={styles.closeButton}>
                    ×
                </button>
                <div className={styles.modalWrapper}>
                    
                <div className={styles.modalContent}>
                    <div>
                    <label>
                        <Font family="Lexend">
                            Nombre:
                        </Font>
                        <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className={styles.inputField}
                        />
                    </label>
                    <label>
                        <Font family="Lexend">
                            CI:
                        </Font>
                        <input
                        type="text"
                        value={ci}
                        onChange={(e) => setCi(e.target.value)}
                        className={styles.inputField}
                        />
                    </label>
                    <button onClick={handleSubmit} className={styles.modalButtonEdit}>
                        Agregar
                    </button>
                    </div>
                </div>
                </div>
            </div>
        </div>
        {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
    </div>
  );
};

export default AddUserModal;