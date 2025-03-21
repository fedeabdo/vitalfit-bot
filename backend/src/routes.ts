import { Router } from 'express';
import { HorariosController, ReservaController, UsuariosController,  } from './controllers';

const router = Router();

router.get('/usuarios', UsuariosController.getUsuarios);
router.post('/usuarios', UsuariosController.addUsuario);

router.get('/horarios', HorariosController.getHorarios);

router.get('/reserva', ReservaController.getReservas);
router.post('/reserva', ReservaController.addReserva);
router.delete('/reserva',ReservaController.deleteReserva);


export default router;