import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteReserva } from "../types/types";
import { fetchWithAuth } from './fetchWithAuth';

interface DeleteReservaVars {
  hora: string;
  nombre: string;
}

export const useDeleteReserva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hora, nombre }: DeleteReservaVars) => {
      const reserva: DeleteReserva = { usuario: nombre };
    
      const response = await fetchWithAuth("https://vitalfit.uy/api/reservas", {
        method: "DELETE",
        body: JSON.stringify(reserva),
        headers: {
          "Content-Type": "application/json",
        },
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    
      const text = await response.text();
      const data = text ? JSON.parse(text) : { success: true };
  
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      queryClient.invalidateQueries({ queryKey: ['userReservation'] });
      queryClient.invalidateQueries({ queryKey: ['availablePlacesToday'] });
    },
    onError: (error) => {
      console.error("❌ Mutation failed:", error);
    }
  });
};
