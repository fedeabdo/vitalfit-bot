"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuariosController = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const HorariosController_1 = require("./HorariosController");
const syncUsersFromSheet_1 = require("../utils/syncUsersFromSheet");
class UsuariosController {
    // Imprimir usuarios
    static async getUsuarios(req, res) {
        try {
            const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
            const usuarios = JSON.parse(data);
            const usuariosRes = usuarios.map(usuario => ({
                nombre: usuario.nombre,
                ci: " ",
            }));
            res.json(usuariosRes);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch Usuarios' });
            return;
        }
    }
    // Obtener nombre por cédula
    static async getNombreByCedula(cedula) {
        try {
            const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
            const usuarios = JSON.parse(data);
            const usuario = usuarios.find(u => u.ci === cedula);
            return usuario ? usuario.nombre : null;
        }
        catch (error) {
            console.error("Error fetching nombre by cedula:", error);
            throw new Error("Error fetching nombre by cedula");
        }
    }
    // Agregar usuario
    static async addUsuario(req, res) {
        try {
            const newUsuario = {
                nombre: req.body.nombre,
                ci: req.body.ci
            };
            const usuarioYaExiste = await UsuariosController.usuarioExiste(newUsuario.ci);
            if (usuarioYaExiste) {
                res.status(403).json({ error: 'Usuario ya existe' });
                return;
            }
            const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
            const usuarios = JSON.parse(data);
            usuarios.push(newUsuario);
            await promises_1.default.writeFile(UsuariosController.DATA_PATH, JSON.stringify(usuarios, null, 2));
            res.status(201).json(newUsuario);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create Usuario' });
            return;
        }
    }
    // Borrar Usuario
    static async deleteUsuario(req, res) {
        try {
            const nombre = req.body.nombre;
            const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
            const usuarios = JSON.parse(data);
            const usuarioToDelete = usuarios.find(u => u.nombre === nombre);
            if (!usuarioToDelete) {
                res.status(404).json({ error: `Usuario con nombre ${nombre} no encontrado` });
                return;
            }
            const filteredUsuarios = usuarios.filter(u => u.nombre !== nombre);
            await promises_1.default.writeFile(UsuariosController.DATA_PATH, JSON.stringify(filteredUsuarios, null, 2));
            await HorariosController_1.HorariosController.removeUserFromHorariosPrioritarios(usuarioToDelete.nombre);
            res.sendStatus(204);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al borrar usuario' });
            return;
        }
    }
    // Developer function: Remove duplicate usuarios
    static async removeDuplicateUsuarios(req, res) {
        try {
            const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
            const usuarios = JSON.parse(data);
            const uniqueUsuarios = Array.from(new Map(usuarios.map((u) => [u.ci, u])).values());
            await promises_1.default.writeFile(UsuariosController.DATA_PATH, JSON.stringify(uniqueUsuarios, null, 2));
            res.status(200).json({
                message: `Removed duplicates. ${usuarios.length - uniqueUsuarios.length} duplicates deleted.`,
                total: uniqueUsuarios.length,
            });
        }
        catch (error) {
            console.error("Error removing duplicates:", error);
            res.status(500).json({ error: 'Failed to remove duplicate usuarios' });
        }
    }
    // Checkea si el usuario existe
    static async usuarioExiste(cedula) {
        const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
        const usuarios = JSON.parse(data);
        return usuarios.some(u => u.ci === cedula);
    }
    // Checkea si el usuario existe por nombre
    static async usuarioExisteByName(nombre) {
        const data = await promises_1.default.readFile(UsuariosController.DATA_PATH, 'utf-8');
        const usuarios = JSON.parse(data);
        return usuarios.some(u => u.nombre === nombre);
    }
    static async syncUsers(req, res) {
        try {
            await (0, syncUsersFromSheet_1.syncUsers)();
            res.status(200).json({ message: 'Users synchronized from sheet successfully.' });
        }
        catch (error) {
            console.error("Error syncing users from sheet:", error);
            res.status(500).json({ error: 'Failed to sync users from sheet.' });
        }
    }
}
exports.UsuariosController = UsuariosController;
// Ruta para el archivo
UsuariosController.DATA_PATH = path_1.default.join(__dirname, '../data/Usuarios.json');
