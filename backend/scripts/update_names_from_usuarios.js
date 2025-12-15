const fs = require('fs');
const path = require('path');

// Read both files
const adminsPath = path.join(__dirname, '../src/data/admins.json');
const usuariosPath = path.join(__dirname, '../src/data/Usuarios.json');

const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf-8'));
const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf-8'));

// Create a map of ci -> nombre from Usuarios.json
const ciToNombreMap = {};
usuarios.forEach(usuario => {
  ciToNombreMap[usuario.ci] = usuario.nombre;
});

// Track changes
let updated = 0;
let notFound = 0;

// Update admins.json
admins.forEach(admin => {
  // The name field currently contains the CI value
  // Check if we have a mapping for this CI in Usuarios.json
  if (ciToNombreMap[admin.name]) {
    admin.name = ciToNombreMap[admin.name];
    updated++;
  } else {
    notFound++;
  }
});

// Write back to admins.json
fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

console.log(`Updated ${updated} names from Usuarios.json`);
console.log(`${notFound} entries not found in Usuarios.json`);
