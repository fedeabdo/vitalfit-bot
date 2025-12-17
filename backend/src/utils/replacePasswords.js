const fs = require('fs');

const users = JSON.parse(fs.readFileSync("./src/data/admins.json", "utf8"));
const hashes = JSON.parse(fs.readFileSync("./createPasswordResults.json", "utf8"));

if (users.length !== hashes.length) {
  throw new Error(
    `Length mismatch: users=${users.length}, hashes=${hashes.length}`
  );
}

const updatedUsers = users.map((user, index) => ({
  ...user,
  password: hashes[index], 
}));

fs.writeFileSync(
  "./users.updated.json",
  JSON.stringify(updatedUsers, null, 2),
  "utf8"
);

console.log("✅ Passwords replaced successfully");
console.log(`👥 Users processed: ${updatedUsers.length}`);

run();

