import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { tiempo, Dia, Reserva } from '../types';
import { Horario } from '../types'
import { UsuariosController } from './UsuariosController';
import { ReservaController } from './ReservasController';

export class HorariosController {
  private static readonly DATA_PATH_HORARIOS = path.join(__dirname, '../data/HorariosPrioritarios.json');
  private static readonly DATA_PATH_RESERVAS_BACKUP = path.join(__dirname, '../data/BackupReservas.json');


  // Imprimir Horarios
  static async getHorarios(req: Request, res: Response) {
    try {
      const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
      const horarios: Horario[] = JSON.parse(data);
      res.json(horarios);
    } catch (error) {
      res.status(500).json({ error: 'Error al imprimir horarios' });
      return;
    }
  }

  static async getHorariosHoy(req: Request, res: Response) {
    try {
        const now = new Date();
        let diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(now);
        let isTomorrow = false;
        // If it's Sunday and after 13:00, or any day after 20:30, use tomorrow's day
        if ((now.getDay() === 0 && (now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() > 0))) ||
            (now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30))) {
            now.setDate(now.getDate() + 1);
            diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(now);
            isTomorrow = true;
        }
        const diaActualLower = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now).toLowerCase();

        const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
        const horarios: Horario[] = JSON.parse(data);

        // Read BackupReservas.json to get reservation data
        const backupData = await fs.readFile(HorariosController.DATA_PATH_RESERVAS_BACKUP, 'utf-8');
        const backupReservas: Record<string, Reserva[]> = JSON.parse(backupData);

        const result = Object.keys(horarios)
            .filter(key => key.toLowerCase().includes(diaActualLower))
            .map(key => {
                const parts = key.split('-');
                if (parts.length === 2) {
                    const hora = parts[1];
                    const reservas = backupReservas[hora] || [];
                    const lugaresDisponibles = 6 - reservas.length;
                    return {
                        hora,
                        disponible: reservas.length <= 5,
                        lugaresDisponibles: lugaresDisponibles > 0 ? lugaresDisponibles : 0
                    };
                }
                return null;
            })
            .filter(Boolean);

        if (result.length === 0) {
            res.status(401).json({ message: "No hay horarios disponibles para hoy 😔" });
            return;
        }

        res.status(200).json({ dia: diaActual, horarios: result });
        return;
    } catch (error) {
        res.status(500).json({ error: 'Error al imprimir horarios de hoy' });
        return
    }
  }

  static isTiempo(key: string): key is tiempo {
    const dias: Dia[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    return dias.some(dia => key.startsWith(`${dia}-`));
  }

  // Agregar horario
  static async addHorario(req: Request, res: Response) {
    try {
      const raw = req.body;
      const keys = Object.keys(raw);

      if (keys.length !== 1) {
        res.status(400).json({ error: 'No se puede agregar mas de un horario a la vez' });
        return;
      }

      const key = keys[0];
      const usuarios: string[] = raw[key];

      if (!HorariosController.isTiempo(key)) {
        res.status(400).json({ error: 'Formato de horario invalido' });
        return;
      }

      // New validation: if key already exists, return error
      const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
      const horarios: Horario = JSON.parse(data);
      if (key in horarios) {
        res.status(400).json({ error: 'Ese horario ya existe' });
        return;
      }

      if (usuarios.length != 0) {
        if (!Array.isArray(usuarios) || !usuarios.every(v => typeof v === "string")) {
          res.status(400).json({ error: 'Valor invalido de usuario' });
          return;
        }
      }

      const horario: Horario = {
        [key]: usuarios
      };

      horarios[key] = usuarios;

      await fs.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
      res.status(201).json(horario);
    } catch (error) {
      res.status(500).json({ error: 'Error al agregar un nuevo horario' });
      return;
    }
  }

  // Update horario
  static async updateHorario(req: Request, res: Response) {
    try {

      const raw = req.body;
      const keys = Object.keys(raw);

      if (keys.length !== 1) {
        res.status(400).json({ error: 'No se puede modificar mas de un horario a la vez' });
        return;
      }

      const key = keys[0];
      const usuarios: string[] = raw[key];

      if (!HorariosController.isTiempo(key)) {
        res.status(400).json({ error: 'Formato de horario invalido' });
        return;
      }

      if (usuarios.length != 0) {
        if (!Array.isArray(usuarios) || !usuarios.every(v => typeof v === "string")) {
          res.status(400).json({ error: 'Valor invalido de usuario' });
          return;
        }
      }

      usuarios.map((usuario) => {
        if (!UsuariosController.usuarioExiste(usuario)){
          res.status(400).json({ error: `Usuario: ${usuario} no existe en la base de datos` });
          return;
        }
      })

      const horario: Horario = {
        [key]: usuarios
      };

      const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
      const horarios: Horario = JSON.parse(data);
      horarios[key] = usuarios;

      await fs.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
      res.status(201).json(horario);
    } catch (error) {
      res.status(500).json({ error: 'Error al agregar un nuevo horario' });
      return;
    }
  }

  // Borrar horario
  static async deleteHorario(req: Request, res: Response) {
    try {

      const horarioABorrar = req.body.horario;

      if (!HorariosController.isTiempo(horarioABorrar)) {
        throw new Error(`Horario invalido: ${horarioABorrar}`);
      }



      const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
      let horarios: Horario[] = JSON.parse(data);

      if (!(horarioABorrar in horarios)) {
        console.log(`El horario  "${horarioABorrar}" no existe.`);
        return;
      }

      delete horarios[horarioABorrar];


      await fs.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
      console.log(`Horario "${horarioABorrar}" borrado.`);


      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: 'Error al borrar horario' });
      return;
    }
  }

  static async usuarioPrioritario(usuario: string, dia: string): Promise<boolean> {
    try {
      const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
      const horarios: Horario = JSON.parse(data);

      return Object.entries(horarios).some(
        ([key, value]: [string, string[]]) =>
          key.toLowerCase().startsWith(dia) &&
          value.some(u => normalize(u).toLowerCase() === normalize(usuario).toLowerCase())
      );
    } catch (error) {
      throw error;
    }
  }

// Remove user from HorariosPrioritarios
  static async removeUserFromHorariosPrioritarios(nombre: string): Promise<void> {
    const dataPath = path.join(__dirname, '../data/HorariosPrioritarios.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const horarios = JSON.parse(data);

    for (const key in horarios) {
      horarios[key] = horarios[key].filter((user: string) => user !== nombre);
    }

    await fs.writeFile(dataPath, JSON.stringify(horarios, null, 2));
  }

}

function removeDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}