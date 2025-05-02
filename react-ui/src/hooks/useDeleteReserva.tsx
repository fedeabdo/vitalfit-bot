import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Reserva } from "../types/types";
import { fetchWithAuth } from './fetchWithAuth';

interface DeleteReservaVars {
  hora: string;
  nombre: string;
}

export const useDeleteReserva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hora, nombre }: DeleteReservaVars) => {
      const reserva: Reserva = { hora, usuario: nombre };
    
      const response = await fetchWithAuth("http://localhost:5100/api/reservas", {
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
    },
    onError: (error) => {
      console.error("❌ Mutation failed:", error);
    }
  });
};
