"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HorariosController = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const UsuariosController_1 = require("./UsuariosController");
const timeUtils_1 = require("../utils/timeUtils");
class HorariosController {
    // Imprimir Horarios
    static async getHorarios(req, res) {
        try {
            const data = await promises_1.default.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios = JSON.parse(data);
            res.json(horarios);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al imprimir horarios' });
            return;
        }
    }
    static async getHorariosHoy(req, res) {
        try {
            const now = new Date();
            let diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(now);
            let isTomorrow = false;
            // If it's Sunday and after 13:00, or any day after 20:30, use tomorrow's day
            if ((0, timeUtils_1.esDomingoALas13)() || (0, timeUtils_1.esMasDeLas2030)()) {
                now.setDate(now.getDate() + 1);
                diaActual = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(now);
                isTomorrow = true;
            }
            const diaActualLower = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(now).toLowerCase();
            const data = await promises_1.default.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios = JSON.parse(data);
            // Read BackupReservas.json to get reservation data
            const backupData = await promises_1.default.readFile(HorariosController.DATA_PATH_RESERVAS_BACKUP, 'utf-8');
            const backupReservas = JSON.parse(backupData);
            const result = Object.keys(horarios)
                .filter(key => key.toLowerCase().includes(diaActualLower))
                .map(key => {
                const parts = key.split('-');
                if (parts.length === 2) {
                    const hora = parts[1];
                    const reservas = backupReservas[hora] || [];
                    const lugaresDisponibles = 6 - reservas.length;
                    console.log(`Hora: ${hora}, Reservas: ${reservas.length}, Lugares Disponibles: ${lugaresDisponibles} faltanMasDe4Horas: ${(0, timeUtils_1.faltanMasDe4Horas)(hora)}`);
                    return {
                        hora,
                        disponible: reservas.length <= 5 || (0, timeUtils_1.faltanMasDe4Horas)(hora),
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
        }
        catch (error) {
            res.status(500).json({ error: 'Error al imprimir horarios de hoy' });
            return;
        }
    }
    static isTiempo(key) {
        const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
        return dias.some(dia => key.startsWith(`${dia}-`));
    }
    // Agregar horario
    static async addHorario(req, res) {
        try {
            const raw = req.body;
            const keys = Object.keys(raw);
            if (keys.length !== 1) {
                res.status(400).json({ error: 'No se puede agregar mas de un horario a la vez' });
                return;
            }
            const key = keys[0];
            const usuarios = raw[key];
            if (!HorariosController.isTiempo(key)) {
                res.status(400).json({ error: 'Formato de horario invalido' });
                return;
            }
            // New validation: if key already exists, return error
            const data = await promises_1.default.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios = JSON.parse(data);
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
            const horario = {
                [key]: usuarios
            };
            horarios[key] = usuarios;
            await promises_1.default.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
            res.status(201).json(horario);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al agregar un nuevo horario' });
            return;
        }
    }
    // Update horario
    static async updateHorario(req, res) {
        try {
            const raw = req.body;
            const keys = Object.keys(raw);
            if (keys.length !== 1) {
                res.status(400).json({ error: 'No se puede modificar mas de un horario a la vez' });
                return;
            }
            const key = keys[0];
            const usuarios = raw[key];
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
                if (!UsuariosController_1.UsuariosController.usuarioExiste(usuario)) {
                    res.status(400).json({ error: `Usuario: ${usuario} no existe en la base de datos` });
                    return;
                }
            });
            const horario = {
                [key]: usuarios
            };
            const data = await promises_1.default.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios = JSON.parse(data);
            horarios[key] = usuarios;
            await promises_1.default.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
            res.status(201).json(horario);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al agregar un nuevo horario' });
            return;
        }
    }
    // Borrar horario
    static async deleteHorario(req, res) {
        try {
            const horarioABorrar = req.body.horario;
            if (!HorariosController.isTiempo(horarioABorrar)) {
                throw new Error(`Horario invalido: ${horarioABorrar}`);
            }
            const data = await promises_1.default.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            let horarios = JSON.parse(data);
            if (!(horarioABorrar in horarios)) {
                console.log(`El horario  "${horarioABorrar}" no existe.`);
                return;
            }
            delete horarios[horarioABorrar];
            await promises_1.default.writeFile(HorariosController.DATA_PATH_HORARIOS, JSON.stringify(horarios, null, 2));
            console.log(`Horario "${horarioABorrar}" borrado.`);
            res.sendStatus(204);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al borrar horario' });
            return;
        }
    }
    static async usuarioPrioritario(usuario, dia) {
        try {
            const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const data = await promises_1.default.readFile(HorariosController.DATA_PATH_HORARIOS, 'utf-8');
            const horarios = JSON.parse(data);
            return Object.entries(horarios).some(([key, value]) => key.toLowerCase().startsWith(dia) &&
                value.some(u => normalize(u).toLowerCase() === normalize(usuario).toLowerCase()));
        }
        catch (error) {
            throw error;
        }
    }
    // Remove user from HorariosPrioritarios
    static async removeUserFromHorariosPrioritarios(nombre) {
        const dataPath = path_1.default.join(__dirname, '../data/HorariosPrioritarios.json');
        const data = await promises_1.default.readFile(dataPath, 'utf-8');
        const horarios = JSON.parse(data);
        for (const key in horarios) {
            horarios[key] = horarios[key].filter((user) => user !== nombre);
        }
        await promises_1.default.writeFile(dataPath, JSON.stringify(horarios, null, 2));
    }
}
exports.HorariosController = HorariosController;
HorariosController.DATA_PATH_HORARIOS = path_1.default.join(__dirname, '../data/HorariosPrioritarios.json');
HorariosController.DATA_PATH_RESERVAS_BACKUP = path_1.default.join(__dirname, '../data/BackupReservas.json');
function removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
