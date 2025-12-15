import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5100/api';

export const useHasReservationForHour = (hora: string) => {
  const { name, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['reservationForHour', name, hora],
    queryFn: async () => {
      if (!name || !hora) {
        return false;
      }

      const token = localStorage.getItem('jwtToken');
      if (!token) {
        return false;
      }

      try {
        const response = await fetch(`${API_URL}/reservas/consulta/?name=${encodeURIComponent(name)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        const status = response.status;
        let data: any = null;
        try {
          data = await response.json();
        } catch (e) {
          // no json
        }
        // Log for debugging in browser console
        // eslint-disable-next-line no-console
        console.log('[useHasReservationForHour] name=', name, 'horaChecked=', hora, 'status=', status, 'body=', data);

        if (status === 200 && data) {
          // Normalize both values to compare reliably (trim, toString)
          const returnedHora = String(data.hora).trim();
          const checkHora = String(hora).trim();
          const match = returnedHora === checkHora;
          // eslint-disable-next-line no-console
          console.log('[useHasReservationForHour] compare', returnedHora, '===', checkHora, '=>', match);
          return match;
        }
        return false;
      } catch (error) {
        return false;
      }
    },
    enabled: isAuthenticated && !!name && !!hora,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
