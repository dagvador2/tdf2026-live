// scripts/scrape-story-images.ts
// Recupere les images Wikimedia Commons / Unsplash / Pexels pour les 75 histoires
// Upload sur Cloudflare R2 et met a jour la base de donnees
//
// Usage: npm run tour-stories:images
//
// Variables d'environnement requises:
// - UNSPLASH_ACCESS_KEY (gratuite sur unsplash.com/developers)
// - PEXELS_API_KEY (gratuite sur pexels.com/api)
// - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually (no dotenv dependency)
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let val = trimmed.slice(eqIdx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const prisma = new PrismaClient();

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ─────────────────────────────────────────────────────────
// Mapping slug → mot-clé de recherche (le plus important !)
// ─────────────────────────────────────────────────────────
// Pour chaque histoire, on définit :
// - source : "wikimedia" pour les coureurs/lieux historiques, "unsplash" pour générique
// - query : les mots-clés de recherche optimisés
// - fallback : alternative si la première recherche ne donne rien

interface ImageQuery {
  source: 'wikimedia' | 'unsplash' | 'pexels';
  query: string;
  fallback?: { source: 'wikimedia' | 'unsplash' | 'pexels'; query: string };
}

const IMAGE_QUERIES: Record<string, ImageQuery> = {
  // ─── Duels & coureurs (Wikimedia en priorité — vrais coureurs) ───
  'anquetil-poulidor-puy-de-dome-1964': {
    source: 'wikimedia',
    query: 'Jacques Anquetil Raymond Poulidor 1964',
    fallback: { source: 'wikimedia', query: 'Jacques Anquetil' },
  },
  'lemond-fignon-8-secondes-1989': {
    source: 'wikimedia',
    query: 'Greg LeMond 1989 Tour de France',
    fallback: { source: 'wikimedia', query: 'Laurent Fignon' },
  },
  'coppi-bartali-photo-gourde-1952': {
    source: 'wikimedia',
    query: 'Fausto Coppi Gino Bartali',
    fallback: { source: 'wikimedia', query: 'Fausto Coppi' },
  },
  'hinault-lemond-trahison-1986': {
    source: 'wikimedia',
    query: 'Bernard Hinault 1986 Tour',
    fallback: { source: 'wikimedia', query: 'Bernard Hinault' },
  },
  'eddy-merckx-cannibale-absolu': {
    source: 'wikimedia',
    query: 'Eddy Merckx 1969',
  },
  'bernard-hinault-blaireau': {
    source: 'wikimedia',
    query: 'Bernard Hinault maillot jaune',
  },
  'jacques-anquetil-maitre': {
    source: 'wikimedia',
    query: 'Jacques Anquetil Tour de France',
  },
  'fausto-coppi-campionissimo': {
    source: 'wikimedia',
    query: 'Fausto Coppi cycliste',
  },
  'raymond-poulidor-eternel-deuxieme': {
    source: 'wikimedia',
    query: 'Raymond Poulidor',
  },
  'laurent-fignon-professeur': {
    source: 'wikimedia',
    query: 'Laurent Fignon',
  },
  'marco-pantani-pirate': {
    source: 'wikimedia',
    query: 'Marco Pantani Tour de France',
  },
  'greg-lemond-americain-pionnier': {
    source: 'wikimedia',
    query: 'Greg LeMond cycliste',
  },

  // ─── Cols (Wikimedia pour les paysages, Unsplash en fallback) ───
  'mont-ventoux-geant-provence': {
    source: 'wikimedia',
    query: 'Mont Ventoux summit',
    fallback: { source: 'unsplash', query: 'Mont Ventoux' },
  },
  'tourmalet-seigneur-pyrenees': {
    source: 'wikimedia',
    query: 'Col du Tourmalet',
    fallback: { source: 'unsplash', query: 'Pyrenees mountain pass' },
  },
  'galibier-toit-tour': {
    source: 'wikimedia',
    query: 'Col du Galibier',
    fallback: { source: 'unsplash', query: 'Alps mountain pass' },
  },
  'aubisque-balcon-pyrenees': {
    source: 'wikimedia',
    query: 'Col d\'Aubisque',
    fallback: { source: 'unsplash', query: 'Pyrenees panorama' },
  },
  'izoard-casse-deserte': {
    source: 'wikimedia',
    query: 'Col Izoard Casse Deserte',
    fallback: { source: 'unsplash', query: 'rocky mountain landscape' },
  },
  'croix-de-fer-col-oublie': {
    source: 'wikimedia',
    query: 'Col de la Croix de Fer',
    fallback: { source: 'unsplash', query: 'mountain road alps' },
  },
  'alpe-d-huez-cathedrale': {
    source: 'wikimedia',
    query: 'Alpe d\'Huez 21 lacets',
    fallback: { source: 'unsplash', query: 'mountain switchbacks' },
  },
  'granon-nouveaute-2022': {
    source: 'wikimedia',
    query: 'Col du Granon',
    fallback: { source: 'unsplash', query: 'high alpine pass' },
  },

  // ─── Anecdotes & explications (Unsplash pour génériques) ───
  'tour-cafes-1903': {
    source: 'unsplash',
    query: 'vintage bicycle paris 1900',
    fallback: { source: 'unsplash', query: 'old bicycle' },
  },
  'avenement-tour-de-france-1903': {
    source: 'unsplash',
    query: 'vintage cycling early 1900s',
    fallback: { source: 'unsplash', query: 'historic bicycle' },
  },
  'caravane-publicitaire-1930': {
    source: 'unsplash',
    query: 'colorful parade',
    fallback: { source: 'unsplash', query: 'festival cars' },
  },
  'caravane-publicitaire-histoire': {
    source: 'unsplash',
    query: 'colorful parade vehicles',
  },
  'maillot-jaune-pourquoi-jaune': {
    source: 'unsplash',
    query: 'yellow jersey cycling',
    fallback: { source: 'unsplash', query: 'cyclist yellow' },
  },
  'maillot-pois-grimpeur': {
    source: 'unsplash',
    query: 'cyclist climbing mountain',
  },
  'maillot-vert-sprinter': {
    source: 'unsplash',
    query: 'cycling sprint finish',
  },
  'maillot-blanc-jeune': {
    source: 'unsplash',
    query: 'young cyclist',
  },
  'controles-antidopage-histoire': {
    source: 'unsplash',
    query: 'medical laboratory test',
  },
  'champs-elysees-arrivee-mythique': {
    source: 'unsplash',
    query: 'Champs Elysees Paris',
  },
  'christophe-fourche-cassee-1913': {
    source: 'unsplash',
    query: 'old bicycle workshop',
  },
  'lapize-tourmalet-assassins-1910': {
    source: 'wikimedia',
    query: 'Octave Lapize',
    fallback: { source: 'unsplash', query: 'mountain cycling vintage' },
  },

  // ─── Drames (Wikimedia pour les coureurs concernés) ───
  'tom-simpson-ventoux-1967': {
    source: 'wikimedia',
    query: 'Tom Simpson cyclist',
    fallback: { source: 'unsplash', query: 'Mont Ventoux barren' },
  },
  'beloki-chute-2003': {
    source: 'wikimedia',
    query: 'Joseba Beloki',
    fallback: { source: 'unsplash', query: 'mountain road descent' },
  },
  'casartelli-portet-aspet-1995': {
    source: 'unsplash',
    query: 'pyrenees mountain road',
  },
  'merckx-coup-de-poing-1975': {
    source: 'wikimedia',
    query: 'Eddy Merckx 1975',
  },
  'delgado-asphyxie-la-plagne-1987': {
    source: 'wikimedia',
    query: 'Stephen Roche 1987',
  },
  'wim-van-est-ravin-1951': {
    source: 'unsplash',
    query: 'pyrenees ravine cliff',
  },
  'bahamontes-descente-fatale-1959': {
    source: 'wikimedia',
    query: 'Federico Bahamontes',
  },
  'merckx-effondrement-1969': {
    source: 'wikimedia',
    query: 'Eddy Merckx 1969',
  },

  // ─── Exploits ───
  'pantani-galibier-1998': {
    source: 'wikimedia',
    query: 'Marco Pantani Galibier',
    fallback: { source: 'wikimedia', query: 'Marco Pantani' },
  },
  'hinault-pau-nez-en-sang-1985': {
    source: 'wikimedia',
    query: 'Bernard Hinault 1985',
  },
  'charly-gaul-orage-1958': {
    source: 'wikimedia',
    query: 'Charly Gaul cycliste',
  },
  'bartali-sauve-italie-1948': {
    source: 'wikimedia',
    query: 'Gino Bartali 1948',
  },
  'robic-tourmalet-1947': {
    source: 'wikimedia',
    query: 'Jean Robic',
  },
  'bobet-ventoux-1955': {
    source: 'wikimedia',
    query: 'Louison Bobet',
  },
  'merckx-mourenx-mourenx-1969': {
    source: 'wikimedia',
    query: 'Eddy Merckx Mourenx',
    fallback: { source: 'wikimedia', query: 'Eddy Merckx 1969' },
  },
  'indurain-luz-ardiden-1991': {
    source: 'wikimedia',
    query: 'Miguel Indurain',
  },
  'rasmussen-abandonne-equipe-2007': {
    source: 'wikimedia',
    query: 'Michael Rasmussen cycliste',
  },
  'voeckler-jaune-2004': {
    source: 'wikimedia',
    query: 'Thomas Voeckler 2004',
  },
  'cavendish-champs-elysees-2009': {
    source: 'wikimedia',
    query: 'Mark Cavendish Champs Elysees',
  },
  'merckx-effondrement-puy-de-dome-1975': {
    source: 'wikimedia',
    query: 'Eddy Merckx Puy de Dome',
  },

  // ─── Controverses ───
  'festina-1998': {
    source: 'wikimedia',
    query: 'Tour de France 1998 Festina',
    fallback: { source: 'unsplash', query: 'cycling team' },
  },
  'armstrong-decheance-2012': {
    source: 'wikimedia',
    query: 'Lance Armstrong',
  },
  'contador-viande-contaminee-2010': {
    source: 'wikimedia',
    query: 'Alberto Contador',
  },
  'operation-puerto-2006': {
    source: 'wikimedia',
    query: 'Jan Ullrich cycliste',
  },
  'riis-mr-60-pourcent-1996': {
    source: 'wikimedia',
    query: 'Bjarne Riis',
  },
  'landis-2006-decheance': {
    source: 'wikimedia',
    query: 'Floyd Landis',
  },

  // ─── Victoires ───
  'lemond-premier-americain-1986': {
    source: 'wikimedia',
    query: 'Greg LeMond 1986',
  },
  'indurain-cinq-tours-1991-1995': {
    source: 'wikimedia',
    query: 'Miguel Indurain maillot jaune',
  },
  'ullrich-enfin-vainqueur-1997': {
    source: 'wikimedia',
    query: 'Jan Ullrich 1997',
  },
  'wiggins-premier-britannique-2012': {
    source: 'wikimedia',
    query: 'Bradley Wiggins 2012',
  },
  'froome-grimpeur-improbable-2013': {
    source: 'wikimedia',
    query: 'Chris Froome',
  },
  'bernal-plus-jeune-110-ans-2019': {
    source: 'wikimedia',
    query: 'Egan Bernal',
  },
  'pogacar-foudroie-roglic-2020': {
    source: 'wikimedia',
    query: 'Tadej Pogacar 2020',
  },
  'pogacar-vingegaard-nouvelle-ere': {
    source: 'wikimedia',
    query: 'Tadej Pogacar Jonas Vingegaard',
  },
  'hampsten-mont-ventoux-1992': {
    source: 'wikimedia',
    query: 'Andy Hampsten',
  },
  'hinault-france-1985-dernier': {
    source: 'wikimedia',
    query: 'Bernard Hinault 1985 Paris',
  },
  'fignon-bobet-1953-bobet-domine-ventoux': {
    source: 'wikimedia',
    query: 'Louison Bobet 1953',
  },
  'maurice-garin-premier-1903': {
    source: 'wikimedia',
    query: 'Maurice Garin',
  },

  // ─── Anecdotes restantes ───
  'bidon-roche-tours-1991': {
    source: 'wikimedia',
    query: 'Stephen Roche',
  },
  'alpe-d-huez-coppi-premier-1952': {
    source: 'wikimedia',
    query: 'Fausto Coppi Alpe Huez',
    fallback: { source: 'wikimedia', query: 'Alpe d\'Huez' },
  },
  'maillot-jaune-origine-1919': {
    source: 'wikimedia',
    query: 'Eugène Christophe',
    fallback: { source: 'unsplash', query: 'yellow jersey cycling' },
  },
};

// ─────────────────────────────────────────────────────────
// Wikimedia Commons API
// ─────────────────────────────────────────────────────────
async function searchWikimedia(query: string): Promise<{ url: string; attribution: string } | null> {
  try {
    // 1. Recherche d'images
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=5`;
    const searchResp = await fetch(searchUrl, {
      headers: { 'User-Agent': 'TDF2026LiveTracker/1.0 (https://tdf2026.fr)' },
    });
    const searchData = await searchResp.json();
    
    if (!searchData.query?.search?.length) return null;

    // Prendre le premier résultat avec une extension d'image
    const imageResult = searchData.query.search.find((r: any) => 
      /\.(jpg|jpeg|png|webp)$/i.test(r.title)
    );
    if (!imageResult) return null;

    // 2. Récupérer l'URL réelle de l'image
    const fileName = imageResult.title;
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url|extmetadata&format=json`;
    const infoResp = await fetch(infoUrl, {
      headers: { 'User-Agent': 'TDF2026LiveTracker/1.0' },
    });
    const infoData = await infoResp.json();
    
    const pages = infoData.query.pages;
    const pageId = Object.keys(pages)[0];
    const imageInfo = pages[pageId].imageinfo?.[0];
    
    if (!imageInfo) return null;

    const author = imageInfo.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || 'Wikimedia Commons';
    const license = imageInfo.extmetadata?.LicenseShortName?.value || 'CC';
    
    return {
      url: imageInfo.url,
      attribution: `${author} / ${license} via Wikimedia Commons`,
    };
  } catch (error) {
    console.error(`  ❌ Wikimedia error:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Unsplash API
// ─────────────────────────────────────────────────────────
async function searchUnsplash(query: string): Promise<{ url: string; attribution: string } | null> {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.warn('  ⚠️  UNSPLASH_ACCESS_KEY manquante');
    return null;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    });
    const data = await resp.json();
    
    if (!data.results?.length) return null;

    const photo = data.results[0];
    return {
      url: photo.urls.regular, // ~1080px de large, parfait pour le hero
      attribution: `Photo by ${photo.user.name} on Unsplash`,
    };
  } catch (error) {
    console.error(`  ❌ Unsplash error:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Pexels API (fallback si Unsplash épuisé)
// ─────────────────────────────────────────────────────────
async function searchPexels(query: string): Promise<{ url: string; attribution: string } | null> {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('  ⚠️  PEXELS_API_KEY manquante');
    return null;
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const resp = await fetch(url, {
      headers: { 'Authorization': process.env.PEXELS_API_KEY },
    });
    const data = await resp.json();
    
    if (!data.photos?.length) return null;

    const photo = data.photos[0];
    return {
      url: photo.src.large, // ~940px de large
      attribution: `Photo by ${photo.photographer} on Pexels`,
    };
  } catch (error) {
    console.error(`  ❌ Pexels error:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Upload sur R2
// ─────────────────────────────────────────────────────────
async function uploadToR2(imageUrl: string, slug: string): Promise<string> {
  // Télécharger l'image
  const imageResp = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResp.arrayBuffer());

  // Détecter l'extension
  const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  
  const key = `tour-stories/${slug}.${ext}`;
  
  // Uploader sur R2
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 an de cache
  }));

  // Retourner l'URL publique
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// ─────────────────────────────────────────────────────────
// Pipeline principal
// ─────────────────────────────────────────────────────────
async function processStory(slug: string, query: ImageQuery): Promise<boolean> {
  console.log(`\n📖 ${slug}`);
  console.log(`   Source: ${query.source} | Query: "${query.query}"`);

  // 1. Chercher l'image selon la source
  let result: { url: string; attribution: string } | null = null;
  
  if (query.source === 'wikimedia') result = await searchWikimedia(query.query);
  else if (query.source === 'unsplash') result = await searchUnsplash(query.query);
  else if (query.source === 'pexels') result = await searchPexels(query.query);

  // 2. Fallback si rien trouvé
  if (!result && query.fallback) {
    console.log(`   ↪️  Fallback: ${query.fallback.source} "${query.fallback.query}"`);
    if (query.fallback.source === 'wikimedia') result = await searchWikimedia(query.fallback.query);
    else if (query.fallback.source === 'unsplash') result = await searchUnsplash(query.fallback.query);
    else if (query.fallback.source === 'pexels') result = await searchPexels(query.fallback.query);
  }

  if (!result) {
    console.log(`   ❌ Aucune image trouvée`);
    return false;
  }

  console.log(`   ✓ Image trouvée: ${result.url.substring(0, 80)}...`);

  // 3. Upload sur R2
  try {
    const r2Url = await uploadToR2(result.url, slug);
    console.log(`   ✓ Uploadée sur R2: ${r2Url}`);

    // 4. Mettre à jour la base de données
    await prisma.tourStory.update({
      where: { slug },
      data: {
        heroImageUrl: r2Url,
        heroImageAttribution: result.attribution,
      },
    });
    console.log(`   ✓ DB mise à jour`);
    return true;
  } catch (error) {
    console.error(`   ❌ Erreur upload/DB:`, error);
    return false;
  }
}

async function main() {
  console.log('🖼️  Scraping des images d\'histoires...\n');
  console.log(`Total: ${Object.keys(IMAGE_QUERIES).length} histoires à traiter\n`);

  let success = 0;
  let failed = 0;
  const failedSlugs: string[] = [];

  for (const [slug, query] of Object.entries(IMAGE_QUERIES)) {
    const ok = await processStory(slug, query);
    if (ok) success++;
    else {
      failed++;
      failedSlugs.push(slug);
    }
    
    // Pause entre les requêtes pour ne pas surcharger les API
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✓ Succès: ${success}`);
  console.log(`   ❌ Échecs: ${failed}`);
  
  if (failedSlugs.length > 0) {
    console.log(`\n⚠️  Histoires sans image (à gérer manuellement):`);
    failedSlugs.forEach(s => console.log(`   - ${s}`));
  }

  console.log(`\n🎉 Terminé !`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
