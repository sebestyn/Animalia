import express from "express";
const app = express();
import { Schema, model, connect } from "mongoose";
import { config } from "dotenv";
config();

app.use(express.static("public"));

//DATABASE
var szekrenySchema = new Schema({
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

//INFO OLDAL
app.get("/info", function (req, res) {
  res.render("info.ejs");
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
      var leaders = leader.leaders;
      res.render("leaderboard.ejs", {
        szekreny: szekreny,
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
      var leaders = leader && leader.leaders ? leader.leaders.slice(0, 3) : [];
      res.render("start.ejs", { szekreny: szekreny, leaders: leaders });
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
      res.render("play.ejs", {
        szekreny: szekreny,
        allatok: allatok,
        szamok: szamok,
        nevek: nevek,
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
    szekrenyDoc.leaders.push({
      nev: nev,
      pont: pont,
    });
    szekrenyDoc.leaders = sortObj(szekrenyDoc.leaders, "pont");
    szekrenyDoc.leaders.reverse();
    var index = szekrenyDoc.leaders.findIndex((x) => x.nev == nev);
    hanyadik = index + 1;
    await szekrenyDoc.save();
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
