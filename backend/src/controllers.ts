// src/controllers/data.controller.ts
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
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