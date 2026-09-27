const express = require('express');
const cors = require('cors');

const app = express();

// CORS aktivieren (erforderlich für mHub im Browser)
app.use(cors());

// ==========================================
// 1. Manifest
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.0",
  "name": "mHub Custom Addon",
  "description": "Generisches mHub v2 Add-on Framework",
  "resources": ["catalog", "meta", "stream"],
  "types": ["series", "movie"],
  "idPrefixes": ["custom_"],
  "catalogs": [
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
// 2. Katalog & Suche
// ==========================================
function handleCatalog(req, res) {
  const { type, id, extra } = req.params;

  if (extra && extra.startsWith('search=')) {
    const searchQuery = decodeURIComponent(extra.split('=')[1]);
    console.log(`[mHub] Suche nach: "${searchQuery}"`);

    const mockResults = [
      {
        id: `custom_${searchQuery.toLowerCase().replace(/\s+/g, '-')}`,
        type: type || "series",
        name: `Ergebnis: ${searchQuery}`,
        poster: "https://via.placeholder.com/250x350.png?text=Poster",
        description: "Beispiel-Beschreibung"
      }
    ];

    return res.json({ metas: mockResults });
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

  const seriesName = id.replace('custom_', '');

  const videos = [
    {
      id: `${id}:1:1`,
      title: "S1:E1 - Der Anfang",
      season: 1,
      episode: 1,
      overview: "Die erste Episode der ersten Staffel."
    },
    {
      id: `${id}:1:2`,
      title: "S1:E2 - Das Abenteuer geht weiter",
      season: 1,
      episode: 2,
      overview: "Die zweite Episode der ersten Staffel."
    },
    {
      id: `${id}:2:1`,
      title: "S2:E1 - Rückkehr",
      season: 2,
      episode: 1,
      overview: "Auftakt der zweiten Staffel."
    }
  ];

  res.json({
    meta: {
      id: id,
      type: type || "series",
      name: `Serie: ${seriesName}`,
      poster: "https://via.placeholder.com/250x350.png?text=Poster",
      background: "https://via.placeholder.com/1280x720.png?text=Hintergrund",
      description: `Detaillierte Beschreibung der ausgewählten Serie (${seriesName}).`,
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
  console.log(`[mHub] Streams angefordert für Episode-ID: ${id}`);

  const parts = id.split(':');
  const season = parts[1] || '1';
  const episode = parts[2] || '1';

  const streams = [
    {
      title: `1080p | Direct MP4 (Staffel ${season} Ep ${episode})`,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    {
      title: `720p | HLS Stream (.m3u8)`,
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    }
  ];

  res.json({ streams: streams });
});

// ==========================================
// Server starten (Dynamischer Port für Render)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`mHub Add-on Server läuft auf Port ${PORT}!`);
  console.log(`=================================`);
});