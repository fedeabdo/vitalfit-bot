import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../css/NavBar.module.css';

const NavBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <nav className={styles.navbar}>
      <button onClick={() => navigate('/')}>Reservas</button>
      <button onClick={() => navigate('/horarios')}>Horarios</button>
      <button onClick={() => navigate('/usuarios')}>Usuarios</button>
    </nav>
  );
};

export default NavBar;