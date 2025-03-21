type Dia = 
  | "Lunes" 
  | "Martes" 
  | "Miércoles" 
  | "Jueves" 
  | "Viernes" 
  | "Sábado" 
  | "Domingo";

type tiempo = `${Dia}-${string}`;

export interface Usuario {
    nombre: string;
    ci: string;
  }
export interface Horario {
  [key: tiempo]: string[];
}

export interface Reserva {
  hora: string;
  usuario: string; 
}