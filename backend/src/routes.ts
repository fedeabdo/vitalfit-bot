import express from "express";
import { authenticateJWT } from "./middleware/authMiddleware";
import { AuthController } from "./Controllers/AuthController";
import { UsuariosController } from "./Controllers/UsuariosController";
import { HorariosController } from "./Controllers/HorariosController";
import { ReservaController } from "./Controllers/ReservasController";
import { Request, Response } from 'express';


const router = express.Router();

// Public routes (no authentication required)

router.get('/health', (req: Request, res: Response) => {
  res.sendStatus(200);
});
router.post('/login', AuthController.login);
router.options(
    '/login', 
    (req: Request, res: Response) => {
      res.sendStatus(200);
    }
  );
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
router.get('/horariosHoy', HorariosController.getHorariosHoy);
router.post('/horarios', HorariosController.addHorario);
router.delete('/horarios', HorariosController.deleteHorario);
router.put('/horarios', HorariosController.updateHorario);

// Reservas routes
router.get('/reservas', ReservaController.getReservas);
router.post('/reservas', ReservaController.addReserva);
router.put('/reservas', ReservaController.updateReserva);
router.delete('/reservas', ReservaController.deleteReserva);
router.get('/reservas/consulta/:cedula', ReservaController.buscarHoraPorCedula);
// Development-only route
router.get('/reservas/reset', ReservaController.resetReservas);

export default router;