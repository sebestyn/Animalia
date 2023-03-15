const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

//USE
app.use(express.static("public"));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 100000,
  })
);
app.use(express.json({ limit: "100mb" }));

//DATABASE
var szekrenySchema = new mongoose.Schema({
  szekreny: Number,
  allatok: Array,
});
var szekrenyDB = mongoose.model("szekreny", szekrenySchema);

var leaderboardSchema = new mongoose.Schema({
  szekreny: Number,
  leaders: [
    {
      nev: String,
      pont: Number,
      created: { type: Date, default: Date.now() },
    },
  ],
});
var leaderDB = mongoose.model("leader", leaderboardSchema);

//ADATBÁZIS CSATLAKOZÁS
const db_url = process.env.DB_URL;
mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true });

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
app.post("/push", function (req, res) {
  var szekreny = req.body.szekreny;
  var nev = req.body.nev;
  var szam = req.body.szam;
  var url = req.body.url;
  szekrenyDB.findOne({ szekreny: szekreny }, function (err, szekreny) {
    if (err) {
      console.log(err);
    } else {
      szekreny.allatok.push({
        nev: nev,
        szam: szam,
        url: url,
      });
      szekreny.save(function (err, data) {
        if (err) {
          console.log(err);
        }
      });
    }
  });
  res.status(200).send({ success: nev });
});

//LEADERTABLES
app.get("/:szekreny/leader", function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (szekreny < 5 && szekreny > 0) {
    szekrenyDB.findOne({ szekreny: szekreny }, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        leaderDB.findOne({ szekreny: szekreny }, function (err, leader) {
          if (err) {
            console.log(err);
          } else {
            var leaders = leader.leaders;
            res.render("leaderboard.ejs", {
              szekreny: szekreny,
              leaders: leaders,
            });
          }
        });
      }
    });
  } else {
    res.redirect("/");
  }
});

//START OLDAL
app.get("/:szekreny", function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (szekreny <= 2 && szekreny > 0) {
    szekrenyDB.findOne({ szekreny: szekreny }, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        leaderDB.findOne({ szekreny: szekreny }, function (err, leader) {
          if (err) {
            console.log(err);
          } else {
            var leaders =
              leader && leader.leaders ? leader.leaders.slice(0, 3) : [];
            res.render("start.ejs", { szekreny: szekreny, leaders: leaders });
          }
        });
      }
    });
  } else {
    res.redirect("/");
  }
});

//PLAY OLDAL
app.get("/:szekreny/play", function (req, res) {
  var szekreny = Number(req.params.szekreny);
  if (szekreny < 5 && szekreny > 0) {
    szekrenyDB.findOne({ szekreny: szekreny }, function (err, data) {
      if (err) {
        console.log(err);
      } else {
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
      }
    });
  } else {
    res.redirect("/");
  }
});
//ÚJ EREDMÉNY MENTÉSE
app.post("/newResult", function (req, res) {
  var szekreny = req.body.szekreny;
  var nev = req.body.nev;
  var pont = req.body.pont;
  var hanyadik = 0;
  leaderDB.findOne({ szekreny: szekreny }, function (err, szekreny) {
    if (err) {
      console.log(err);
    } else {
      szekreny.leaders.push({
        nev: nev,
        pont: pont,
      });
      szekreny.leaders = sortObj(szekreny.leaders, "pont");
      szekreny.leaders.reverse();
      var index = szekreny.leaders.findIndex((x) => x.nev == nev);
      hanyadik = index + 1;
      szekreny.save(function (err) {
        if (err) {
          console.log(err);
        } else {
          res.status(200).send({ success: hanyadik });
        }
      });
    }
  });
});

// Clear DB
app.get("/db/clear", function (req, res) {
  leaderDB.find({}, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      data.forEach(function (szekreny) {
        szekreny.leaders = [];
        szekreny.save(function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("Sikeres törlés (" + szekreny.szekreny + ")");
          }
        });
      });
    }
  });

  res.redirect("/");
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
