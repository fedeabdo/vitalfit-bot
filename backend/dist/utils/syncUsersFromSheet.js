"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUsers = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const googleapis_1 = require("googleapis");
const passwordUtils_1 = require("./passwordUtils");
const path_1 = __importDefault(require("path"));
const SHEET_ID = "1ynBQOKwZaaUYAIdOyjeHTxNhqb9tYc_vwrD1rN5NSpk";
const RANGE = "Usuarios!A2:C";
const adminsPath = path_1.default.join(__dirname, "../data/admins.json");
const usersPath = path_1.default.join(__dirname, "../data/Usuarios.json");
const auth = new googleapis_1.google.auth.GoogleAuth({
    keyFile: "./src/utils/google-sheets.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const FIXED_USERS = [
    {
        username: "admin",
        password: "$2b$12$LejLWivBZSUBjARCXNh/rOvRzIl3ei1M52BNdKNuDvDyWUIxdgjXW",
        name: "admin",
        role: "admin",
    },
    {
        username: "nando",
        password: "$2b$12$2El1BfA06PC00kisY/HM4OMtRAO7cPJS6277hTOyz.hB61vyshdWG",
        name: "admin",
        role: "admin",
    },
    {
        username: "Profesor",
        password: "$2b$12$2El1BfA06PC00kisY/HM4OMtRAO7cPJS6277hTOyz.hB61vyshdWG",
        name: "profesor",
        role: "profesor",
    },
];
async function syncUsers() {
    console.log("Empezando la sincronización de usuarios desde Google Sheets...");
    const sheets = googleapis_1.google.sheets({ version: "v4", auth });
    const usuariosRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
    });
    const usuariosRows = usuariosRes.data.values ?? [];
    const usersForAuth = [];
    const usuarios = [];
    for (let i = 0; i < usuariosRows.length; i++) {
        const row = usuariosRows[i];
        try {
            const [nombre, username, ci] = row ?? [];
            if (typeof nombre !== "string" ||
                typeof username !== "string" ||
                typeof ci !== "string" ||
                !nombre.trim() ||
                !username.trim() ||
                !ci.trim()) {
                console.warn(`⚠️ Skipping invalid row ${i + 2}:`, row);
                continue;
            }
            usersForAuth.push({
                name: nombre.trim(),
                username: username.trim(),
                password: await (0, passwordUtils_1.hashPassword)(ci),
                role: "user",
            });
            usuarios.push({
                nombre: nombre.trim(),
                ci: ci.trim(),
            });
            console.log(`✅ Processed row ${i + 2}:`, row);
        }
        catch (err) {
            console.error(`❌ Error processing row ${i + 2}`, row, err);
        }
    }
    try {
        await fs_extra_1.default.writeJson(adminsPath, [...FIXED_USERS, ...usersForAuth], { spaces: 2 });
        await fs_extra_1.default.writeJson(usersPath, usuarios, { spaces: 2 });
    }
    catch (err) {
        console.error("❌ Error writing JSON files:", err);
        return;
    }
    console.log(`✅ Synced ${usersForAuth.length} users + ${FIXED_USERS.length} fixed users`);
    console.log(`✅ Generated Usuarios.json with ${usuarios.length} entries`);
    try {
        const horariosRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: "Horarios!A1:H",
        });
        const horariosRows = horariosRes.data.values ?? [];
        if (horariosRows.length < 2) {
            console.warn("No data found in Horarios sheet");
            return;
        }
        const header = horariosRows[0];
        const dayColumns = header.map((h, idx) => ({ day: h, idx })).filter((h, i) => i >= 2 && i <= 7);
        const dayMap = {
            LUNES: "Lunes",
            MARTES: "Martes",
            MIÉRCOLES: "Miércoles",
            JUEVES: "Jueves",
            VIERNES: "Viernes",
            SÁBADO: "Sábado",
        };
        const horariosObj = {};
        for (let i = 1; i < horariosRows.length; i++) {
            const row = horariosRows[i];
            const hour = row[0]?.trim();
            if (!hour)
                continue;
            for (const { day, idx } of dayColumns) {
                const name = row[idx]?.trim();
                if (name) {
                    const key = `${dayMap[day.toUpperCase()] || day}-${hour}`;
                    if (!horariosObj[key])
                        horariosObj[key] = [];
                    horariosObj[key].push(name);
                }
            }
        }
        const horariosPath = path_1.default.join(__dirname, "../data/HorariosPrioritarios.json");
        await fs_extra_1.default.writeJson(horariosPath, horariosObj, { spaces: 2 });
        console.log(`✅ Synced HorariosPrioritarios.json with ${Object.keys(horariosObj).length} horarios`);
    }
    catch (err) {
        console.error("❌ Error syncing HorariosPrioritarios.json:", err);
    }
}
exports.syncUsers = syncUsers;
if (require.main === module) {
    syncUsers();
}
