import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from './fetchWithAuth';

interface AddUsuarioPayload {
  nombre: string;
  ci: string;
}

export const useAddUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nombre, ci }: AddUsuarioPayload) => {
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // optional timeout
    
      try {
        const response = await fetchWithAuth("https://vitalfit.uy/api/usuarios", {
          method: "POST",
          body: JSON.stringify({ nombre, ci }),
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });
    
        clearTimeout(timeout);
    
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Error ${response.status}: ${text}`);
        }
    
        return await response.json();
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("Request timed out");
        }
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Usuario added successfully");
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    retry: false,
  });
};

