import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://vitalfit.uy/api';

export const useUserReservation = () => {
  const { name, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['userReservation', name],
    queryFn: async () => {
      if (!name) {
        throw new Error('No name available');
      }

      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Call endpoint with empty cedula and name as query parameter
      const response = await fetch(`${API_URL}/reservas/consulta/?name=${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User has no reservation
        }
        throw new Error('Failed to fetch user reservation');
      }

      const data = await response.json();
      return data.hora || null;
    },
    enabled: isAuthenticated && !!name,
    staleTime: 0,
  });
};
