import express from "express";
const app = express();
import { Schema, model, connect } from "mongoose";
import { config } from "dotenv";
config();

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//DATABASE
var szekrenySchema = new Schema({
  name: String,
  szekreny: Number,
  allatok: [
    {
      nev: String,
      szam: Number,
      url: String,
    },
  ],
});
var szekrenyDB = model("szekreny", szekrenySchema);

var leaderboardSchema = new Schema({
  szekreny: Number,
  leaders: [
    {
      nev: String,
      pont: Number,
      created: { type: Date, default: Date.now },
    },
  ],
});
var leaderDB = model("leader", leaderboardSchema);

//ADATBÁZIS CSATLAKOZÁS
connect(process.env.DB_URL);

//HOME OLDAL
app.get("/", function (req, res) {
  res.render("home.ejs");
});

//HOZZÁADÁS ADMIN OLDAL
app.get("/pushAdmin", function (req, res) {
  res.render("push.ejs");
});
app.post("/push", async function (req, res) {
  var szekreny = req.body.szekreny;
  var nev = req.body.nev;
  var szam = req.body.szam;
  var url = req.body.url;
  try {
    const szekrenyDoc = await szekrenyDB.findOne({ szekreny: szekreny });
    szekrenyDoc.allatok.push({
      nev: nev,
      szam: szam,
      url: url,
    });
    await szekrenyDoc.save();
    res.status(200).send({ success: nev });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Failed to save" });
  }
});

//LEADERTABLES
app.get("/:szekreny/leader", async function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (szekreny < 5 && szekreny > 0) {
    try {
      const data = await szekrenyDB.findOne({ szekreny: szekreny });
      const leader = await leaderDB.findOne({ szekreny: szekreny });
      var leaders = filterBySchoolYear(leader.leaders);
      leaders = sortObj(leaders, "pont");
      leaders.reverse();
      res.render("leaderboard.ejs", {
        szekreny: szekreny,
        roomName: data?.name || null,
        leaders: leaders,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error loading leaderboard");
    }
  } else {
    res.redirect("/");
  }
});

//START OLDAL
app.get("/:szekreny", async function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (szekreny <= 2 && szekreny > 0) {
    try {
      const data = await szekrenyDB.findOne({ szekreny: szekreny });
      const leader = await leaderDB.findOne({ szekreny: szekreny });
      var leaders =
        leader && leader.leaders ? filterBySchoolYear(leader.leaders) : [];
      leaders = sortObj(leaders, "pont");
      leaders.reverse();
      leaders = leaders.slice(0, 3);
      res.render("start.ejs", {
        szekreny: szekreny,
        roomName: data?.name || null,
        leaders: leaders,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error loading page");
    }
  } else {
    res.redirect("/");
  }
});

//PLAY OLDAL
app.get("/:szekreny/play", async function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (szekreny < 5 && szekreny > 0) {
    try {
      const data = await szekrenyDB.findOne({ szekreny: szekreny });
      var allatok = data.allatok;
      shuffle(allatok);
      allatok = allatok.slice(0, 10);
      var szamok = [];
      var nevek = [];
      data.allatok.forEach(function (allat) {
        szamok.push(allat.szam);
        nevek.push(allat.nev);
      });

      // Get existing player names from leaderboard
      const leaderData = await leaderDB.findOne({ szekreny: szekreny });
      const existingNames = leaderData
        ? leaderData.leaders.map((l) => l.nev)
        : [];

      res.render("play.ejs", {
        szekreny: szekreny,
        roomName: data?.name || null,
        allatok: allatok,
        szamok: szamok,
        nevek: nevek,
        existingNames: existingNames,
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Error loading game");
    }
  } else {
    res.redirect("/");
  }
});

//ÚJ EREDMÉNY MENTÉSE
app.post("/newResult", async function (req, res) {
  var szekreny = req.body.szekreny;
  var nev = req.body.nev;
  var pont = req.body.pont;
  var hanyadik = 0;
  try {
    const szekrenyDoc = await leaderDB.findOne({ szekreny: szekreny });

    // Check if player already exists
    const existingLeader = szekrenyDoc.leaders.find((x) => x.nev === nev);

    if (existingLeader) {
      // Update only if new score is higher
      if (pont > existingLeader.pont) {
        existingLeader.pont = pont;
        existingLeader.created = new Date(); // Update timestamp
      }
    } else {
      // Add new player
      szekrenyDoc.leaders.push({
        nev: nev,
        pont: pont,
      });
    }

    await szekrenyDoc.save();

    // Filter by school year and sort for ranking calculation
    var schoolYearLeaders = filterBySchoolYear(szekrenyDoc.leaders);
    schoolYearLeaders = sortObj(schoolYearLeaders, "pont");
    schoolYearLeaders.reverse();

    // Find player's rank by name (now guaranteed to be unique)
    var index = schoolYearLeaders.findIndex((x) => x.nev === nev);
    hanyadik = index + 1;

    res.status(200).send({ success: hanyadik });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Failed to save result" });
  }
});

// Clear DB
app.get("/db/clear", async function (req, res) {
  try {
    const data = await leaderDB.find({});
    for (const szekreny of data) {
      szekreny.leaders = [];
      await szekreny.save();
      console.log("Sikeres törlés (" + szekreny.szekreny + ")");
    }
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error clearing database");
  }
});

//FUNCTION
// GET CURRENT SCHOOL YEAR DATE RANGE
function getSchoolYearRange() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11 (0=January)

  let startYear, endYear;

  // If we're in September-December (months 8-11), school year started this year
  if (currentMonth >= 8) {
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    // If we're in January-August (months 0-7), school year started last year
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  const startDate = new Date(startYear, 8, 1); // September 1
  const endDate = new Date(endYear, 8, 1); // September 1 of next year (exclusive)

  return { startDate, endDate };
}

// FILTER LEADERS BY CURRENT SCHOOL YEAR
function filterBySchoolYear(leaders) {
  const { startDate, endDate } = getSchoolYearRange();
  return leaders.filter((leader) => {
    const createdDate = new Date(leader.created);
    return createdDate >= startDate && createdDate < endDate;
  });
}

//SHUFFLE ARRAY
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// SORT OBJECT IN ARRAY
function sortObj(array, key) {
  var arrayC = array;
  var sortedArray = [];
  var max = 0;
  var index = 0;

  while (arrayC.length != 0) {
    arrayC.forEach(function (szam, ind) {
      if (Number(szam[key]) > Number(max)) {
        max = szam[key];
        index = ind;
      }
    });
    max = 0;
    sortedArray.push(arrayC[index]);
    arrayC.splice(index, 1);
  }
  return sortedArray.reverse();
}

//SERVER INDÍTÁSA
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("ANIMALIA Server http://localhost:3000 Has Started!");
});
