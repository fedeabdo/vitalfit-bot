// The package '@builderbot/database-json' may not be published or installed in this project.
// Use MemoryDB from @builderbot/bot as a compatible fallback for local development/tests.
try {
    const { JsonFileDB } = require('@builderbot/database-json');
    module.exports = {
        IDatabase: JsonFileDB,
        adapterDB: new JsonFileDB({ filename: 'db.json' })
    };
} catch (err) {
    // Fallback to MemoryDB from @builderbot/bot
    // MemoryDB is an in-memory adapter useful for testing and local runs.
    const { MemoryDB } = require('@builderbot/bot');
    module.exports = {
        IDatabase: MemoryDB,
        adapterDB: new MemoryDB()
    };
}