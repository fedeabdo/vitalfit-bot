# vitalfit-bot

## Tutorial: https://bot-whatsapp.netlify.app/docs/


# Backend:
## start: npm run dev
## Endpoints:
## Usuarios:
### GET: /usuarios
#### devuelve todos los usuarios y sus datos
### POST: /usuarios
#### agrega un usuario
#### body: {"nombre": "ejemplo", "ci": 1234567}
### GET: /horarios
#### devuelve todos los horarios prioritarios y los usuarios anotados a ellos
### GET: /reservas
#### devuelve todas las reservas de el dia actual
### POST: /reservas
#### agrega una reserva a un horario especifico
#### body: {"hora": "20:30", "usuario": "Franco Gargaglioni"}
### DELETE: /reservas
#### Borra una reserva de un usuario especifico
#### body: {"hora": "20:30", "usuario": "Franco Gargaglioni"}