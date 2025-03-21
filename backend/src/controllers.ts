// src/controllers/data.controller.ts
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { Reserva } from './types';
import {Usuario, Horario} from './types'


export class UsuariosController {
  // Ruta para el archivo
  private static readonly DATA_PATH = path.join(__dirname, '/data/Usuarios.json');

  // Imprimir usuarios
  static async getUsuarios(req: Request, res: Response) {
    try {
      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Usuarios' });
    }
  }

  // Agregar usuario
  static async addUsuario(req: Request, res: Response) {
    try {
      const newUsuario: Usuario = {
        nombre: req.body.nombre,
        ci: req.body.ci
      };

      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const Usuarios: Usuario[] = JSON.parse(data);
      Usuarios.push(newUsuario);
    
      await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(Usuarios, null, 2));
      res.status(201).json(newUsuario);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create Usuario' });
    }
  }

  // Updatear usuario
  static async updateUsuario(req: Request, res: Response) {
    try {
        //ToDo cambiar por CI
      const nombreUsuario = req.params.nombre;
      const updatedData = req.body;

      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      let Usuarios: Usuario[] = JSON.parse(data);
      
      const UsuarioIndex = Usuarios.findIndex(u => u.nombre === nombreUsuario);
      if (UsuarioIndex === -1) {
        return res.status(404).json({ error: 'Usuario not found' });
      }

      Usuarios[UsuarioIndex] = { ...Usuarios[UsuarioIndex], ...updatedData };
      await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(Usuarios, null, 2));
      res.json(Usuarios[UsuarioIndex]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update Usuario' });
    }
  }

  // Borrar Usuario
  static async deleteUsuario(req: Request, res: Response) {
    try {

        //ToDo cambiar por CI
      const nombreUsuario = req.params.nombre;

      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      let Usuarios: Usuario[] = JSON.parse(data);
      
      const filteredUsuarios = Usuarios.filter(u => u.nombre !== nombreUsuario);
      if (Usuarios.length === filteredUsuarios.length) {
        return res.status(404).json({ error: 'Usuario not found' });
      }

      await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(filteredUsuarios, null, 2));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete Usuario' });
    }
  }
} 

export class HorariosController {
    private static readonly DATA_PATH_HORARIOS = path.join(__dirname, '/data/HorariosPrioritarios.json');

    // Imprimir Horarios
    static async getHorarios(req: Request, res: Response) {
        try {
            const data = await fs.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios: Horario[] = JSON.parse(data);
            res.json(horarios);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch Usuarios' });
        }
    }

}

export class ReservaController {
  private static reservas: Record<string, Reserva[]> = {};

  //acoplamiento ToDo cambiar esto
  private static readonly DATA_PATH_HORARIOS = path.join(__dirname, '/data/HorariosPrioritarios.json');

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
    const { hora, usuario } = req.body;

    if (!ReservaController.reservas[hora]) {
      res.status(400).json({ error: 'Horario de reserva invalido' });
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

// Initialize once at server startup
ReservaController.inicializarHorariosDiarios();
ReservaController.configurarReseteoDiario();