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
### DELETE: /usuarios
#### borra un usuario
#### body: {"nombre": "Franco Gargaglioni"}
## Horarios:
### GET: /horarios
#### devuelve todos los horarios prioritarios y los usuarios anotados a ellos
### POST: /horarios
#### agrega un nuevo horario prioritario, con usuarios incluidos opcionalmente
#### body: {"Lunes-5:00": "" } o {"Lunes-5:00": ["Franco Gargaglioni", "Federico Abdo"]}
### PUT: /horarios
#### modifica un horario existente
#### body: {"Lunes-5:00": ["Franco Gargaglioni" , "Federico Abdo"]} 
### DELETE: /horarios
#### borra un horario prioritario existente
#### body: {"horario":"Lunes-8:00"}
## Reservas:
### GET: /reservas
#### devuelve todas las reservas de el dia actual
### POST: /reservas
#### agrega una reserva a un horario especifico
#### body: {"hora": "20:30", "usuario": "Franco Gargaglioni"}
### DELETE: /reservas
#### borra una reserva de un usuario especifico
#### body: {"hora": "20:30", "usuario": "Franco Gargaglioni"}
