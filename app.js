import express from "express";
const app = express();
import { Schema, model, connect } from "mongoose";
import { config } from "dotenv";
import session from "express-session";
config();

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  res.redirect("/admin/login");
}

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

//ADMIN LOGIN PAGE
app.get("/admin/login", function (req, res) {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect("/admin");
  }
  res.render("admin-login.ejs", { error: null });
});

//ADMIN LOGIN POST
app.post("/admin/login", function (req, res) {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    res.redirect("/admin");
  } else {
    res.render("admin-login.ejs", { error: "Helytelen jelszó!" });
  }
});

//ADMIN LOGOUT
app.get("/admin/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/admin/login");
});

//ADMIN DASHBOARD
app.get("/admin", requireAuth, async function (req, res) {
  try {
    const szekrenys = await szekrenyDB.find({}).sort({ szekreny: 1 });
    const leaders = await leaderDB.find({});

    // Combine data
    const data = szekrenys.map((szekreny) => {
      const leaderData = leaders.find((l) => l.szekreny === szekreny.szekreny);
      return {
        _id: szekreny._id.toString(),
        szekreny: szekreny.szekreny,
        name: szekreny.name || "",
        allatok: szekreny.allatok.map((a) => ({
          nev: a.nev,
          szam: a.szam,
          url: a.url || "",
        })),
        leaders: leaderData
          ? leaderData.leaders.map((l) => ({
              nev: l.nev,
              pont: l.pont,
              created: l.created,
            }))
          : [],
      };
    });

    res.render("admin.ejs", { szekrenysData: data });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading admin page");
  }
});

//CREATE NEW SZEKRENY
app.post("/admin/szekreny/create", requireAuth, async function (req, res) {
  const { szekreny, name } = req.body;
  try {
    // Check if szekreny number already exists
    const existing = await szekrenyDB.findOne({ szekreny: Number(szekreny) });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Ez a szekrény szám már létezik!" });
    }

    // Create new szekreny
    const newSzekreny = new szekrenyDB({
      szekreny: Number(szekreny),
      name: name || "",
      allatok: [],
    });
    await newSzekreny.save();

    // Create corresponding leaderboard
    const newLeader = new leaderDB({
      szekreny: Number(szekreny),
      leaders: [],
    });
    await newLeader.save();

    res.json({
      success: true,
      message: "Szekrény sikeresen létrehozva!",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: "Hiba történt!" });
  }
});

//SAVE SZEKRENY DATA - Overwrites entire szekreny and its leaders
app.put("/admin/szekreny/:id/save", requireAuth, async function (req, res) {
  const { id } = req.params;
  const { name, allatok, leaders } = req.body;

  try {
    // Update szekreny
    const szekreny = await szekrenyDB.findById(id);
    if (!szekreny) {
      return res
        .status(404)
        .json({ success: false, error: "Szekrény nem található!" });
    }

    szekreny.name = name || "";
    szekreny.allatok = allatok.map((a) => ({
      nev: a.nev,
      szam: Number(a.szam),
      url: a.url || "",
    }));
    await szekreny.save();

    // Update leaders
    const leaderDoc = await leaderDB.findOne({ szekreny: szekreny.szekreny });
    if (leaderDoc) {
      leaderDoc.leaders = leaders.map((l) => ({
        nev: l.nev,
        pont: Number(l.pont),
        created: l.created ? new Date(l.created) : new Date(),
      }));
      await leaderDoc.save();
    }

    res.json({ success: true, message: "Adatok sikeresen mentve!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: "Hiba történt!" });
  }
});

//DELETE SZEKRENY
app.delete("/admin/szekreny/:id", requireAuth, async function (req, res) {
  const { id } = req.params;
  try {
    const szekreny = await szekrenyDB.findById(id);
    if (!szekreny) {
      return res
        .status(404)
        .json({ success: false, error: "Szekrény nem található!" });
    }

    // Delete leaderboard too
    await leaderDB.deleteOne({ szekreny: szekreny.szekreny });
    await szekrenyDB.findByIdAndDelete(id);

    res.json({ success: true, message: "Szekrény törölve!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: "Hiba történt!" });
  }
});

//HOME OLDAL
app.get("/", function (req, res) {
  res.render("home.ejs");
});

//LEADERTABLES
app.get("/:szekreny/leader", async function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (isNaN(szekreny) || szekreny <= 0) {
    return res.redirect("/");
  }

  try {
    const data = await szekrenyDB.findOne({ szekreny: szekreny });
    if (!data) {
      return res.redirect("/");
    }

    const leader = await leaderDB.findOne({ szekreny: szekreny });
    var leaders = leader ? filterBySchoolYear(leader.leaders) : [];
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
});

//START OLDAL
app.get("/:szekreny", async function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (isNaN(szekreny) || szekreny <= 0) {
    return res.redirect("/");
  }

  try {
    const data = await szekrenyDB.findOne({ szekreny: szekreny });
    if (!data) {
      return res.redirect("/");
    }

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
});

//PLAY OLDAL
app.get("/:szekreny/play", async function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (isNaN(szekreny) || szekreny <= 0) {
    return res.redirect("/");
  }

  try {
    const data = await szekrenyDB.findOne({ szekreny: szekreny });
    if (!data) {
      return res.redirect("/");
    }

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
