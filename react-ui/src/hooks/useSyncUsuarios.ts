import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "./fetchWithAuth";

export const useSyncUsuarios = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithAuth(
        "http://localhost:5100/api/usuarios/sync",
        { method: "POST" }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error syncing users");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
};
