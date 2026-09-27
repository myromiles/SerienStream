const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const manifest = {
    id: 'org.custom.seriesranking',
    version: '1.0.0',
    name: 'Serien Rangliste',
    description: 'Zeigt die aktuelle Top-Serien-Rangliste mit Postern und Streams in Stremio an.',
    resources: ['catalog'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'top_series_catalog',
            name: 'Top Serien 2026'
        }
    ]
};

const seriesList = [
    { rank: 1, title: 'American Hostage' },
    { rank: 2, title: 'Trophy Wife' },
    { rank: 3, title: 'MobLand' },
    { rank: 4, title: 'Possession' },
    { rank: 5, title: 'Outlander: Blood of My Blood' },
    { rank: 6, title: 'Youth' },
    { rank: 7, title: 'American Horror Story' },
    { rank: 8, title: '4 Blocks' },
    { rank: 9, title: 'Brews Brothers' },
    { rank: 10, title: 'The Real Housewives of New York City' },
    { rank: 11, title: 'Toxic' }
];

// Hilfsfunktion: Wandelt Serientitel via Cinemeta in IMDb-Metadaten um
async function resolveCinemetaMeta(title, rank) {
    try {
        const query = encodeURIComponent(title);
        const res = await axios.get(`https://v3-cinemeta.strem.io/catalog/series/top/search=${query}.json`);
        
        if (res.data && res.data.metas && res.data.metas.length > 0) {
            const match = res.data.metas[0];
            return {
                id: match.id, // IMDb-ID (z. B. tt1234567)
                type: 'series',
                name: `#${rank} ${match.name}`,
                poster: match.poster,
                banner: match.banner,
                description: match.description
            };
        }
    } catch (err) {
        console.error(`Fehler beim Suchen von "${title}":`, err.message);
    }

    // Fallback, falls der Titel nicht bei Cinemeta gefunden wird
    return {
        id: `custom:${title.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'series',
        name: `#${rank} ${title}`,
        description: `Rang ${rank} in den Charts.`
    };
}

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id }) => {
    if (type === 'series' && id === 'top_series_catalog') {
        // Alle Titel parallel über Cinemeta auflösen
        const promises = seriesList.map(item => resolveCinemetaMeta(item.title, item.rank));
        const metas = await Promise.all(promises);

        return { metas };
    }
    return { metas: [] };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
