// @ts-check
const Pool = require("pg").Pool
if (process.env.PG_USER === undefined || process.env.PG_DB === undefined || process.env.PG_PW === undefined || process.env.PG_HOST === undefined) {
  throw new Error("Missing postgres credentials");
}
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  password: process.env.PG_PW,
  port: 5432,
});

const db = {};

db["getLeaderboard"] = async function () {
  const { rows } = await pool.query("SELECT * FROM leaderboard", []);
  console.log(rows);
  if (!rows) {
    return [];
  }
  return rows;
};

db["getTeamLeaderboard"] = async function (team) {
  const { rows } = await pool.query("SELECT * FROM leaderboard WHERE team = $1", [team]);
  console.log(rows);
  if (!rows) {
    return [];
  }
  return rows;
};

db["getPlayer"] = async function (playerName) {
  const { rows } = await pool.query("SELECT * FROM leaderboard WHERE id = $1", [playerName]);
  console.log(rows);
  if (rows.length > 0) {
    return rows[0];
  } else {
    return false;
  }
};

//const db = JSON.parse(fs.readFileSync(join(__dirname, "db.json")).toString());
db["writePlayer"] = function (player, team, info) {
  return pool.query("INSERT INTO leaderboard (id, team, info) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET info = $3", [player, team, info]);
};

module.exports = { db };