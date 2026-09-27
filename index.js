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
  res.send(`<h1>🚀 mHub Scraper Server (v1.0.5) ist bereit!</h1><p>Manifest: <a href="/manifest.json">/manifest.json</a></p>`);
});

// ==========================================
// 1. Manifest
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.5",
  "name": "SerienStream Live Addon",
  "description": "Live Scraper für SerienStream",
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
// 2. Live Scraper für das übergebene HTML-Format
// ==========================================
app.get('/catalog/:type/:id.json', async (req, res) => {
  console.log(`[Catalog Request] Starte Live-Scraping von ${BASE_URL}/beliebte-serien`);

  try {
    const response = await axios.get(`${BASE_URL}/beliebte-serien`, { 
      headers: HTTP_HEADERS,
      timeout: 8000 
    });

    const $ = cheerio.load(response.data);
    const metas = [];

    // Alle Links zu Serien durchsuchen
    $('a[href*="/serie/"]').each((i, el) => {
      const link = $(el).attr('href');
      const img = $(el).find('img');

      // Titel aus alt-Attribut oder Fallback holen
      const title = img.attr('alt') || $(el).attr('title') \vert{}\vert{}$(el).text().trim();
      
      // Bildpfad aus src oder srcset auslesen
      let poster = img.attr('src') || (img.attr('srcset') ? img.attr('srcset').split(' ')[0] : null);

      if (link && title && poster && metas.length < 30) {
        // Slug säubern (z. B. /serie/stream/american-hostage -> american-hostage)
        const slug = link.replace('/serie/stream/', '').replace('/serie/', '').replace(/^\//, '');

        // Relativen Pfad (/media/images/...) zur vollständigen URL zusammensetzen
        if (poster.startsWith('/')) {
          poster = `${BASE_URL}${poster}`;
        }

        // Duplikate filtern
        if (slug && !metas.some(m => m.id === `custom_${slug}`)) {
          metas.push({
            id: `custom_${slug}`,
            type: "series",
            name: title.trim(),
            poster: poster.trim(),
            posterShape: "poster",
            description: `Live von SerienStream: ${title.trim()}`
          });
        }
      }
    });

    console.log(`[Scraper Success] ${metas.length} Serien erfolgreich gecrapt!`);

    if (metas.length === 0) {
      throw new Error("Keine Serien im HTML gefunden.");
    }

    return res.json({ metas });

  } catch (error) {
    console.error('[Scraper Fehler]:', error.message);

    return res.json({
      metas: [
        {
          id: "custom_error_card",
          type: "series",
          name: "⚠️ Scraping-Fehler",
          poster: "https://via.placeholder.com/250x350/ff0000/ffffff?text=Blockiert",
          posterShape: "poster",
          description: `Grund: ${error.message}`
        }
      ]
    });
  }
});

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
