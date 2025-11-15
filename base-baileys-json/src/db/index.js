// Re-export the project's existing json-database module for compatibility.
// json-database.js already implements a fallback to MemoryDB if file adapter not present.
const db = require('../../json-database');
module.exports = db;
