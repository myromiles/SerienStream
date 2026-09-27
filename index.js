const express = require('express');
const cors = require('cors');

const app = express();

// CORS aktivieren, damit mHub aus dem Browser zugreifen kann
app.use(cors());

// ==========================================
// 1. Manifest (Startseite + Suche)
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.0",
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

  // Fall A: Die Suche wurde benutzt
  if (extra && extra.startsWith('search=')) {
    const searchQuery = decodeURIComponent(extra.split('=')[1]);
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

  // Fall B: "Angesagte Serien" direkt auf der Startseite
  if (id === 'custom_trending') {
    console.log(`[mHub] Laden der Angesagten Serien für die Startseite`);

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

// Getrennte Routen für Express 5 Kompatibilität
app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra.json', handleCatalog);

// ==========================================
// 3. Meta-Details (Staffeln & Episoden)
// ==========================================
app.get('/meta/:type/:id.json', (req, res) => {
  const { type, id } = req.params;
  console.log(`[mHub] Meta-Details angefordert für ID: ${id}`);

  // Serienname aus der ID formatieren
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
// 4. Streams (Video-Links beim Abspielen)
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
// Server auf Port von Render (oder 3000) starten
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`mHub Add-on Server läuft auf Port ${PORT}!`);
  console.log(`=================================`);
});
