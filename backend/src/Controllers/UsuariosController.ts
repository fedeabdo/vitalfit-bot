import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import {Usuario} from '../types'


export class UsuariosController {
  // Ruta para el archivo
  private static readonly DATA_PATH = path.join(__dirname, '../data/Usuarios.json');

  // Imprimir usuarios
  static async getUsuarios(req: Request, res: Response) {
    try {
      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Usuarios' });
      return;
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
      return;
    }
  }

  // Borrar Usuario
  static async deleteUsuario(req: Request<{nombre:string}, {}>, res: Response): Promise<void> {
    try {

        //ToDo cambiar por CI
      const nombreUsuario = req.body.nombre;

      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      let Usuarios: Usuario[] = JSON.parse(data);
      
      const filteredUsuarios = Usuarios.filter(u => u.nombre !== nombreUsuario);
      if (Usuarios.length === filteredUsuarios.length) {
        res.status(404).json({ error: `Usuario ${nombreUsuario} no encontrado`});
        return;
      }

      await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(filteredUsuarios, null, 2));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: 'Error al borrar usuario' });
      return;
    }
  }

  // Checkea si el usuario existe
  static  async usuarioExiste(usuario : string) {
    const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
    let Usuarios: Usuario[] = JSON.parse(data);
    const filteredUsuarios = Usuarios.filter(u => u.nombre !== usuario);
    return Usuarios.length != filteredUsuarios.length;
  }

    // Updatear usuario
  // static async updateUsuario(req: Request, res: Response) {
  //   try {
  //       //ToDo cambiar por CI
  //     const nombreUsuario = req.body.nombre;
  //     const updatedData = req.body;

  //     const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
  //     let Usuarios: Usuario[] = JSON.parse(data);
      
  //     const UsuarioIndex = Usuarios.findIndex(u => u.nombre === nombreUsuario);
  //     if (UsuarioIndex === -1) {
  //       res.status(404).json({ error: `Usuario ${nombreUsuario} no encontrado` });
  //     }

  //     Usuarios[UsuarioIndex] = { ...Usuarios[UsuarioIndex], ...updatedData };
  //     await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(Usuarios, null, 2));
  //     res.json(Usuarios[UsuarioIndex]);
  //   } catch (error) {
  //     res.status(500).json({ error: 'Error al actualizar usuario' });
  //   }
  // }
} 