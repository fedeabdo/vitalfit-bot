import express from "express";
import { authenticateJWT } from './middleware/authMiddleware';
import { authorizeRoles } from './middleware/roleMiddleware';

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
router.post('/createPassword', AuthController.createPassword);
router.options(
    '/login', 
    (req: Request, res: Response) => {
      res.sendStatus(200);
    }
  );


// Protected routes (authentication required)
router.use(authenticateJWT); // Apply middleware to all routes below

// Usuarios routes
router.get('/usuarios', authorizeRoles('admin'), UsuariosController.getUsuarios);
router.post('/usuarios', authorizeRoles('admin'), UsuariosController.addUsuario);
router.delete('/usuarios', authorizeRoles('admin'), UsuariosController.deleteUsuario);
router.post('/usuarios/sync', authorizeRoles('admin'), UsuariosController.syncUsers);
// Development-only route
router.get('/usuarios/removeDuplicates', UsuariosController.removeDuplicateUsuarios);

// Horarios routes
router.get('/horarios', authorizeRoles('admin'), HorariosController.getHorarios);
router.get('/horariosHoy', authorizeRoles('admin', 'user'), HorariosController.getHorariosHoy);
router.post('/horarios', authorizeRoles('admin'), HorariosController.addHorario);
router.delete('/horarios', authorizeRoles('admin'), HorariosController.deleteHorario);
router.put('/horarios', authorizeRoles('admin'), HorariosController.updateHorario);

// Reservas routes
router.get('/reservas', authorizeRoles('admin', 'profesor', 'user'), ReservaController.getReservas);
router.post('/reservas', authorizeRoles('admin', 'user'), ReservaController.addReserva);
router.put('/reservas', authorizeRoles('admin', 'user'), ReservaController.updateReserva);
router.delete('/reservas', authorizeRoles('admin', 'user'), ReservaController.deleteReserva);
router.get('/reservas/consulta/:cedula?', authorizeRoles('admin', 'user'), ReservaController.buscarHoraPorCedula);
router.get('/reservas/reset', authorizeRoles('admin'), ReservaController.resetReservas);

export default router;