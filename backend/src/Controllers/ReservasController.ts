import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { Reserva, Horario, ReservaRequest, Usuario } from '../types';
import { UsuariosController } from './UsuariosController';
import { HorariosController } from './HorariosController';

export class ReservaController {
  private static reservas: Record<string, Reserva[]> = {};
  static readonly MAX_RESERVAS_POR_HORARIO = 9;

  private static readonly DATA_PATH_HORARIOS = path.join(__dirname, '../data/HorariosPrioritarios.json');
  private static readonly DATA_PATH_RESERVAS = path.join(__dirname, '../data/BackupReservas.json');

  // Impimir reservas
  static getReservas(req: Request, res: Response) {
    res.json(ReservaController.reservas);
  }

  // Agregar reserva
  static async addReserva(req: Request<{}, {}, ReservaRequest>, res: Response) {
    const hora = req.body.hora;
    const cedula = req.body.cedula;

    if (!(await UsuariosController.usuarioExiste(cedula))) {
      res.status(403).json({ error: `El usuario con cédula ${cedula} no existe` });
      return;
    }
    
    const usuario = await UsuariosController.getNombreByCedula(cedula);

    if (!usuario) {
      res.status(500).json({ error: `No se pudo encontrar el nombre del usuario con cédula ${cedula}` });
      return;
    }

    if (!ReservaController.reservas[hora]) {
      res.status(400).json({ error: 'Horario de reserva inválido' });
      return;
    }

    const usuarioYaReservado = Object.values(ReservaController.reservas)
      .flat()
      .some((r) => r.usuario === usuario);

    if (usuarioYaReservado) {
      res.status(409).json({ error: 'El usuario ya tiene una reserva' });
      return;
    }

    if (ReservaController.reservas[hora].length >= ReservaController.MAX_RESERVAS_POR_HORARIO) {
      res.status(403).json({ error: `Este horario ya está lleno (máximo ${ReservaController.MAX_RESERVAS_POR_HORARIO} reservas)` });
      return;
    }


    if (ReservaController.esPrevioAHoraActual(hora)) {
      res.status(403).json({ error: 'No se puede hacer reservas previas a la hora actual' });
      return;
    }

    // Aca la magia
    await ReservaController.calculoHorarioPrioritario(hora, usuario, res);
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
        ReservaController.borrarReserva(hora, usuario, index);
      } else {
        res.status(400).json({ error: 'El usuario no tiene una reserva' });
        return;
      }
    }

    res.status(204).json({ message: 'Reserva eliminada ', hora, usuario });
  }

  // Reset reservas manual sin backup
  static resetReservas(req: Request<{}, {}, Reserva>, res: Response){
    ReservaController.inicializarHorariosDiariosNoBackup();
    res.status(200).json({ message: 'Ok'});
    return;
  }

  // Borrar todas las reservas a las 20:30 CRON
  static configurarReseteoDiario() {
    cron.schedule('30 20 * * *', () => {
      console.log('Reseteando reservas a las 20:30...');
      ReservaController.inicializarHorariosDiarios();
    });
  }

  static async chequeoHorarioPrioritario(usuario: string, dia: string): Promise<boolean> {
     return await HorariosController.usuarioPrioritario(usuario, dia);
  }

  static calcularDiffHorarioEnMin(horaReq: string) {
    const [hora, minuto] = horaReq.split(":").map(Number);
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const minutosAReserva = hora * 60 + minuto;

    return minutosAReserva - minutosActuales;
  }

  static esPrevioAHoraActual(tiempoStr: string): boolean {
    const [hora, minuto] = tiempoStr.split(":").map(Number);
    const ahora = new Date();

    if (ahora.getHours()  > 20 || (ahora.getHours() === 20 && ahora.getHours() >= 30)) {
      return false;
    }

    const minutosAhora = ahora.getHours() * 60 + ahora.getHours();
    const minutosTarget = hora * 60 + minuto;

    return minutosTarget < minutosAhora;
  }

  static async calculoHorarioPrioritario(hora: string, usuario: string, res: Response) {
    try {
      const now = new Date();
      let dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
  
      // Si es mas de las 20:30 paso al dia siguiente
      if (now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30)) {
        now.setDate(now.getDate() + 1);
        dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
      }
  
      const horarioAChequear = `${dia}-${hora}`;
      const esPrioritario = await ReservaController.chequeoHorarioPrioritario(usuario, horarioAChequear);
  
      if (esPrioritario) {
        ReservaController.agregarReserva(hora, usuario);
        return res.status(201).json({ message: 'Reserva agregada (prioritario)', hora, usuario });
      }
  
      const diffMin = ReservaController.calcularDiffHorarioEnMin(hora);
      const cupoLleno = ReservaController.reservas[hora].length >= (ReservaController.MAX_RESERVAS_POR_HORARIO - 3);
  
      if (diffMin <= 240 && diffMin > 0 && !cupoLleno) {
        ReservaController.agregarReserva(hora, usuario);
        return res.status(201).json({ message: 'Reserva agregada', hora, usuario });
      }
  
      const errorMsg = !cupoLleno
        ? 'Usuario no prioritario, debe esperar para reservar (4 horas antes o menos)'
        : `Este horario ya está lleno (máximo ${ReservaController.MAX_RESERVAS_POR_HORARIO} reservas)`;
  
      return res.status(403).json({ error: errorMsg });
  
    } catch (err) {
      console.error('Error en calculoHorarioPrioritario:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  
  private static async getHorariosDispniblesHoy() {
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

  private static async getHorariosDispniblesMañana() {
    try {
      const data = await fs.readFile(ReservaController.DATA_PATH_HORARIOS, 'utf-8');
      const horarios: Horario[] = JSON.parse(data);
      const uniqueHours = new Set<string>();
      const fechaManana = new Date();
      fechaManana.setDate(fechaManana.getDate() + 1);
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

  private static async agregarReserva(hora: string, usuario: string) {
    ReservaController.reservas[hora].push({ hora, usuario });
    await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
  }

  private static async borrarReserva(hora: string, usuario: string, index: number) {
    ReservaController.reservas[hora].splice(index, 1);
    await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2));
  }

  static async inicializarHorariosDiarios(): Promise<void> {
    console.log("INICIALIZANDO HORARIOS");

    const now = new Date();
    const horaActual = now.getHours();
    const minutosActuales = now.getMinutes();

    if (horaActual > 20 || (horaActual === 20 && minutosActuales >= 30)) {
      const horas: string[] = await this.getHorariosDispniblesMañana();
      ReservaController.reservas = {};
      horas.forEach(hour => {
        ReservaController.reservas[hour] = [];
      });
      await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
    } else {
      const data = await fs.readFile(ReservaController.DATA_PATH_RESERVAS, 'utf-8');
      const backupReservas: Record<string, Reserva[]> = JSON.parse(data);
      if (Object.keys(backupReservas).length === 0 && backupReservas.constructor === Object) {
        const horas: string[] = await this.getHorariosDispniblesHoy();
        ReservaController.reservas = {};
        horas.forEach(hour => {
          ReservaController.reservas[hour] = [];
        });
        await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
      } else {
        ReservaController.reservas = backupReservas;
      }
    }
  }

  static async inicializarHorariosDiariosNoBackup(){
    console.log("INICIALIZANDO HORARIOS SIN BACKUP");
  
    const now = new Date();
    const horaActual = now.getHours();
    const minutosActuales = now.getMinutes();
  
    if (horaActual > 20 || (horaActual === 20 && minutosActuales >= 30)) {
      const horas: string[] = await this.getHorariosDispniblesMañana();
      ReservaController.reservas = {};
      horas.forEach(hour => {
        ReservaController.reservas[hour] = [];
      });
      await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
    } else {
      const data = await fs.readFile(ReservaController.DATA_PATH_RESERVAS, 'utf-8');
      const horas: string[] = await this.getHorariosDispniblesHoy();
      ReservaController.reservas = {};
      horas.forEach(hour => {
        ReservaController.reservas[hour] = [];
      });
      await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
    }
  }
}

// Inicializa reservas diarias y configura el reseteo en startup
ReservaController.inicializarHorariosDiarios();
ReservaController.configurarReseteoDiario();