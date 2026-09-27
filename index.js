const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

const BASE_URL = 'https://serienstream.to';
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
};

// ==========================================
// 0. Statusseite
// ==========================================
app.get('/', (req, res) => {
  res.send(`<h1>🚀 mHub Scraper Server (v1.0.4) ist bereit!</h1><p>Manifest: <a href="/manifest.json">/manifest.json</a></p>`);
});

// ==========================================
// 1. Manifest (Neue ID zwingt Stremio zum Cache-Clear)
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.4",
  "name": "SerienStream Live Addon",
  "description": "Live Scraper für Serien",
  "resources": ["catalog", "meta", "stream"],
  "types": ["series"],
  "idPrefixes": ["custom_"],
  "catalogs": [
    {
      "type": "series",
      "id": "custom_live_serien",
      "name": "SerienStream - Beliebt (Live)"
    }
  ]
};

app.get('/manifest.json', (req, res) => res.json(manifest));

// ==========================================
// 2. Katalog Handler (Live Scraping)
// ==========================================
app.get('/catalog/:type/:id.json', async (req, res) => {
  const { id } = req.params;
  console.log(`[Catalog Request] Empfangen für ID: ${id}`);

  try {
    // Anfrage an die Zielseite senden
    const response = await axios.get(`${BASE_URL}/beliebte-serien`, { 
      headers: HTTP_HEADERS,
      timeout: 5000 
    });

    const $ = cheerio.load(response.data);
    const metas = [];

    // Links & Covers auslesen
    $('a[href^="/serie/"]').each((i, el) => {
      const link = $(el).attr('href');
      const title = $(el).attr('title') || $(el).find('h3').text().trim() \vert{}\vert{}$(el).text().trim();
      let poster = $(el).find('img').attr('data-src') \vert{}\vert{}$(el).find('img').attr('src');

      if (link && title && metas.length < 20) {
        const slug = link.replace('/serie/stream/', '').replace('/serie/', '');
        
        if (poster && !poster.startsWith('http')) {
          poster = `${BASE_URL}${poster}`;
        }

        if (slug && !metas.some(m => m.id === `custom_${slug}`)) {
          metas.push({
            id: `custom_${slug}`,
            type: "series",
            name: title,
            poster: poster || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
            posterShape: "poster",
            description: `Live von SerienStream`
          });
        }
      }
    });

    if (metas.length === 0) {
      throw new Error("Keine Serien im HTML gefunden (Struktur geändert oder Bot-Blockade)");
    }

    return res.json({ metas });

  } catch (error) {
    console.error('[Scraper Fehler]:', error.message);

    // Zeige eine sichtbare Fehler-Karte in Stremio/mHub an
    return res.json({
      metas: [
        {
          id: "custom_error_card",
          type: "series",
          name: "⚠️ Scraping-Fehler",
          poster: "https://via.placeholder.com/250x350/ff0000/ffffff?text=Blockiert",
          posterShape: "poster",
          description: `Grund: ${error.message}. Render-Server werden oft von Cloudflare blockiert.`
        }
      ]
    });
  }
});

// Fallback für optionale Parameter
app.get('/catalog/:type/:id/:extra.json', (req, res) => {
  res.redirect(`/catalog/${req.params.type}/${req.params.id}.json`);
});

// ==========================================
// 3. Meta-Details
// ==========================================
app.get('/meta/:type/:id.json', async (req, res) => {
  const { id } = req.params;
  const seriesSlug = id.replace('custom_', '');

  res.json({
    meta: {
      id: id,
      type: "series",
      name: seriesSlug.toUpperCase().replace(/-/g, ' '),
      poster: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
      posterShape: "poster",
      description: `Live Serie: ${seriesSlug}`,
      videos: [
        { id: `${id}:1:1`, title: "Staffel 1 Episode 1", season: 1, episode: 1 }
      ]
    }
  });
});

// ==========================================
// 4. Streams
// ==========================================
app.get('/stream/:type/:id.json', (req, res) => {
  res.json({
    streams: [
      {
        title: "Test Stream MP4",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
