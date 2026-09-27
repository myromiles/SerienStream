const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// 1. Manifest definieren
const manifest = {
    id: 'org.custom.seriesranking',
    version: '1.0.0',
    name: 'Serien Rangliste',
    description: 'Zeigt die aktuelle Top-Serien-Rangliste in Stremio an.',
    resources: ['catalog', 'meta'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'top_series_catalog',
            name: 'Top Serien 2026'
        }
    ]
};

// Statische Daten aus dem Scrape (oder dynamisch per Funktion abrufbar)
const seriesList = [
    { rank: 1, title: 'American Hostage', path: '/serie/american-hostage/staffel-1' },
    { rank: 2, title: 'Trash-TV 2026', path: '/serie/trashtvwaskeinersehenwl/staffel-24' },
    { rank: 3, title: 'Trophy Wife', path: '/serie/trophy-wife/staffel-1' },
    { rank: 4, title: 'MobLand', path: '/serie/mobland/staffel-2' },
    { rank: 5, title: 'Possession', path: '/serie/possession/staffel-1' },
    { rank: 6, title: 'Outlander: Blood of My Blood', path: '/serie/outlander-blood-of-my-blood/staffel-2' },
    { rank: 7, title: 'Youth', path: '/serie/youth/staffel-1' },
    { rank: 8, title: 'American Horror Story', path: '/serie/american-horror-story-die-dunkle-seite-in-dir/staffel-13' },
    { rank: 9, title: 'Trash-TV 2026 (S23)', path: '/serie/trashtvwaskeinersehenwl/staffel-23' },
    { rank: 10, title: '4 Blocks Zero', path: '/serie/4-blocks-zero/staffel-1' },
    { rank: 11, title: 'Brews Brothers', path: '/serie/brews-brothers/staffel-1' },
    { rank: 12, title: 'The Real Housewives of NY', path: '/serie/the-real-housewives-of-new-york-city/staffel-16' },
    { rank: 13, title: 'Eine andere Liebe als deine', path: '/serie/eine-andere-liebe-als-deine/staffel-1' },
    { rank: 14, title: 'Toxic', path: '/serie/toxic/staffel-2' },
    { rank: 15, title: 'Team No Limits', path: '/serie/team-no-limits-race-across-america/staffel-2' }
];

const builder = new addonBuilder(manifest);

// 2. Katalog-Handler (Anzeige der Übersicht in Stremio)
builder.defineCatalogHandler(async ({ type, id }) => {
    if (type === 'series' && id === 'top_series_catalog') {
        const metas = seriesList.map(item => {
            // Eindeutige ID generieren
            const slug = item.path.split('/')[2] || item.title.toLowerCase().replace(/\s+/g, '-');
            
            return {
                id: `customseries:${slug}`,
                type: 'series',
                name: `#${item.rank} ${item.title}`,
                poster: `https://via.placeholder.com/300x450/111827/FFFFFF?text=${encodeURIComponent(item.title)}`,
                description: `Rang ${item.rank} in den aktuellen Serien-Charts.`
            };
        });

        return { metas };
    }
    return { metas: [] };
});

// 3. Meta-Handler (Detailansicht einer Serie)
builder.defineMetaHandler(async ({ type, id }) => {
    if (type === 'series' && id.startsWith('customseries:')) {
        const rawName = id.replace('customseries:', '').replace(/-/g, ' ');
        
        return {
            meta: {
                id: id,
                type: 'series',
                name: rawName.toUpperCase(),
                poster: `https://via.placeholder.com/300x450/111827/FFFFFF?text=${encodeURIComponent(rawName)}`,
                description: `Details für ${rawName}. Links können mit Cinemeta / IMDB gemappt werden.`
            }
        };
    }
    return { meta: null };
});

// 4. HTTP-Server starten
serveHTTP(builder.getInterface(), { port: 7000 });
console.log('Stremio Addon läuft unter: http://127.0.0.1:7000/manifest.json');
