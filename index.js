const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// ==========================================
// 0. Status-Startseite
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>mHub Add-on Status</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #fff; text-align: center; padding-top: 50px; }
          a { color: #00d2ff; text-decoration: none; font-weight: bold; }
          .card { background: #1e1e1e; display: inline-block; padding: 30px; border-radius: 10px; border: 1px solid #333; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 mHub Add-on (v1.0.2) ist online!</h1>
          <p>Manifest-URL für Stremio / mHub:</p>
          <p><a href="/manifest.json" target="_blank">https://mhub-addon.onrender.com/manifest.json</a></p>
        </div>
      </body>
    </html>
  `);
});

// ==========================================
// 1. Manifest
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.2",
  "name": "mHub Custom Addon",
  "description": "mHub v2 Add-on mit Angesagten Serien",
  "resources": ["catalog", "meta", "stream"],
  "types": ["series", "movie"],
  "idPrefixes": ["custom_"],
  "catalogs": [
    {
      "type": "series",
      "id": "custom_trending",
      "name": "Angesagte Serien"
    },
    {
      "type": "series",
      "id": "custom_search",
      "name": "Suche",
      "extra": [{ "name": "search", "isRequired": true }]
    }
  ]
};

app.get('/manifest.json', (req, res) => res.json(manifest));

// ==========================================
// 2. Katalog Handler (Startseite & Suche)
// ==========================================
function handleCatalog(req, res) {
  const { type, id, extra } = req.params;

  // Fall A: Suche
  if (extra && extra.includes('search=')) {
    const searchQuery = decodeURIComponent(extra.split('search=')[1].split('&')[0]);

    return res.json({
      metas: [
        {
          id: `custom_${searchQuery.toLowerCase().replace(/\s+/g, '_')}`,
          type: type || "series",
          name: searchQuery,
          poster: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
          posterShape: "poster",
          description: `Suchergebnis für ${searchQuery}`
        }
      ]
    });
  }

  // Fall B: Startseite (Angesagte Serien)
  if (id === 'custom_trending' || (id && id.includes('trending'))) {
    const trendingSeries = [
      {
        id: "custom_breaking_bad",
        type: "series",
        name: "Breaking Bad",
        poster: "https://m.media-amazon.com/images/M/MVBmM2FlOWIxYjctYzA4MC00NWU5LWIyYTgtYTI2YmNhNjM0MWNhXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
        posterShape: "poster",
        description: "Ein Chemielehrer wird zum Meth-Hersteller."
      },
      {
        id: "custom_stranger_things",
        type: "series",
        name: "Stranger Things",
        poster: "https://m.media-amazon.com/images/M/MVBMjE3MDg5OTgtYTE2NS00Y2NhLTg5NTItZmVhY2JhN2M5NTI2XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
        posterShape: "poster",
        description: "Mysteriöse Vorfälle in einer Kleinstadt."
      },
      {
        id: "custom_game_of_thrones",
        type: "series",
        name: "Game of Thrones",
        poster: "https://m.media-amazon.com/images/M/MVBMDdmMTBiYTItYTAwXi00YjA4LTg3MDItZGQ3Nzg1ZGFmN2U0XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
        posterShape: "poster",
        description: "Der Kampf um den Eisernen Thron."
      }
    ];

    return res.json({ metas: trendingSeries });
  }

  res.json({ metas: [] });
}

app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra.json', handleCatalog);

// ==========================================
// 3. Meta-Details
// ==========================================
app.get('/meta/:type/:id.json', (req, res) => {
  const { type, id } = req.params;
  const seriesName = id.replace('custom_', '').replace(/_/g, ' ');

  res.json({
    meta: {
      id: id,
      type: type || "series",
      name: seriesName.toUpperCase(),
      poster: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
      posterShape: "poster",
      background: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80",
      description: `Detailansicht für ${seriesName}.`,
      videos: [
        { id: `${id}:1:1`, title: "S1:E1 - Episode 1", season: 1, episode: 1 },
        { id: `${id}:1:2`, title: "S1:E2 - Episode 2", season: 1, episode: 2 }
      ]
    }
  });
});

// ==========================================
// 4. Streams
// ==========================================
app.get('/stream/:type/:id.json', (req, res) => {
  const parts = req.params.id.split(':');
  const season = parts[1] || '1';
  const episode = parts[2] || '1';

  res.json({
    streams: [
      {
        title: `BigBuckBunny Teststream (S${season} E${episode})`,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
