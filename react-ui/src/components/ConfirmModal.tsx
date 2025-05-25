import styles from "../css/HorariosEditModal.module.css";
import Font from 'react-font';


interface ConfirmModalProps {
  textoAConfirmar: string;
  onClose: () => void;
  onSelect: (hora:string | null) => void;
  value : string | null;
}

const ConfirmModal = ({ textoAConfirmar, onClose, onSelect, value }: ConfirmModalProps) => {

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.fullPage}>
        <div className={styles.container}>
          <div className={styles.modalWrapper}>
            <div className={styles.modalContent}>
                    <Font family='Lexend'>
                        <p>{textoAConfirmar}</p>
                    </Font>
              <div className={styles.modalButtonContainer}>
                <button
                  onClick={onClose}
                  className={styles.modalButtonEdit}
                >
                  <Font family='Lexend'>
                    Cancelar
                  </Font>
                </button>

                <button
                  onClick={() => onSelect(value)}
                  className={styles.modalButtonEdit}
                >
                  <Font family='Lexend'>
                    Aceptar
                  </Font>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
