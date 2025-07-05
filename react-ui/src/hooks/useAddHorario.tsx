import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from './fetchWithAuth';

interface AddHorarioPayload {
  diaHora: string;
  usuarios: string[];
}

export const useAddHorario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ diaHora, usuarios }: AddHorarioPayload) => {
      console.log("Adding horario:", { diaHora, usuarios });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      console.log(JSON.stringify({ [diaHora]: usuarios }));
      try {
        const response = await fetchWithAuth("http://5.161.43.130:5100/api/horarios", {
          method: "POST",
          body: JSON.stringify({ [diaHora]: usuarios }),
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status !== 201) {
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
      queryClient.invalidateQueries({ queryKey: ['horarios'] });
    },
    retry: false,
  });
};