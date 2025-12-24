import { useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "./fetchWithAuth";

const resetReserva = async () => {
  const res = await fetchWithAuth("https://vitalfit.uy/api/reservas/reset", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Error al resetear reservas");
  }
  return res.json();
};

export function useResetReserva() {
  return useMutation({
    mutationFn: resetReserva,
  });
}
