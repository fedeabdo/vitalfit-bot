"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const roleMiddleware_1 = require("./middleware/roleMiddleware");
const AuthController_1 = require("./Controllers/AuthController");
const UsuariosController_1 = require("./Controllers/UsuariosController");
const HorariosController_1 = require("./Controllers/HorariosController");
const ReservasController_1 = require("./Controllers/ReservasController");
const router = express_1.default.Router();
// Public routes (no authentication required)
router.get('/health', (req, res) => {
    res.sendStatus(200);
});
router.post('/login', AuthController_1.AuthController.login);
router.post('/createPassword', AuthController_1.AuthController.createPassword);
router.options('/login', (req, res) => {
    res.sendStatus(200);
});
// Protected routes (authentication required)
router.use(authMiddleware_1.authenticateJWT); // Apply middleware to all routes below
// Usuarios routes
router.get('/usuarios', (0, roleMiddleware_1.authorizeRoles)('admin'), UsuariosController_1.UsuariosController.getUsuarios);
router.post('/usuarios', (0, roleMiddleware_1.authorizeRoles)('admin'), UsuariosController_1.UsuariosController.addUsuario);
router.delete('/usuarios', (0, roleMiddleware_1.authorizeRoles)('admin'), UsuariosController_1.UsuariosController.deleteUsuario);
router.post('/usuarios/sync', (0, roleMiddleware_1.authorizeRoles)('admin'), UsuariosController_1.UsuariosController.syncUsers);
// Development-only route
router.get('/usuarios/removeDuplicates', UsuariosController_1.UsuariosController.removeDuplicateUsuarios);
// Horarios routes
router.get('/horarios', (0, roleMiddleware_1.authorizeRoles)('admin'), HorariosController_1.HorariosController.getHorarios);
router.get('/horariosHoy', (0, roleMiddleware_1.authorizeRoles)('admin', 'user'), HorariosController_1.HorariosController.getHorariosHoy);
router.post('/horarios', (0, roleMiddleware_1.authorizeRoles)('admin'), HorariosController_1.HorariosController.addHorario);
router.delete('/horarios', (0, roleMiddleware_1.authorizeRoles)('admin'), HorariosController_1.HorariosController.deleteHorario);
router.put('/horarios', (0, roleMiddleware_1.authorizeRoles)('admin'), HorariosController_1.HorariosController.updateHorario);
// Reservas routes
router.get('/reservas', (0, roleMiddleware_1.authorizeRoles)('admin', 'profesor', 'user'), ReservasController_1.ReservaController.getReservas);
router.post('/reservas', (0, roleMiddleware_1.authorizeRoles)('admin', 'user'), ReservasController_1.ReservaController.addReserva);
router.put('/reservas', (0, roleMiddleware_1.authorizeRoles)('admin', 'user'), ReservasController_1.ReservaController.updateReserva);
router.delete('/reservas', (0, roleMiddleware_1.authorizeRoles)('admin', 'user'), ReservasController_1.ReservaController.deleteReserva);
router.get('/reservas/consulta/:cedula?', (0, roleMiddleware_1.authorizeRoles)('admin', 'user'), ReservasController_1.ReservaController.buscarHoraPorCedula);
router.get('/reservas/reset', (0, roleMiddleware_1.authorizeRoles)('admin'), ReservasController_1.ReservaController.resetReservas);
exports.default = router;
