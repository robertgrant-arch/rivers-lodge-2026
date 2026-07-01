import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows: users } = await client.query("SELECT id, name, email, role FROM users");
console.log("Users:", JSON.stringify(users, null, 2));
const { rows: members } = await client.query("SELECT id, user_id, member_number, tier, active FROM members");
console.log("Members:", JSON.stringify(members, null, 2));
await client.end();
