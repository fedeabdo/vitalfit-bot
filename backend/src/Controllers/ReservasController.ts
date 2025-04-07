import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { Reserva } from '../types';
import { Horario} from '../types'
import { UsuariosController } from './UsuariosController';
import { HorariosController } from './HorariosController';

export class ReservaController {
    private static reservas: Record<string, Reserva[]> = {};
    static readonly MAX_RESERVAS_POR_HORARIO = 9;
  
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

    private static async  getHorariosDispniblesMañana() {
      try {
        const data = await fs.readFile(ReservaController.DATA_PATH_HORARIOS, 'utf-8');
        const horarios: Horario[] = JSON.parse(data);
        const uniqueHours = new Set<string>();
        const fechaManana = new Date();
        fechaManana.setDate(fechaManana.getDate() + 1);  // Add 1 day to current date
        const diaManana = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(fechaManana);
  
        for (const key in horarios) {
          if (key.toLowerCase().includes(diaManana)) {
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

      const now = new Date();
      const horaActual = now.getHours();
      const minutosActuales = now.getMinutes();

      if  (horaActual > 20 || (horaActual === 20 && minutosActuales >= 30)){
        const horas: string[] = await this.getHorariosDispniblesMañana();
        ReservaController.reservas = {};
        horas.forEach(hour => {
          ReservaController.reservas[hour] = [];
        });

      } else {
        const horas: string[] = await this.getHorariosDispniblesHoy();
        ReservaController.reservas = {};
        horas.forEach(hour => {
          ReservaController.reservas[hour] = [];
        });
      }
    }
  
    // Impimir reservas
    static getReservas(req: Request, res: Response) {
      res.json(ReservaController.reservas);
    }
  
    // Agregar reserva
    static async addReserva(req: Request<{}, {}, Reserva>, res: Response): Promise<void> {
      const hora  = req.body.hora;
      const usuario = req.body.usuario;

      console.log(req.body);

      if (!(await UsuariosController.usuarioExiste(usuario))){
        res.status(403).json({ error: `El usuario ${usuario} no existe` });
        return;
      }
  
      if (!ReservaController.reservas[hora]) {
        res.status(400).json({ error: 'Horario de reserva invalido' });
        return;
      }
      
      if (!usuario){
        res.status(400).json({ error: 'Usuario invalido' });
        return;
      }

      const usuarioYaReservado = Object.values(ReservaController.reservas)
      .flat()
      .some(r => r.usuario === usuario);
    
      if (usuarioYaReservado) {
        res.status(409).json({ error: 'El usuario ya tiene una reserva' });
        return;
      }

      if (ReservaController.reservas[hora].length >= (ReservaController.MAX_RESERVAS_POR_HORARIO)) {
        res.status(403).json({ error: `Este horario ya esta lleno (maximo ${ReservaController.MAX_RESERVAS_POR_HORARIO} reservas)` });
        return;
      }

   

      if (ReservaController.esPrevioAHoraActual(hora)){
        res.status(403).json({ error: `No se pueden reservar horarios previos a la hora actual` });
        return;
      }

      // calculo de usuario prioritario (se podría mover a otra funcion, pero coso)

      const dia =  new Date();
      const diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(dia);
      const horarioAChequear = diaActual + "-" + hora;

      const horarioPrioritario = await ReservaController.chequeoHorarioPrioritario(usuario, horarioAChequear);

      if (horarioPrioritario) { 
        ReservaController.reservas[hora].push({ hora, usuario });
        res.status(201).json({ message: 'Reserva agregada ', hora, usuario });
        return;
      } else {
        const diffHoraEnMin = ReservaController.calcularDiffHorarioEnMin(hora);
        // si diff <= 240 min aka 4hs
        if (diffHoraEnMin <= 240){
          // Chequear con nando
          if (ReservaController.reservas[hora].length >= (ReservaController.MAX_RESERVAS_POR_HORARIO - 3)) {
            res.status(403).json({ error: `Este horario ya esta lleno (maximo ${ReservaController.MAX_RESERVAS_POR_HORARIO} reservas)` });
            return;
          }
          ReservaController.reservas[hora].push({ hora, usuario });
          res.status(201).json({ message: 'Reserva agregada ', hora, usuario });
          return;
        } else {
          res.status(403).json({ error: `Usuario no prioritario, debe esperar para reservar (4 horas antes o menos)` });
          return;
        }
      }


    }
  
    //Borrar reserva
    static deleteReserva(req: Request<{}, {}, Reserva>, res: Response): void {
      const { hora, usuario } = req.body;
  
      if (!ReservaController.reservas[hora]) {
        res.status(400).json({ error: 'Horario de reserva invalido' });
        return;
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
          return;
        }
      }
      
      res.status(204).json({ message: 'Reserva agregada ', hora, usuario });
    }
  
    // Borrar todas las reservas a las 20:30 CRON
    static configurarReseteoDiario() {
      cron.schedule('30 20 * * *', () => {
        console.log('Reseteando reservas a las 20:30...');
        ReservaController.inicializarHorariosDiarios();
      });
    }

    static async chequeoHorarioPrioritario(usuario: string, dia:string): Promise<boolean>{
      return await HorariosController.usuarioPrioritario(usuario, dia);
    }

    static calcularDiffHorarioEnMin(horaReq: string){
      const [hora, minuto] = horaReq.split(":").map(Number);
      const ahora = new Date();
      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
      const minutosAReserva = hora * 60 + minuto;

      return minutosAReserva - minutosActuales;
    }

    static esPrevioAHoraActual(tiempoStr: string): boolean {
      const [hora, minuto] = tiempoStr.split(":").map(Number);
      const ahora = new Date();
    
      const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
      const minutosTarget = hora * 60 + minuto;
    
      return minutosTarget < minutosAhora;
    }
  
  
  }
  
  // Inicializa reservas diarias y configura el reseteo en startup
  ReservaController.inicializarHorariosDiarios();
  ReservaController.configurarReseteoDiario();