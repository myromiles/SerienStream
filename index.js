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
  res.send(`<h1>🚀 mHub Scraper Server (v1.0.7) ist bereit!</h1><p>Manifest: <a href="/manifest.json">/manifest.json</a></p>`);
});

// ==========================================
// 1. Manifest
// ==========================================
const manifest = {
  "id": "org.mhub.customaddon",
  "version": "1.0.7",
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
// 2. Katalog Scraper
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

    $('a[href*="/serie/"]').each((i, el) => {
      const link = $(el).attr('href');
      const img = $(el).find('img');

      const title = img.attr('alt') || $(el).attr('title') \vert{}\vert{}$(el).text().trim();
      let poster = img.attr('data-src') || img.attr('src') || (img.attr('srcset') ? img.attr('srcset').split(' ')[0] : null);

      if (link && title && poster && metas.length < 30) {
        const slug = link.replace('/serie/stream/', '').replace('/serie/', '').replace(/^\//, '');

        if (poster.startsWith('/')) {
          poster = `${BASE_URL}${poster}`;
        }

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

    console.log(`[Scraper Success] ${metas.length} Serien gefunden.`);

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
// 3. Meta-Details (mit .description-text & img.img-fluid)
// ==========================================
app.get('/meta/:type/:id.json', async (req, res) => {
  const { id } = req.params;
  const seriesSlug = id.replace('custom_', '');
  const targetUrl = `${BASE_URL}/serie/stream/${seriesSlug}`;

  console.log(`[Meta Request] Lade Details für: ${seriesSlug}`);

  try {
    const response = await axios.get(targetUrl, { headers: HTTP_HEADERS, timeout: 8000 });
    const $ = cheerio.load(response.data);

    const title = $('h1').text().trim() || seriesSlug.replace(/-/g, ' ').toUpperCase();
    
    // Selektoren aus deinem HTML-Ausschnitt
    const description = $('.description-text').text().trim() \vert{}\vert{}$('.series-description p').text().trim() || 
                        `Serie: ${title}`;

    let poster = $('img.img-fluid').attr('data-src') \vert{}\vert{}$('img.img-fluid').attr('src');
    if (poster && poster.startsWith('/')) {
      poster = `${BASE_URL}${poster}`;
    }

    const videos = [];

    // Staffeln
    const seasons = [];
    $('a[data-season-pill]').each((i, el) => {
      const s = parseInt($(el).attr('data-season-pill'), 10);
      if (!isNaN(s) && !seasons.includes(s)) {
        seasons.push(s);
      }
    });

    // Episoden
    $('a[href*="/episode-"]').each((i, el) => {
      const href = $(el).attr('href');
      const match = href.match(/staffel-(\d+)\/episode-(\d+)/);
      if (match) {
        const season = parseInt(match[1], 10);
        const episode = parseInt(match[2], 10);
        const epTitle = $(el).attr('title') \vert{}\vert{}$(el).text().trim() || `Episode ${episode}`;
        const epId = `${id}:${season}:${episode}`;

        if (!videos.some(v => v.id === epId)) {
          videos.push({
            id: epId,
            title: `S${season}E${episode} - ${epTitle}`,
            season: season,
            episode: episode
          });
        }
      }
    });

    if (videos.length === 0 && seasons.length > 0) {
      seasons.forEach(s => {
        videos.push({
          id: `${id}:${s}:1`,
          title: `Staffel ${s} Folge 1`,
          season: s,
          episode: 1
        });
      });
    }

    return res.json({
      meta: {
        id: id,
        type: "series",
        name: title,
        poster: poster || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
        posterShape: "poster",
        description: description,
        videos: videos.length > 0 ? videos : [{ id: `${id}:1:1`, title: "Staffel 1 Episode 1", season: 1, episode: 1 }]
      }
    });

  } catch (error) {
    console.error(`[Meta Fehler] ${seriesSlug}:`, error.message);
    return res.json({
      meta: {
        id: id,
        type: "series",
        name: seriesSlug.replace(/-/g, ' ').toUpperCase(),
        poster: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
        posterShape: "poster",
        description: `Live Serie: ${seriesSlug}`,
        videos: [{ id: `${id}:1:1`, title: "Staffel 1 Episode 1", season: 1, episode: 1 }]
      }
    });
  }
});

// ==========================================
// 4. Streams (Parst Verfügbare Hoster wie VOE)
// ==========================================
app.get('/stream/:type/:id.json', async (req, res) => {
  const { id } = req.params; // Format: custom_slug:season:episode
  const parts = id.split(':');

  if (parts.length < 3) {
    return res.json({ streams: [] });
  }

  const slug = parts[0].replace('custom_', '');
  const season = parts[1];
  const episode = parts[2];
  const targetUrl = `${BASE_URL}/serie/stream/${slug}/staffel-${season}/episode-${episode}`;

  try {
    const response = await axios.get(targetUrl, { headers: HTTP_HEADERS, timeout: 8000 });
    const $ = cheerio.load(response.data);
    const streams = [];

    // Hoster auslesen (z.B. VOE über img.watch-link)
    $('img.watch-link').each((i, el) => {
      const providerName = $(el).attr('title') \vert{}\vert{}$(el).attr('alt') || 'Hoster';
      streams.push({
        name: `SerienStream (${providerName})`,
        title: `Öffne S${season}E${episode} auf ${providerName}`,
        externalUrl: targetUrl
      });
    });

    if (streams.length === 0) {
      streams.push({
        name: "SerienStream",
        title: `Öffne S${season}E${episode} auf SerienStream`,
        externalUrl: targetUrl
      });
    }

    return res.json({ streams });
  } catch (error) {
    return res.json({ streams: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
