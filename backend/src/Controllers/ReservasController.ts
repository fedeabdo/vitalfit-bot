import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { Reserva, Horario, ReservaRequest, ReservaRequestByName, Usuario } from '../types';
import { UsuariosController } from './UsuariosController';
import { HorariosController } from './HorariosController';
import { esMasDeLas2030, esDomingoALas13 } from '../utils/timeUtils';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { parse } from 'json2csv';

dotenv.config();

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
  static async addReserva(req: Request<{}, {}, ReservaRequest | ReservaRequestByName>, res: Response) {
    const hora = req.body.hora;
    const cedula = 'cedula' in req.body ? req.body.cedula : undefined;
    const nombre = 'usuario' in req.body ? req.body.usuario : undefined;

    let usuario: string | undefined;

    if (cedula) {
      if (!(await UsuariosController.usuarioExiste(cedula))) {
        res.status(403).json({ error: `El usuario con cédula ${cedula} no existe` });
        return;
      }
      usuario = await UsuariosController.getNombreByCedula(cedula);

      if (!usuario) {
        res.status(500).json({ error: `No se pudo encontrar el nombre del usuario con cédula ${cedula}` });
        return;
      }
    } else if (nombre) {
      if (!(await UsuariosController.usuarioExisteByName(nombre))) {
        res.status(403).json({ error: `El usuario con nombre ${nombre} no existe` });
        return;
      }
      usuario = nombre;
    } else {
      res.status(400).json({ error: 'Debe proporcionar cédula o nombre para la reserva' });
      return;
    }

    if (!ReservaController.reservas[hora]) {
      res.status(400).json({ error: 'Horario de reserva inválido' });
      return;
    }

    let horaReservada: string | undefined = undefined;
    for (const [horaKey, reservas] of Object.entries(ReservaController.reservas)) {
      if (reservas.some((r) => r.usuario === usuario)) {
        horaReservada = horaKey;
        break;
      }
    }

    if (horaReservada) {
      res.status(409).json({ error: `El usuario ya tiene una reserva para el horario: ${horaReservada}` });
      return;
    }

    if (ReservaController.reservas[hora].length >= ReservaController.MAX_RESERVAS_POR_HORARIO) {
      res.status(403).json({ error: `Este horario ya está lleno` });
      return;
    }

    if (ReservaController.esPrevioAHoraActual(hora)) {
      res.status(403).json({ error: 'No se puede hacer reservas previas a la hora actual, recuerda que los horarios de mañana se habilitan a partir de las 20:30' });
      return;
    }

    // Aca la magia
    await ReservaController.calculoHorarioPrioritario(hora, usuario, res);
  }

  //Borrar reserva
  static async deleteReserva(
    req: Request<{}, {}, { usuario?: string; cedula?: string }>,
    res: Response
  ): Promise<void> {
    const { usuario: usuarioInput, cedula } = req.body;

    let usuario: string | undefined;

    if (cedula) {
      if (!(await UsuariosController.usuarioExiste(cedula))) {
        res.status(403).json({ error: `El usuario con cédula ${cedula} no existe` });
        return;
      }
      usuario = await UsuariosController.getNombreByCedula(cedula);

      if (!usuario) {
        res.status(500).json({ error: `No se pudo encontrar el nombre del usuario con cédula ${cedula}` });
        return;
      }
    } else if (usuarioInput) {
      if (!(await UsuariosController.usuarioExisteByName(usuarioInput))) {
        res.status(403).json({ error: `El usuario con nombre ${usuarioInput} no existe` });
        return;
      }
      usuario = usuarioInput;
    } else {
      res.status(400).json({ error: 'Debe proporcionar cédula o nombre para borrar la reserva' });
      return;
    }

    let found = false;
    let horaEncontrada = '';
    let index = -1;

    for (const [hora, reservas] of Object.entries(ReservaController.reservas)) {
      index = reservas.findIndex((r) => r.usuario === usuario);
      if (index !== -1) {
        horaEncontrada = hora;
        found = true;
        break;
      }
    }

    if (!found) {
      res.status(404).json({ error: 'El usuario no tiene una reserva para eliminar' });
      return;
    }
	
    if (found){
     if (ReservaController.esPrevioAHoraActual(horaEncontrada)) {
        res.status(403).json({ error: `Borrado rechazado` });
        return;
     }
    }

    await ReservaController.borrarReserva(horaEncontrada, usuario, index);

    res.status(200).json({ message: 'Reserva eliminada', hora: horaEncontrada, usuario });
  }

  // Reset reservas manual sin backup
  static resetReservas(req: Request<{}, {}, Reserva>, res: Response){
    ReservaController.resetearHorariosDiarios();
    res.status(200).json({ message: 'Ok'});
    return;
  }

  // Borrar todas las reservas a las 20:30 CRON
  static configurarReseteoDiario() {
    // Reseteo Domingo
    cron.schedule('0 13 * * 0', async () => {
      console.log('Reseteando reservas a las 13:00 (domingo)...');
      await ReservaController.resetearHorariosDiarios();
    });
    // Reseteo Lunes a Sábado
    cron.schedule('30 20 * * 1-6', async () => {
      console.log('Reseteando reservas a las 20:30 (lunes a sábado)...');
      await ReservaController.resetearHorariosDiarios();
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

    if (esDomingoALas13() || esMasDeLas2030()) {
        return false;
    }

    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const minutosTarget = hora * 60 + minuto;

    return minutosTarget < minutosAhora;
}

  static async calculoHorarioPrioritario(hora: string, usuario: string, res: Response) {
    try {
      const now = new Date();
      let dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
  
      // Si es mas de las 20:30 paso al dia siguiente
      if (esMasDeLas2030() || esDomingoALas13()) {
        now.setDate(now.getDate() + 1);
        dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
      }
  
      const horarioAChequear = `${dia}-${hora}`;
      const esPrioritario = await ReservaController.chequeoHorarioPrioritario(usuario, horarioAChequear);


      const reservasEnHora = ReservaController.reservas[hora].length;

      // No prioritario: máximo 6 reservas y solo dentro de 4 horas
      const diffMin = ReservaController.calcularDiffHorarioEnMin(hora);
      const MAX_NO_PRIORITARIO = ReservaController.MAX_RESERVAS_POR_HORARIO - 3;

      if (esPrioritario) {
        if (diffMin <= 240 && diffMin > 0) {
          if (reservasEnHora >= ReservaController.MAX_RESERVAS_POR_HORARIO - 3) {
            return res.status(403).json({ error: `Este horario ya está lleno` });
          }
        } else {
          if (diffMin > 0 && diffMin > 240) {
            if (reservasEnHora >= ReservaController.MAX_RESERVAS_POR_HORARIO) {
              return res.status(403).json({ error: `Este horario ya está lleno` });
            }
          }
        }
          await ReservaController.agregarReserva(hora, usuario);
          return res.status(201).json({ message: 'Reserva agregada (prioritario)', hora, usuario });
      }
  
      if (reservasEnHora >= MAX_NO_PRIORITARIO) {
          return res.status(403).json({ error: `Este horario ya está lleno` });
      }
  
      if (diffMin <= 240 && diffMin > 0) {
          await ReservaController.agregarReserva(hora, usuario);
          return res.status(201).json({ message: 'Reserva agregada', hora, usuario });
      }
  
      return res.status(403).json({ error: 'No eres usuario prioritario. Debe esperar para reservar (4 horas antes o menos)' });
  
    } catch (err) {
      console.error('Error en calculoHorarioPrioritario:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

    static async updateReserva(req: Request<{}, {}, { hora: string; cedula: string }>, res: Response) {
      const { hora, cedula } = req.body;
  
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
          res.status(400).json({ error: 'El horario de reserva es inválido' });
          return;
      }
  
      if (ReservaController.esPrevioAHoraActual(hora)) {
          res.status(403).json({ error: 'No se puede cambiar la reserva a un horario previo a la hora actual' });
          return;
      }
  
      let horaExistente: string | null = null;
      let index = -1;
      for (const [h, reservas] of Object.entries(ReservaController.reservas)) {
          index = reservas.findIndex((r) => r.usuario === usuario);
          if (index !== -1) {
              horaExistente = h;
              break;
          }
      }
      if (horaExistente === null) {
          res.status(404).json({ error: 'El usuario no tiene una reserva existente para cambiar' });
          return;
      }
  

      const now = new Date();
      let dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now);
      let reservaDate = new Date(now);
      if (esMasDeLas2030() || esDomingoALas13()) {
          reservaDate.setDate(reservaDate.getDate() + 1);
          dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(reservaDate);
      }
      const horarioAChequear = `${dia}-${hora}`;
      const esPrioritario = await ReservaController.chequeoHorarioPrioritario(usuario, horarioAChequear);

      const reservasEnHora = ReservaController.reservas[hora].length;
      if (ReservaController.esPrevioAHoraActual(horaExistente)){
         res.status(403).json({ error: `Borrado rechazado` });
         return;
      }

      if (esPrioritario) {
          if (reservasEnHora >= ReservaController.MAX_RESERVAS_POR_HORARIO) {
              res.status(403).json({ error: `El horario ${hora} ya está lleno` });
              return;
          }
          await ReservaController.borrarReserva(horaExistente, usuario, index);
          await ReservaController.agregarReserva(hora, usuario);
          res.status(201).json({ message: 'Reserva actualizada (prioritario)', hora, usuario });
          return;
      }
  
      const [reservaHora, reservaMinuto] = hora.split(":").map(Number);
      const reservaDateTime = new Date(reservaDate);
      reservaDateTime.setHours(reservaHora, reservaMinuto, 0, 0);
      const diffMin = Math.floor((reservaDateTime.getTime() - now.getTime()) / 60000);
      const MAX_NO_PRIORITARIO = ReservaController.MAX_RESERVAS_POR_HORARIO - 3;
  
      if (reservasEnHora >= MAX_NO_PRIORITARIO) {
          res.status(403).json({ error: `El horario ${hora} ya está lleno` });
          return;
      }
  
      if (diffMin <= 240 && diffMin > 0) {
          await ReservaController.borrarReserva(horaExistente, usuario, index);
          await ReservaController.agregarReserva(hora, usuario);
          res.status(201).json({ message: 'Reserva actualizada', hora, usuario });
          return;
      }
  
      res.status(403).json({ error: 'No eres usuario prioritario. Debe esperar para reservar (4 horas antes o menos)' });
      return;
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

  private static formatBackupDataToCSV(backupReservas: Record<string, Reserva[]>): string {
    const timeSlots = Object.keys(backupReservas);

    const rows: Record<string, string>[] = [];
    const maxUsers = Math.max(...Object.values(backupReservas).map(users => users.length));

    for (let i = 0; i < maxUsers; i++) {
        const row: Record<string, string> = {};
        timeSlots.forEach(slot => {
            row[slot] = backupReservas[slot][i]?.usuario || ''; // Add user or empty string if no user
        });
        rows.push(row);
    }

    return parse(rows, { fields: timeSlots });
}

  private static async sendBackupEmail(backupReservas: Record<string, Reserva[]>): Promise<void> {
    try {
        const csvData = this.formatBackupDataToCSV(backupReservas);

        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 587, // Use 587 for TLS
            secure: false, // Use true for SSL, false for TLS
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_RECIPIENT, // Recipient email from .env
            subject: 'Backup de Reservas Diarias',
            text: 'Adjunto encontrarás el backup de reservas diarias.',
            attachments: [
                {
                    filename: `BackupReservas_${new Date().toISOString().split('T')[0]}.csv`,
                    content: csvData,
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Backup email sent successfully');
    } catch (error) {
        console.error('❌ Error sending backup email:', error);
    }
}

  static async resetearHorariosDiarios() {
    console.log("INICIALIZANDO HORARIOS");
    const data = await fs.readFile(ReservaController.DATA_PATH_RESERVAS, 'utf-8');
    const backupReservas: Record<string, Reserva[]> = JSON.parse(data);
    await this.sendBackupEmail(backupReservas);
    const horas: string[] = await this.getHorariosDispniblesMañana();
    ReservaController.reservas = {};
    horas.forEach(hour => {
        ReservaController.reservas[hour] = [];
    });
    await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
}

  static async inicializarHorariosDiarios() {

    const now = new Date();
    const horaActual = now.getHours();
    const minutosActuales = now.getMinutes();
    const data = await fs.readFile(ReservaController.DATA_PATH_RESERVAS, 'utf-8');
    const backupReservas: Record<string, Reserva[]> = JSON.parse(data);
    
    if (Object.keys(backupReservas).length === 0 && backupReservas.constructor === Object) {
      // Si no hay backup, son mas de las 20:30 o es domingo y son mas de las 13:00 y reiniciaste el sv (FUA)
      if (esMasDeLas2030() || esDomingoALas13()) {
        const horas: string[] = await this.getHorariosDispniblesHoy();
        ReservaController.reservas = {};
        horas.forEach(hour => {
            ReservaController.reservas[hour] = [];
        });
        await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
      } else {
        const horas: string[] = await this.getHorariosDispniblesHoy();
        ReservaController.reservas = {};
        horas.forEach(hour => {
            ReservaController.reservas[hour] = [];
        });
        await fs.writeFile(ReservaController.DATA_PATH_RESERVAS, JSON.stringify(ReservaController.reservas, null, 2))
      }
    } else {
        // Si reseteaste y hay backup
        ReservaController.reservas = backupReservas;

        // Send backup email
        await this.sendBackupEmail(backupReservas);
    }
}

  static async inicializarHorariosDiariosNoBackup(){
    console.log("INICIALIZANDO HORARIOS SIN BACKUP");
  
    const now = new Date();
    const horaActual = now.getHours();
    const minutosActuales = now.getMinutes();
  
    if (esMasDeLas2030()) {
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

static async buscarHoraPorCedula(req: Request, res: Response) {
    const cedula = req.params.cedula;
    const nombre = req.query.name as string;
    if (!cedula && !nombre) {
        res.status(400).json({ error: "Debe proporcionar una cédula o nombre." });
        return;
    }
    let usuario: string | undefined = undefined;
    if (cedula) {
      usuario = await UsuariosController.getNombreByCedula(cedula);
    }
    if (!usuario && !nombre) {
      res.status(404).json({ message: `No existe un usuario registrado con la cédula ${cedula}` });
      return;
    } else if (nombre) {
      usuario = nombre;
    }
    
    for (const [hora, reservas] of Object.entries(ReservaController.reservas)) {
        if (reservas.some(r => r.usuario === usuario)) {
          res.status(200).json({ hora });
          return;
        }
    }
    res.status(404).json({ message: `No hay reservas registradas para ${cedula || nombre}` });
    return;
}
}

// Inicializa reservas diarias y configura el reseteo en startup
ReservaController.inicializarHorariosDiarios();
ReservaController.configurarReseteoDiario();
