import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../css/NavBar.module.css';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  return (
    <nav className={styles.navbar}>
      {(userRole === 'profesor' || userRole === 'admin') && (
      <button onClick={() => navigate('/')}>Reservas</button>
      )}
      {userRole === 'admin' && (
        <>
          <button onClick={() => navigate('/horarios')}>Horarios</button>
          <button onClick={() => navigate('/usuarios')}>Usuarios</button>
        </>
      )}
      { (userRole === 'user' || userRole === 'admin') &&  (
        <button onClick={() => navigate('/mis-reservas')}>Mis Reservas</button>
      )}
    </nav>
  );
};

export default NavBar;