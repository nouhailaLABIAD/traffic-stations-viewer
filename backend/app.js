const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const app = express();
const url = "mongodb://mongodb:27017";
const dbName = "traffic";
let db;

// Servir les fichiers statiques (CSS, etc.)
app.use(express.static(__dirname));

// Lire les templates HTML au démarrage
const layoutTemplate = fs.readFileSync(path.join(__dirname, "html", "layout.html"), "utf8");
const homeTemplate = fs.readFileSync(path.join(__dirname, "html", "home.html"), "utf8");
const importTemplate = fs.readFileSync(path.join(__dirname, "html", "import.html"), "utf8");
const mapTemplate = fs.readFileSync(path.join(__dirname, "html", "map.html"), "utf8");

// Fonction simple de remplacement
function render(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    if (key === "body") return data.body || "";
    // Si la clé existe dans data, on la remplace, sinon on garde la variable
    return data[key.trim()] !== undefined ? data[key.trim()] : `{{${key}}}`;
  });
}

// Connexion MongoDB
MongoClient.connect(url)
  .then((client) => {
    db = client.db(dbName);
    console.log("MongoDB connected");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

/* ─── PAGE D'ACCUEIL ────────────────────────────────────────── */
app.get("/", async (req, res) => {
  let count = 0,
    sample = [];
  try {
    count = await db.collection("stations").countDocuments();
    sample = await db.collection("stations").find().limit(3).toArray();
  } catch (e) {}

  const imported = count > 0;
  const keys = sample.length ? Object.keys(sample[0]).filter((k) => k !== "_id") : [];

  // Générer le tableau d'aperçu
  let tableRows = "";
  if (imported) {
    const headers = keys.map((k) => `<th>${k}</th>`).join("");
    const rows = sample
      .map(
        (row) =>
          `<tr>${keys.map((k) => `<td>${row[k] ?? ""}</td>`).join("")}</tr>`
      )
      .join("");
    tableRows = `
      <div class="card">
        <div class="section-title">Aperçu — 3 premières stations</div>
        <div class="tbl-wrap">
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    tableRows = `
      <div class="card">
        <div class="empty">
          <div class="icon">📭</div>
          <div>Aucune station dans MongoDB.<br/>Cliquez sur <strong>Importer les stations</strong>.</div>
        </div>
      </div>
    `;
  }

  const body = render(homeTemplate, {
    count: count.toLocaleString(),
    keysLength: keys.length || "—",
    importedClass: imported ? "" : "red",
    importedText: imported ? "✓ PRÊT" : "⚠ VIDE",
    content: tableRows,
  });

  const html = render(layoutTemplate, {
    title: "Home",
    homeActive: 'class="active"',
    importActive: "",
    mapActive: "",
    body: body,
  });

  res.send(html);
});

/* ─── IMPORT DES STATIONS ───────────────────────────────────── */
app.get("/import", (req, res) => {
  const csvPath = "/dataset/PeMSD7_M_Station_Info.csv";

  if (!fs.existsSync(csvPath)) {
    const body = render(importTemplate, {
      message: `<div class="msg err">✗ Fichier introuvable : <code>${csvPath}</code></div>`,
    });
    const html = render(layoutTemplate, {
      title: "Import",
      homeActive: "",
      importActive: 'class="active"',
      mapActive: "",
      body: body,
    });
    return res.send(html);
  }

  const results = [];
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", (data) => {
      delete data[""];
      results.push(data);
    })
    .on("end", async () => {
      try {
        await db.collection("stations").deleteMany({});
        await db.collection("stations").insertMany(results);

        const body = render(importTemplate, {
          message: `
            <div class="msg ok">✓ <strong>${results.length} stations</strong> importées</div>
            <div style="margin-top:20px">
              <a href="/map" class="btn btn-primary">Voir la carte →</a>
            </div>
          `,
        });
        const html = render(layoutTemplate, {
          title: "Import",
          homeActive: "",
          importActive: 'class="active"',
          mapActive: "",
          body: body,
        });
        res.send(html);
      } catch (e) {
        const body = render(importTemplate, {
          message: `<div class="msg err">Erreur MongoDB : ${e.message}</div>`,
        });
        const html = render(layoutTemplate, {
          title: "Import",
          homeActive: "",
          importActive: 'class="active"',
          mapActive: "",
          body: body,
        });
        res.send(html);
      }
    })
    .on("error", (e) => {
      const body = render(importTemplate, {
        message: `<div class="msg err">Erreur lecture CSV : ${e.message}</div>`,
      });
      const html = render(layoutTemplate, {
        title: "Import",
        homeActive: "",
        importActive: 'class="active"',
        mapActive: "",
        body: body,
      });
      res.send(html);
    });
});

/* ─── API JSON DES STATIONS ─────────────────────────────────── */
app.get("/api/stations", async (req, res) => {
  try {
    const stations = await db.collection("stations").find().toArray();
    res.json(stations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── CARTE INTERACTIVE ─────────────────────────────────────── */
app.get("/map", async (req, res) => {
  try {
    const count = await db.collection("stations").countDocuments();
    let body;
    if (count === 0) {
      body = mapTemplate.replace("{{ifEmpty}}", "").replace("{{else}}", "").replace("{{end}}", "");
    } else {
      body = mapTemplate
        .replace(/{{ifEmpty}}.*?{{else}}/s, "")
        .replace("{{end}}", "");
    }
    const html = render(layoutTemplate, {
      title: "Carte",
      homeActive: "",
      importActive: "",
      mapActive: 'class="active"',
      body: body,
    });
    res.send(html);
  } catch (e) {
    const body = `<div class="msg err">Erreur : ${e.message}</div>`;
    const html = render(layoutTemplate, {
      title: "Carte",
      homeActive: "",
      importActive: "",
      mapActive: 'class="active"',
      body: body,
    });
    res.send(html);
  }
});

app.listen(3000, () => console.log("Server running on :3000"));