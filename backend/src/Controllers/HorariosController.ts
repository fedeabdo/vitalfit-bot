import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { tiempo, Dia } from '../types';
import { Horario} from '../types'

export class HorariosController {
    private static readonly DATA_PATH_HORARIOS = path.join(__dirname, '../data/HorariosPrioritarios.json');
    

    // Imprimir Horarios
    static async getHorarios(req: Request, res: Response) {
        try {
            const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios: Horario[] = JSON.parse(data);
            res.json(horarios);
        } catch (error) {
            res.status(500).json({ error: 'Error al imprimir usuarios' });
            return;
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
          throw new Error("Solo se permite agregar una hora a la vez.");
        }

        const key = keys[0];
        const usuario:string[] = raw[key];

        if (!HorariosController.isTiempo(key)) {
          throw new Error(`Formato de horario invalido: ${key}`);
        }

        if (usuario.length != 0)  {
          if (!Array.isArray(usuario) || !usuario.every(v => typeof v === "string")) {
            throw new Error(`Valor invalido de usuario para horario ${key}, expected string[]`);
          }
        }

        const horario: Horario = {
          [key]: usuario
        };

        const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
        const horarios: Horario = JSON.parse(data);
        horarios[key]= usuario;

        await fs.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
        res.status(201).json(horario);
      } catch (error) {
          res.status(500).json({ error: 'Error al agregar un nuevo horario' });
          return;
      }
  }

  // Borrar horario
  static async deleteHorario(req: Request , res: Response){
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

  static async usuarioPrioritario(usuario: string, dia: string) : Promise<boolean> {
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

}