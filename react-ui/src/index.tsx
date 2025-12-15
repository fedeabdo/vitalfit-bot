import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext'; // Import your AuthProvider
import { ProtectedRoute } from './components/ProtectedRoute'; // Import ProtectedRoute component

import App from './App';
import Home from './pages/Home';
import MyReservas from './pages/MyReservas';
import Horarios from './pages/Horarios';
import Usuarios from './pages/Usuarios';
import {Login} from './pages/Login';
import Unauthorized from './pages/Unauthorized';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "login", 
        element: <Login />   
      },
      {
        path: "unauthorized",
        element: <Unauthorized />
      },
      {
        index: true,
        element: (
          <ProtectedRoute allowedRoles={['admin', 'profesor']}>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: "mis-reservas",
        element: (
          <ProtectedRoute allowedRoles={['admin', 'user']}>
            <MyReservas />
          </ProtectedRoute>
        ),
      },
      {
        path: "horarios",
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Horarios />
          </ProtectedRoute>
        ),
      },
      {
        path: "usuarios",
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <Usuarios />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </QueryClientProvider>
);