import { Router } from 'express';
import { HorariosController, UsuariosController,  } from './controllers';

const router = Router();

router.get('/usuarios', UsuariosController.getUsuarios);
router.post('/usuarios', UsuariosController.addUsuario);

router.get('/horarios', HorariosController.getHorarios);

export default router;