"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faltanMasDe4Horas = exports.esDomingoALas13 = exports.esMasDeLas2030 = void 0;
function esMasDeLas2030() {
    const now = new Date();
    return now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30);
}
exports.esMasDeLas2030 = esMasDeLas2030;
function esDomingoALas13() {
    const now = new Date();
    return now.getDay() === 0 && (now.getHours() > 13 || (now.getHours() === 13 && now.getMinutes() > 0));
}
exports.esDomingoALas13 = esDomingoALas13;
function faltanMasDe4Horas(hora) {
    const now = new Date();
    const [horaStr, minutoStr] = hora.split(':');
    const reservaDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(horaStr), parseInt(minutoStr));
    if (esMasDeLas2030() || esDomingoALas13()) {
        reservaDate.setDate(reservaDate.getDate() + 1);
    }
    const diffInMs = reservaDate.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours > 4;
}
exports.faltanMasDe4Horas = faltanMasDe4Horas;
