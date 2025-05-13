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
        const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
        const horarios: Horario[] = JSON.parse(data);
        const diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());

        // Read BackupReservas.json to get reservation data
        const backupData = await fs.readFile(HorariosController.DATA_PATH_RESERVAS_BACKUP, 'utf-8');
        const backupReservas: Record<string, Reserva[]> = JSON.parse(backupData);

        const result = Object.keys(horarios)
            .filter(key => key.toLowerCase().includes(diaActual))
            .map(key => {
                const parts = key.split('-');
                if (parts.length === 2) {
                    const hora = parts[1];
                    const reservas = backupReservas[hora] || [];
                    return {
                        hora,
                        disponibilidad: reservas.length <= 5
                    };
                }
                return null;
            })
            .filter(Boolean); // Remove null values

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al imprimir horarios de hoy' });
    }
  }

  static isTiempo(key: string): key is tiempo {
    const dias: Dia[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
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

      if (usuarios.length != 0) {
        if (!Array.isArray(usuarios) || !usuarios.every(v => typeof v === "string")) {
          res.status(400).json({ error: 'Valor invalido de usuario' });
          return;
        }
      }

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
      const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
      const horarios: Horario = JSON.parse(data);

      return Object.entries(horarios).some(
        ([key, value]: [string, string[]]) =>
          key.toLowerCase().startsWith(dia) && value.includes(usuario)
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