import { Router } from 'express';
import {UsuariosController} from './Controllers/UsuariosController';
import {HorariosController} from './Controllers/HorariosController';
import {ReservaController} from './Controllers/ReservasController';

const router = Router();

router.get('/usuarios', UsuariosController.getUsuarios);
router.post('/usuarios', UsuariosController.addUsuario);
router.delete('/usuarios', UsuariosController.deleteUsuario);

router.get('/horarios', HorariosController.getHorarios);
router.post('/horarios', HorariosController.addHorario);
router.delete('/horarios', HorariosController.deleteHorario);

router.get('/reservas', ReservaController.getReservas);
router.post('/reservas', ReservaController.addReserva);
router.delete('/reservas', ReservaController.deleteReserva);


export default router;