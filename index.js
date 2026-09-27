const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// Basis-URL der Zielseite & Standard-Header (gegen Bot-Sperren)
const BASE_URL = 'https://serienstream.to';
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
};

// ==========================================
// 0. Statusseite
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>mHub SerienStream Scraper</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #fff; text-align: center; padding-top: 50px; }
          a { color: #00d2ff; text-decoration: none; font-weight: bold; }
          .card { background: #1e1e1e; display: inline-block; padding: 30px; border-radius: 10px; border: 1px solid #333; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 mHub Live Scraper (v1.0.3) ist online!</h1>
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
  "version": "1.0.3",
  "name": "SerienStream Live Addon",
  "description": "Live Scraper für Serien & Streams",
  "resources": ["catalog", "meta", "stream"],
  "types": ["series"],
  "idPrefixes": ["custom_"],
  "catalogs": [
    {
      "type": "series",
      "id": "custom_trending",
      "name": "Beliebte Serien (Live)"
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
// 2. Katalog Scraper (Startseite & Beliebte Serien)
// ==========================================
async function handleCatalog(req, res) {
  const { type, id, extra } = req.params;
  console.log(`[Catalog Request] Type: ${type}, ID: ${id}`);

  try {
    // 1. HTML der Serien-Übersicht abrufen
    const response = await axios.get(`${BASE_URL}/beliebte-serien`, { headers: HTTP_HEADERS });
    const $ = cheerio.load(response.data);
    const metas = [];

    // 2. HTML-Elemente parsen (Serien-Karten durchsuchen)
    $('.seriesListContainer div, .catalog .item, a[href^="/serie/"]').each((i, el) => {
      const link = $(el).attr('href') \vert{}\vert{}$(el).find('a').attr('href');
      const title = $(el).find('h3').text().trim() || $(el).attr('title') \vert{}\vert{}$(el).text().trim();
      let poster = $(el).find('img').attr('data-src') \vert{}\vert{}$(el).find('img').attr('src');

      if (link && link.startsWith('/serie/') && title && metas.length < 20) {
        const seriesSlug = link.replace('/serie/stream/', '').replace('/serie/', '');
        
        if (poster && !poster.startsWith('http')) {
          poster = `${BASE_URL}${poster}`;
        }

        // Duplikate vermeiden
        if (!metas.some(m => m.id === `custom_${seriesSlug}`)) {
          metas.push({
            id: `custom_${seriesSlug}`,
            type: "series",
            name: title,
            poster: poster || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
            posterShape: "poster",
            description: `Live gecrapt aus SerienStream: ${title}`
          });
        }
      }
    });

    return res.json({ metas });
  } catch (error) {
    console.error('[Catalog Error]', error.message);
    // Fallback falls die Seite Blockaden / Timeout hat
    return res.json({ metas: [] });
  }
}

app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra.json', handleCatalog);

// ==========================================
// 3. Meta-Details Scraper (Staffeln & Folgen)
// ==========================================
app.get('/meta/:type/:id.json', async (req, res) => {
  const { id } = req.params;
  const seriesSlug = id.replace('custom_', '');
  console.log(`[Meta Request] Scrape Details für Slug: ${seriesSlug}`);

  try {
    const url = `${BASE_URL}/serie/stream/${seriesSlug}`;
    const response = await axios.get(url, { headers: HTTP_HEADERS });
    const $ = cheerio.load(response.data);

    const title = $('h1').text().trim() || seriesSlug;
    const description = $('.series-description').text().trim() || 'Keine Beschreibung verfügbar.';
    let poster = $('.seriesCoverBox img').attr('data-src') \vert{}\vert{}$('.seriesCoverBox img').attr('src');

    if (poster && !poster.startsWith('http')) {
      poster = `${BASE_URL}${poster}`;
    }

    // Staffeln & Episoden auslesen
    const videos = [];
    $('#stream ul li a').each((i, el) => {
      const epTitle = $(el).text().trim();
      const epHref = $(el).attr('href'); // z. B. /serie/stream/game-of-thrones/staffel-1/episode-1

      if (epHref) {
        videos.push({
          id: `custom_${seriesSlug}:${epHref}`,
          title: epTitle || `Episode ${i + 1}`,
          season: 1,
          episode: i + 1
        });
      }
    });

    return res.json({
      meta: {
        id,
        type: "series",
        name: title,
        poster,
        posterShape: "poster",
        description,
        videos: videos.length > 0 ? videos : [
          { id: `${id}:staffel-1/episode-1`, title: "Staffel 1 Episode 1", season: 1, episode: 1 }
        ]
      }
    });
  } catch (error) {
    console.error('[Meta Error]', error.message);
    return res.json({
      meta: {
        id,
        type: "series",
        name: seriesSlug.toUpperCase(),
        description: "Fehler beim Laden der Live-Metadaten.",
        videos: []
      }
    });
  }
});

// ==========================================
// 4. Stream Scraper (Video Hoster Links)
// ==========================================
app.get('/stream/:type/:id.json', async (req, res) => {
  const { id } = req.params;
  console.log(`[Stream Request] ID: ${id}`);

  // Dummy Fallback Stream für Testzwecke
  res.json({
    streams: [
      {
        title: "Direct MP4 Stream",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }
    ]
  });
});

// ==========================================
// Server Start
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper Server läuft auf Port ${PORT}`));
