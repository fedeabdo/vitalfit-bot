import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { Reserva } from '../types';
import { Horario} from '../types'

export class ReservaController {
    private static reservas: Record<string, Reserva[]> = {};
  
    //ToDo acoplamiento cambiar esto
    private static readonly DATA_PATH_HORARIOS = path.join(__dirname, '../data/HorariosPrioritarios.json');
  
    private static async  getHorariosDispniblesHoy(){
      try {
        const data = await fs.readFile(ReservaController.DATA_PATH_HORARIOS, 'utf-8');
        const horarios: Horario[] = JSON.parse(data);
        const uniqueHours = new Set<string>();
        const diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());
  
        for (const key in horarios) {
          if (key.toLowerCase().includes(diaActual)) {
            const parts = key.split('-');
            if (parts.length === 2) {
              uniqueHours.add(parts[1]); // e.g., "800", "900"
            }
          }
        }
      
        return Array.from(uniqueHours);
    } catch (error) {
        throw error
    }
    }
  
    static async inicializarHorariosDiarios(): Promise<void> {
      console.log("INICIALIZANDO HORARIOS");
      const horas: string[] = await this.getHorariosDispniblesHoy();
      ReservaController.reservas = {};
      horas.forEach(hour => {
        ReservaController.reservas[hour] = [];
      });
    }
  
    // Impimir reservas
    static getReservas(req: Request, res: Response) {
      res.json(ReservaController.reservas);
    }
  
    // Agregar reserva
    static addReserva(req: Request<{}, {}, Reserva>, res: Response): void {
      const hora  = req.body.hora;
      const usuario = req.body.usuario;

      console.log(usuario);
  
      if (!ReservaController.reservas[hora]) {
        res.status(400).json({ error: 'Horario de reserva invalido' });
      }
      
      if (!usuario){
        res.status(400).json({ error: 'Usuario invalido' });
      }

      const usuarioYaReservado = Object.values(ReservaController.reservas)
      .flat()
      .some(r => r.usuario === usuario);
    
      if (usuarioYaReservado) {
        res.status(409).json({ error: 'El usuario ya tiene una reserva en otro horario' });
      }
  
      ReservaController.reservas[hora].push({ hora, usuario });
      res.status(201).json({ message: 'Reserva agregada ', hora, usuario });
    }
  
    //Borrar reserva
    static deleteReserva(req: Request<{}, {}, Reserva>, res: Response): void {
      const { hora, usuario } = req.body;
  
      if (!ReservaController.reservas[hora]) {
        res.status(400).json({ error: 'Horario de reserva invalido' });
      }
  
      const usuarioYaReservado = Object.values(ReservaController.reservas)
      .flat()
      .some(r => r.usuario === usuario);
    
      if (usuarioYaReservado) {
        const index = ReservaController.reservas[hora].findIndex(r => 
          r.hora === hora && r.usuario === usuario
        );
  
        if (index !== -1) {
          ReservaController.reservas[hora].splice(index, 1);
        } else {
          res.status(400).json({ error: 'El usuario no tiene una reserva' });
        }
      }
      
      res.status(204).json({ message: 'Reserva agregada ', hora, usuario });
    }
  
    // Borrar todas las reservas a las 22:00 CRON
    static configurarReseteoDiario() {
      cron.schedule('0 22 * * *', () => {
        console.log('Reseteando reservas a las 22:00...');
        ReservaController.inicializarHorariosDiarios();
      });
    }
  
  
  }
  
  // Inicializa reservas diarias y configura el reseteo en startup
  ReservaController.inicializarHorariosDiarios();
  ReservaController.configurarReseteoDiario();