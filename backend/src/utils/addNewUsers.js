const fs = require("fs");

const DEFAULT_PASSWORD_HASH =
  "$2b$12$AZByEpyCc4Zd416.G5vqR.2TcJIXZudPWXlHUQNwxZqYmBv3mfdBm";

// ---------- helpers ----------
function normalizeUsername(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ---------- load files ----------
const rawList = require("./newUsers");
const existingUsers = JSON.parse(
  fs.readFileSync("./src/data/admins.json", "utf8")
);

// ---------- index existing users ----------
const existingByUsername = new Map(
  existingUsers.map(u => [normalizeUsername(u.username), u])
);

// ---------- build merged list (ORDER PRESERVED) ----------
const mergedUsers = [];

rawList.split("\n").forEach(line => {
  if (!line.trim()) return;

  const [name, username] = line.split("\t");

  const normalizedUsername = normalizeUsername(username);

  // 1️⃣ if user already exists → keep it
  if (existingByUsername.has(normalizedUsername)) {
    mergedUsers.push(existingByUsername.get(normalizedUsername));
  } 
  // 2️⃣ else → create new user
  else {
    mergedUsers.push({
      username: normalizedUsername,
      password: DEFAULT_PASSWORD_HASH,
      role: "user",
      name: name.trim()
    });
  }
});

// ---------- save ----------
fs.writeFileSync(
  "mergedUsers.json",
  JSON.stringify(mergedUsers, null, 2),
  "utf8"
);

console.log(`✅ Done`);
console.log(`• Source list size: ${rawList.split("\n").length}`);
console.log(`• Existing users: ${existingUsers.length}`);
console.log(`• Final merged users: ${mergedUsers.length}`);
