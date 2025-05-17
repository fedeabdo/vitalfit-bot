export type Dia = 
  | "Lunes" 
  | "Martes" 
  | "Miércoles" 
  | "Jueves" 
  | "Viernes" 
  | "Sábado" 
  | "Domingo";

export type tiempo = `${Dia}-${string}`;

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

export interface DeleteReserva {
  usuario: string; 
}

export interface HorarioJson {
  diaHora: string;
  usuarios: string[];
}

export type HoraUsuarios = {
  hora: string;
  usuarios: string[];
};


export interface ApiSuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface ApiErrorResponse {
  error: string;
  statusCode: number;
  message: string;
}

export interface UpdateHorarioPayload {
  [key: tiempo]: string[];
}

export interface DeleteHorarioPayload {
  horario : tiempo;
}