import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { HorariosHoyResponse } from '../types/types';

const API_URL = 'http://localhost:5100/api';

export const useAvailablePlaces = () => {
  const { isAuthenticated } = useAuth();

  return useQuery<HorariosHoyResponse>({
    queryKey: ['availablePlacesToday'],
    queryFn: async () => {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_URL}/horariosHoy`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('No hay horarios disponibles para hoy');
        }
        throw new Error('Failed to fetch available places');
      }

      const data: HorariosHoyResponse = await response.json();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // cache for 1 minute (reasonable for availability)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
