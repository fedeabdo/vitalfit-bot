import React from 'react';
import { Outlet } from 'react-router';

import styles from './css/App.module.css'
import NavBar from './components/NavBar';

const App: React.FC = () => {
  return (
    <div className={styles.container}>
      <NavBar></NavBar>
      <Outlet />
    </div>
  );
};

export default App;