import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App';
import Home from './pages/Home';
import Horarios from './pages/Horarios';
import Usuarios from './pages/Usuarios';
import { horariosLoader, reservasLoader, usuariosLoader } from './components/List';

// Create the router using createBrowserRouter
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home />, loader: reservasLoader },
      { path: "horarios", element: <Horarios />, loader: horariosLoader },
      { path: "usuarios", element: <Usuarios />, loader: usuariosLoader },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
