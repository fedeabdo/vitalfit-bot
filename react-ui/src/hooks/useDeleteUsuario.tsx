import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DeleteUsuarioPayload {
  nombre: string;
}

export const useDeleteUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nombre }: DeleteUsuarioPayload) => {
      const response = await fetch(`http://localhost:5100/api/usuarios`, {
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