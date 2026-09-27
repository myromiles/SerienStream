const express = require('express');
const cors = require('cors');

const app = express();

// CORS aktivieren, damit mHub aus dem Browser zugreifen kann
app.use(cors());

// ==========================================
// 0. Startseite / Statusseite
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
          <h1>🚀 mHub Add-on (v1.0.1) ist online!</h1>
          <p>Füge folgende URL in deine mHub-App ein:</p>
          <p><a href="/manifest.json" target="_blank">https://mhub-addon.onrender.com/manifest.json</a></p>
        </div>
      </body>
    </html>
  `);
});

// ==========================================
// 1. Manifest (Version auf 1.0.1 erhöht)
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.1",
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

app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

// ==========================================
// 2. Katalog Handler (Startseite & Suche)
// ==========================================
function handleCatalog(req, res) {
  const { type, id, extra } = req.params;
  console.log(`[mHub Catalog] Anforderung -> type: ${type}, id: ${id}, extra: ${extra}`);

  // Fall A: Suche
  if (extra && extra.includes('search=')) {
    const searchQuery = decodeURIComponent(extra.split('search=')[1].split('&')[0]);
    console.log(`[mHub] Suche nach: "${searchQuery}"`);

    const mockResults = [
      {
        id: `custom_${searchQuery.toLowerCase().replace(/\s+/g, '_')}`,
        type: type || "series",
        name: `Ergebnis: ${searchQuery}`,
        poster: "https://via.placeholder.com/250x350.png?text=Poster",
        description: `Suchergebnis für: ${searchQuery}`
      }
    ];

    return res.json({ metas: mockResults });
  }

  // Fall B: "Angesagte Serien" auf der Startseite
  if (id === 'custom_trending' || (id && id.includes('trending'))) {
    console.log(`[mHub] Sende Angesagte Serien an mHub...`);

    const trendingSeries = [
      {
        id: "custom_breaking_bad",
        type: "series",
        name: "Breaking Bad",
        poster: "https://image.tmdb.org/t/p/w500/ztSc2ma23O9P2L1Y2x4S5jQ1P5.jpg",
        description: "Ein Chemielehrer wird zum Meth-Hersteller."
      },
      {
        id: "custom_stranger_things",
        type: "series",
        name: "Stranger Things",
        poster: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn88q921Su.jpg",
        description: "Mysteriöse Vorfälle in einer Kleinstadt."
      },
      {
        id: "custom_game_of_thrones",
        type: "series",
        name: "Game of Thrones",
        poster: "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyve4z0wH08M.jpg",
        description: "Der Kampf um den Eisernen Thron."
      }
    ];

    return res.json({ metas: trendingSeries });
  }

  res.json({ metas: [] });
}

// Flexible Routen für Express 5
app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra.json', handleCatalog);

// ==========================================
// 3. Meta-Details (Staffeln & Episoden)
// ==========================================
app.get('/meta/:type/:id.json', (req, res) => {
  const { type, id } = req.params;
  console.log(`[mHub] Meta-Details angefordert für ID: ${id}`);

  const seriesName = id.replace('custom_', '').replace(/_/g, ' ');

  const videos = [
    {
      id: `${id}:1:1`,
      title: "S1:E1 - Der Anfang",
      season: 1,
      episode: 1,
      overview: "Die erste Episode der Serie."
    },
    {
      id: `${id}:1:2`,
      title: "S1:E2 - Die Fortsetzung",
      season: 1,
      episode: 2,
      overview: "Die zweite Episode der Serie."
    }
  ];

  res.json({
    meta: {
      id: id,
      type: type || "series",
      name: seriesName.toUpperCase(),
      poster: "https://via.placeholder.com/250x350.png?text=Poster",
      background: "https://via.placeholder.com/1280x720.png?text=Hintergrund",
      description: `Beschreibung und Detailansicht für ${seriesName}.`,
      genres: ["Drama", "Action"],
      releaseInfo: "2024",
      videos: videos
    }
  });
});

// ==========================================
// 4. Streams (Video-Links)
// ==========================================
app.get('/stream/:type/:id.json', (req, res) => {
  const { type, id } = req.params;
  console.log(`[mHub] Streams angefordert für Episode: ${id}`);

  const parts = id.split(':');
  const season = parts[1] || '1';
  const episode = parts[2] || '1';

  const streams = [
    {
      title: `1080p | MP4 Stream (Staffel ${season} Ep ${episode})`,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    {
      title: `720p | HLS Live Stream (.m3u8)`,
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    }
  ];

  res.json({ streams: streams });
});

// ==========================================
// Server starten
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`mHub Add-on Server läuft auf Port ${PORT}!`);
  console.log(`=================================`);
});
