const express = require("express");
const { db } = require("./db.js")
const moment = require("moment");
const app = express();

function sanitize(s) {
  return s;
}

app.use(express.json());

/*
store in db
{ 
  latest: 
  {
      lvl: 50,
      xp: 123,
      datetime: date
  }
  history: [
    {
      lvl: 50,
      xp: 123,
      datetime: date
    }
  ]

send
[
 {
  name: "hej",
  lvl: 50,
  xp: 123,
  maxXP: 123,
  xpPerHour: 50
 }
]

*/

const xpPerLvl = {
  "0": [0, 0],
  "1": [400, 0],
  "2": [900, 400],
  "3": [1400, 1300],
  "4": [2100, 2700],
  "5": [2800, 4800],
  "6": [3600, 7600],
  "7": [4500, 11200],
  "8": [5400, 15700],
  "9": [6500, 21100],
  "10": [7600, 27600],
  "11": [8700, 35200],
  "12": [9800, 43900],
  "13": [11000, 53700],
  "14": [12300, 64700],
  "15": [13600, 77000],
  "16": [15000, 90600],
  "17": [16400, 105600],
  "18": [17800, 122000],
  "19": [19300, 139800],
  "20": [20800, 159100],
  "21": [22400, 179900],
  "22": [24000, 202300],
  "23": [25500, 226300],
  "24": [27200, 251800],
  "25": [28900, 279000],
  "26": [30500, 307900],
  "27": [32200, 338400],
  "28": [33900, 370600],
  "29": [36300, 404500],
  "30": [38800, 440800],
  "31": [41600, 479600],
  "32": [44600, 521200],
  "33": [48000, 565800],
  "34": [51400, 613800],
  "35": [55000, 665200],
  "36": [58700, 720200],
  "37": [62400, 778900],
  "38": [66200, 841300],
  "39": [70200, 907500],
  "40": [74300, 977700],
  "41": [78500, 1052000],
  "42": [82800, 1130500],
  "43": [87100, 1213300],
  "44": [91600, 1300400],
  "45": [96300, 1392000],
  "46": [101000, 1488300],
  "47": [105800, 1589300],
  "48": [110700, 1695100],
  "49": [115700, 1805800],
  "50": [120900, 1921500],
  "51": [126100, 2042400],
  "52": [131500, 2168500],
  "53": [137000, 2300000],
  "54": [142500, 2437000],
  "55": [148200, 2579500],
  "56": [154000, 2727700],
  "57": [159900, 2881700],
  "58": [165800, 3041600],
  "59": [172000, 3207400],
  "60": [290000, 3379400],
  "61": [317000, 3669400],
  "62": [349000, 3986400],
  "63": [386000, 4335400],
  "64": [428000, 4721400],
  "65": [475000, 5149400],
  "66": [527000, 5624400],
  "67": [585000, 6151400],
  "68": [648000, 6736400],
  "69": [717000, 7384400],
  "70": [1523800, 8101400],
  "71": [1539600, 9625200],
  "72": [1555700, 11164800],
  "73": [1571800, 12720500],
  "74": [1587900, 14292300],
  "75": [1604200, 15880200],
  "76": [1620700, 17484400],
  "77": [1637400, 19105100],
  "78": [1653900, 20742500],
  "79": [1670800, 22396400],
  "80": [0, 24067200]
}

const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

const r = /.*%(?<name>.*)\?(?<lvl>.*)=(?<xp>.*)%/;

function calcXPH(player) {
  const maxXP = player.latest.xp;
  const maxLvl = player.latest.lvl;
  let minXP = 0;
  let minLvl = 0;
  let minTime = 0;

  const now = moment().unix();
  const hourAgo = now - 3600;
  // get xp an hour ago, list should be sorted in order of longest ago first
  for (let i = 0; i < player.history.length; i++) {
    if (player.history[i].datetime < hourAgo) {
      continue
    } else {
      minXP = player.history[i].xp;
      minLvl = player.history[i].lvl;
      minTime = player.history[i].datetime;
      break;
    }
  }

  if (minLvl == 0 || minXP == 0 || minTime == 0) {
    return 0;
  }

  const totalMin = xpPerLvl[minLvl][1] + minXP;
  const totalMax = xpPerLvl[maxLvl][1] + maxXP;

  const xpGotten = totalMax - totalMin;
  const xph = (xpGotten / (now - minTime)) * 3600; // xp / timepassed * hourinseconds

  return xph;
}

// register player for racing
app.post("/register", async (req, res) => {
  const playerName = sanitize(req.body.name);
  let team = sanitize(req.body.team);
  const key = sanitize(req.body.key);
  const del = req.body.del;

  console.log(`Inc regsiter '${playerName}' '${team}' '${key}' '${del}'`);

  if (key != "881045") {
    console.log("unauthorized register")
    return res.status(400).send("unauthorized register");
  }

  if (!team) {
    team = "";
  }
  
  if (!playerName) {
    console.log("no name submitted")
    return res.status(400).send("no name submitted");
  }

  const row = await db.getPlayer(playerName);
  if (del) {
    if (row) {
      db.deletePlayer(row.id, team, row.info);
    }
  } else {
    if (row) {
      console.log("player already registered, applying team")
      //return res.status(400).send("player already registered");
      db.writePlayer(row.id, team, row.info);
    } else {
      db.writePlayer(playerName, team, {latest: {}, history: []});
    }
  }

  res.sendStatus(200);
});

// Get all players
app.get("/", async (req, res) => {
  const allPlayers = await db.getLeaderboard();

  const teamGrouping = {};

  const minuteAgo = moment().add(-1, "minute");

  const leaderboard = allPlayers.map(row => {
    const playerName = row.id;
    const team = row.team;
    const player = row.info;

    // return player
    if (isEmptyObject(player.latest)) {
      return {
        name: playerName,
        lvl: 0,
        xp: 0,
        maxXP: 0,
        xpPerHour: 0,
        latestUpdated: "no updates",
        team: team,
        totalXP: 0
      }
    } else {
      const xpPerHour = calcXPH(player);

      // init teamleaderboard
      if (!(team in teamGrouping)) {
        teamGrouping[team] = {xp: 0, numPlayers: 0, xpPerHour: 0, latestUpdated: 0};
      }

      teamGrouping[team].xp += xpPerLvl[player.latest.lvl][1] + player.latest.xp;
      teamGrouping[team].numPlayers += 1;
      teamGrouping[team].xpPerHour += xpPerHour;
      if (teamGrouping[team].latestUpdated < player.latest.datetime) {
        teamGrouping[team].latestUpdated = player.latest.datetime;
      }

      return {
        name: playerName,
        lvl: player.latest.lvl,
        xp: player.latest.xp,
        maxXP: xpPerLvl[player.latest.lvl][0],
        xpPerHour: xpPerHour,
        latestUpdated: moment.unix(player.latest.datetime).format("YYYY-MM-DD HH:mm:ss"),
        live: moment.unix(player.latest.datetime) > minuteAgo,
        team: team,
        totalXP: xpPerLvl[player.latest.lvl][1] + player.latest.xp
      }
    }

  });

  // fix team leaderboard
  const teamLeaderboard = Object.keys(teamGrouping).map(team => {
    const avgTotalXP = teamGrouping[team].xp / teamGrouping[team].numPlayers;
    const xpPerHour = teamGrouping[team].xpPerHour / teamGrouping[team].numPlayers;
    let lvl = 0;
    let xp = 0;
    for (let i = 80; i > 0; i--) {
      if (avgTotalXP >= xpPerLvl[i][1]) {
        lvl = i;
        xp = avgTotalXP - xpPerLvl[i][1];
        break;
      }
    }

    const tlo = {
      team: team,
      lvl: lvl,
      xp: xp,
      maxXP: xpPerLvl[lvl][0],
      xpPerHour: xpPerHour,
      latestUpdated: moment.unix(teamGrouping[team].latestUpdated).format("YYYY-MM-DD HH:mm:ss"),
      live: moment.unix(teamGrouping[team].latestUpdated) > minuteAgo,
      totalXP: avgTotalXP
    }

    return tlo;
  });

  res.send({teamLeaderboard, leaderboard});
});

// Get team with players
app.get("/team/:id", async (req, res) => {
  const id = sanitize(req.params.id);
  const allPlayers = await db.getTeamLeaderboard(id);
  let latestUpdated = 0;

  const minuteAgo = moment().add(-1, "minute");

  const leaderboard = allPlayers.map(row => {
    const playerName = row.id;
    const team = row.team;
    const player = row.info;

    if (isEmptyObject(player.latest)) {
      return {
        name: playerName,
        lvl: 0,
        xp: 0,
        maxXP: 0,
        xpPerHour: 0,
        latestUpdated: "no updates",
        team: team,
        totalXP: 0
      }
    } else {
      const xpPerHour = calcXPH(player);

      if (latestUpdated < player.latest.datetime) {
        latestUpdated = player.latest.datetime;
      }
      
      return {
        name: playerName,
        lvl: player.latest.lvl,
        xp: player.latest.xp,
        maxXP: xpPerLvl[player.latest.lvl][0],
        xpPerHour: xpPerHour,
        latestUpdated: moment.unix(player.latest.datetime).format("YYYY-MM-DD HH:mm:ss"),
        live: moment.unix(player.latest.datetime) > minuteAgo,
        team: team,
        totalXP: xpPerLvl[player.latest.lvl][1] + player.latest.xp
      }
    }
  });

  const totalXP = leaderboard.reduce((acc, player) => {
    return acc + player.totalXP;
  }, 0);

  const teamXpPerHour = leaderboard.reduce((acc, player) => {
    return acc + player.xpPerHour;
  }, 0);

  const avgTotalXP = totalXP / leaderboard.length;
  const xpPerHour = teamXpPerHour / leaderboard.length;
  let lvl = 0;
  let xp = 0;
  for (let i = 80; i > 0; i--) {
    if (avgTotalXP >= xpPerLvl[i][1]) {
      lvl = i;
      xp = avgTotalXP - xpPerLvl[i][1];
      break;
    }
  }

  const dstr = moment.unix(latestUpdated).format("YYYY-MM-DD HH:mm:ss");

  res.send({team: id, maxXP: xpPerLvl[lvl][0], latestUpdated: dstr, live: moment.unix(latestUpdated) > minuteAgo, avgTotalXP, xp, lvl, xpPerHour, totalXP, leaderboard});
});

// Get a player
app.get("/:id", async (req, res) => {
  const id = sanitize(req.params.id);
  const row = await db.getPlayer(id);
  if (!row) {
    console.log("player not found")
    console.log(id);
    return res.sendStatus(400);
  }

  const playerName = row.id;
  const team = row.team;
  const player = row.info;

  const minuteAgo = moment().add(-1, "minute");

  if (isEmptyObject(player.latest)) {
    return res.send({
      name: playerName,
      lvl: 0,
      xp: 0,
      maxXP: 0,
      xpPerHour: 0,
      latestUpdated: "no updates",
      team: team,
      totalXP: 0,
      history: []
    });
  } else {
    const xpPerHour = calcXPH(player);

    return res.send({
      name: playerName,
      lvl: player.latest.lvl,
      xp: player.latest.xp,
      maxXP: xpPerLvl[player.latest.lvl][0],
      xpPerHour: xpPerHour,
      latestUpdated: moment.unix(player.latest.datetime).format("YYYY-MM-DD HH:mm:ss"),
      live: moment.unix(player.latest.datetime) > minuteAgo,
      team: team,
      totalXP: xpPerLvl[player.latest.lvl][1] + player.latest.xp,
      history: player.history.map(post => {
        return { xp: post.xp, lvl: post.lvl, datetime: post.datetime, totalXP: xpPerLvl[post.lvl][1] + post.xp }
      }).concat([{xp: player.latest.xp, lvl: player.latest.lvl, datetime: player.latest.datetime, totalXP: xpPerLvl[player.latest.lvl][1] + player.latest.xp}])
    });
  }
});

// Submit xp as player
app.post("/xp", async (req, res) => {
  const data = sanitize(req.body.data);
  if (!data) {
    console.log("empty data");
    return res.sendStatus(400);
  }
  console.log(`Got xp update string ${data}`);
  const m = data.match(r);
  if (!m) {
    console.log("regex no match");
    console.log(data);
    return res.sendStatus(400);
  }

  const name = m.groups.name.trim();
  const lvl = m.groups.lvl.trim();
  const xp = m.groups.xp.trim();
  let lvlInt;
  let xpInt;
  try {
    lvlInt = parseInt(lvl);
    xpInt = parseInt(xp);
  } catch (err) {
    console.log("xp or lvl not an int");
    console.log(data);
    return res.sendStatus(400);
  }
  if (lvlInt < 1 || lvlInt > 80) {
    console.log("lvl out of range");
    console.log(data);
    return res.sendStatus(400);
  }
  if (xpPerLvl[lvl][0] < xpInt) {
    console.log("xp out of range")
    console.log(data);
    return res.sendStatus(400);
  }

  const row = await db.getPlayer(name);
  if (!row) {
    console.log("player not found")
    console.log(playerName);
    return res.sendStatus(400);
  }

  const playerName = row.id;
  const team = row.team;
  const player = row.info;

  if (!isEmptyObject(player.latest)) {
    if (player.latest.lvl > lvlInt ||
      (player.latest.lvl == lvlInt && player.latest.xp > xp)) {
      console.log("xp lower than last time??")
      console.log(data);
      return res.sendStatus(400);
    }

    player.history.push(player.latest);
  }

  player.latest = {lvl: lvlInt, xp: xpInt, datetime: moment().unix()};

  // reduce to max 500
  if (player.history.length > 500) {
    player.history = player.history.slice(player.history.length - 500);
  }

  db.writePlayer(playerName, team, player);

  res.sendStatus(200);
});

/*
function adminLock(req, res, next) {
  //if (req.session.user) return next();
  res.sendStatus(401);
}
// ADMIN LOCKED
// update team, maybe other info in the future
app.post("/:id", adminLock, async (req, res) => {
  const id = sanitize(req.params.id);
  const team = sanitize(req.body.team);
  const row = await db.getPlayer(id);
  if (!row) {
    console.log("player not found")
    console.log(id);
    return res.sendStatus(400);
  }

  const playerName = row.id;
  const player = row.info;

  db.writePlayer(playerName, team, player);
  res.sendStatus(200);
});

app.delete("/:id", adminLock, async (req, res) => {
  const id = sanitize(req.params.id);
  await db.deletePlayer(id);
  res.sendStatus(200);
});
*/
/*

post /register - register new player
get / - get all players
get /:id - get a player
get /team/:id - get a team and all players in team
post /:id - update team 
post /xp - xp update on player

*/

app.use((req, res, next) => {
  next({
    status: 404,
    message: 'Not Found',
  });
})

app.use((err, req, res, next) => {
  console.log(`${req.protocol}://${req.get('host')}${req.originalUrl}`)
  if (err.message) console.error(err.message);
  if (err.stack) console.error(err.stack);
  if (err.status) { 
    console.error(err.status);
    return res.sendStatus(err.status);
  }
  res.sendStatus(500);
})

// start server
app.listen(process.env.HTTP_PORT, () => {
  console.log(`wowracing api listening on port ${process.env.HTTP_PORT}`)
})