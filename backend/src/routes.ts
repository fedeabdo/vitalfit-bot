import { Router } from 'express';
import {UsuariosController} from './Controllers/UsuariosController';
import {HorariosController} from './Controllers/HorariosController';
import {ReservaController} from './Controllers/ReservasController';

const router = Router();

router.get('/usuarios', UsuariosController.getUsuarios);
router.post('/usuarios', UsuariosController.addUsuario);
router.delete('/usuarios', UsuariosController.deleteUsuario);
//Develop only
router.get('/usuarios/removeDuplicates', UsuariosController.removeDuplicateUsuarios);

router.get('/horarios', HorariosController.getHorarios);
router.post('/horarios', HorariosController.addHorario);
router.delete('/horarios', HorariosController.deleteHorario);
router.put('/horarios', HorariosController.updateHorario);

router.get('/reservas', ReservaController.getReservas);
router.post('/reservas', ReservaController.addReserva);
router.delete('/reservas', ReservaController.deleteReserva);
//Develop only
router.get('/reservas/reset', ReservaController.resetReservas);


export default router;