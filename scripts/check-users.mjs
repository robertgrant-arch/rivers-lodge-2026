import { createConnection } from "/home/ubuntu/rivers-lodge/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js";

const conn = await createConnection(process.env.DATABASE_URL);
const [users] = await conn.execute("SELECT id, name, email, role FROM users");
console.log("Users:", JSON.stringify(users, null, 2));
const [members] = await conn.execute("SELECT id, user_id, member_number, tier, active FROM members");
console.log("Members:", JSON.stringify(members, null, 2));
await conn.end();
