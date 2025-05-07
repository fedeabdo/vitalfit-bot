import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { Usuario } from '../types';
import { HorariosController } from './HorariosController';

export class UsuariosController {
  // Ruta para el archivo
  private static readonly DATA_PATH = path.join(__dirname, '../data/Usuarios.json');

  // Imprimir usuarios
  static async getUsuarios(req: Request, res: Response) {
    try {
      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);
      const usuariosRes = usuarios.map(usuario => ({
              nombre: usuario.nombre,
              ci:" ",
            }));
      res.json(usuariosRes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Usuarios' });
      return;
    }
  }

  // Obtener nombre por cédula
  static async getNombreByCedula(cedula: string): Promise<string | null> {
    try {
      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);

      const usuario = usuarios.find(u => u.ci === cedula);
      return usuario ? usuario.nombre : null;
    } catch (error) {
      console.error("Error fetching nombre by cedula:", error);
      throw new Error("Error fetching nombre by cedula");
    }
  }

  // Agregar usuario
  static async addUsuario(req: Request, res: Response) {
    try {
      const newUsuario: Usuario = {
        nombre: req.body.nombre,
        ci: req.body.ci
      };

      const usuarioYaExiste = await UsuariosController.usuarioExiste(newUsuario.ci);

      if (usuarioYaExiste) {
        res.status(403).json({ error: 'Usuario ya existe' });
        return; 
      }

      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);
      usuarios.push(newUsuario);

      await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(usuarios, null, 2));
      res.status(201).json(newUsuario);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create Usuario' });
      return;
    }
  }

  // Borrar Usuario
  static async deleteUsuario(req: Request<{ nombre: string }, {}>, res: Response): Promise<void> {
    try {
      const nombre = req.body.nombre;

      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);

      const usuarioToDelete = usuarios.find(u => u.nombre === nombre);
      if (!usuarioToDelete) {
        res.status(404).json({ error: `Usuario con nombre ${nombre} no encontrado` });
        return;
      }

const filteredUsuarios = usuarios.filter(u => u.nombre !== nombre);
      await fs.writeFile(UsuariosController.DATA_PATH, JSON.stringify(filteredUsuarios, null, 2));

      // Remove user from HorariosPrioritarios
      await HorariosController.removeUserFromHorariosPrioritarios(usuarioToDelete.nombre);

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: 'Error al borrar usuario' });
      return;
    }
  }

  // Developer function: Remove duplicate usuarios
  static async removeDuplicateUsuarios(req: Request, res: Response) {
    try {
      const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
      const usuarios: Usuario[] = JSON.parse(data);
  
      const uniqueUsuarios = Array.from(
        new Map(usuarios.map((u) => [u.ci, u])).values()
      );
  
      await fs.writeFile(
        UsuariosController.DATA_PATH,
        JSON.stringify(uniqueUsuarios, null, 2)
      );
  
      res.status(200).json({
        message: `Removed duplicates. ${usuarios.length - uniqueUsuarios.length} duplicates deleted.`,
        total: uniqueUsuarios.length,
      });
    } catch (error) {
      console.error("Error removing duplicates:", error);
      res.status(500).json({ error: 'Failed to remove duplicate usuarios' });
    }
  }
  
  // Checkea si el usuario existe
  static async usuarioExiste(cedula: string) : Promise<boolean> {
    const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
    const usuarios: Usuario[] = JSON.parse(data);
    return usuarios.some(u => u.ci === cedula);
  }

  // Checkea si el usuario existe por nombre
  static async usuarioExisteByName(nombre: string): Promise<boolean> {
    const data = await fs.readFile(UsuariosController.DATA_PATH, 'utf-8');
    const usuarios: Usuario[] = JSON.parse(data);
    return usuarios.some(u => u.nombre === nombre);
  }
}