import express from "express";
import { authenticateJWT } from "./middleware/authMiddleware";
import { AuthController } from "./Controllers/AuthController";
import { UsuariosController } from "./Controllers/UsuariosController";
import { HorariosController } from "./Controllers/HorariosController";
import { ReservaController } from "./Controllers/ReservasController";

const router = express.Router();

// Public routes (no authentication required)
router.post('/login', AuthController.login);
router.get("/createPassword", AuthController.createPassword);

// Protected routes (authentication required)
router.use(authenticateJWT); // Apply middleware to all routes below

// Usuarios routes
router.get('/usuarios', UsuariosController.getUsuarios);
router.post('/usuarios', UsuariosController.addUsuario);
router.delete('/usuarios', UsuariosController.deleteUsuario);
// Development-only route
router.get('/usuarios/removeDuplicates', UsuariosController.removeDuplicateUsuarios);

// Horarios routes
router.get('/horarios', HorariosController.getHorarios);
router.post('/horarios', HorariosController.addHorario);
router.delete('/horarios', HorariosController.deleteHorario);
router.put('/horarios', HorariosController.updateHorario);

// Reservas routes
router.get('/reservas', ReservaController.getReservas);
router.post('/reservas', ReservaController.addReserva);
router.delete('/reservas', ReservaController.deleteReserva);
// Development-only route
router.get('/reservas/reset', ReservaController.resetReservas);

export default router;