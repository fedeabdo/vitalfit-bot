import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from './fetchWithAuth';

interface AddReservaPayload {
  hora: string;
  usuario: string;
}

export const useAddReserva = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hora, usuario }: AddReservaPayload) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetchWithAuth("http://localhost:5100/api/reservas", {
          method: "POST",
          body: JSON.stringify({ hora, usuario }),
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const text = await response.text();
          let errorMessage = `Error ${response.status}`;
          try {
            const json = JSON.parse(text);
            errorMessage = json.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }

          console.log("🚨 Throwing error:", errorMessage);
          throw new Error(errorMessage);
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
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
    },
    retry: false,
  });
};


