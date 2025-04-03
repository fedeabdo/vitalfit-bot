import React from 'react';
import { Outlet } from 'react-router';

const App: React.FC = () => {
  return (
    <div>
      <header>My Navbar</header>
      <Outlet />  {/* This renders the nested routes */}
      <footer>My Footer</footer>
    </div>
  );
};

export default App;