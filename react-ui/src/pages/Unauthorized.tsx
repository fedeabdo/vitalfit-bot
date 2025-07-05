import styles from '../css/Unauthorized.module.css';
import Font from 'react-font';

const Unauthorized = () => (
  <div className={styles.unauthorizedContainer}>
    <img
      src="https://em-content.zobj.net/source/microsoft-teams/363/crying-face_1f622.png"
      alt="Sad Emoji"
      className={styles.sadEmoji}
    />
    <Font family="Bungee Inline">
      <h1 className={styles.unauthorizedTitle}>🚫 Acceso Denegado</h1>
    </Font>
    <Font family="Lexend">
      <p className={styles.unauthorizedText}>No tienes permisos para acceder a esta página.</p>
      <p className={styles.unauthorizedText}>Si crees que esto es un error, contacta al administrador.</p>
    </Font>
  </div>
);

export default Unauthorized;
