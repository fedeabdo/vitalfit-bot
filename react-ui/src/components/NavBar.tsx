import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../css/NavBar.module.css';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  return (
    <nav className={styles.navbar}>
      {(userRole === 'profesor' || userRole === 'admin') && (
        <button
          className={location.pathname === '/' ? styles.active : ''}
          onClick={() => navigate('/')}
        >
          Reservas
        </button>
      )}

      {userRole === 'admin' && (
        <>
          <button
            className={location.pathname === '/horarios' ? styles.active : ''}
            onClick={() => navigate('/horarios')}
          >
            Horarios
          </button>

          <button
            className={location.pathname === '/usuarios' ? styles.active : ''}
            onClick={() => navigate('/usuarios')}
          >
            Usuarios
          </button>
        </>
      )}

      {(userRole === 'user' || userRole === 'admin') && (
        <button
          className={location.pathname === '/mis-reservas' ? styles.active : ''}
          onClick={() => navigate('/mis-reservas')}
        >
          Mis Reservas
        </button>
      )}
    </nav>
  );
};

export default NavBar;