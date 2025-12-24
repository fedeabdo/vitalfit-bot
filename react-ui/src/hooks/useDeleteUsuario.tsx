import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from './fetchWithAuth';

interface DeleteUsuarioPayload {
  nombre: string;
}

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nombre }: DeleteUsuarioPayload) => {
      const response = await fetchWithAuth(`https://vitalfit.uy/api/usuarios`, {
        method: 'DELETE',
        body: JSON.stringify({ nombre }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      
      if (response.status === 204) {
        return null; 
      }

      return response.json(); 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
};