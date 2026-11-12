import { Router } from 'express';
import { z } from 'zod';
import { HttpError, parse } from '../lib/http.js';

// Nearby gyms from OpenStreetMap (Overpass API) — free, no API key required.
const router = Router();
// Public Overpass instances are often at capacity, so try mirrors in order.
// Override with OVERPASS_URLS (comma-separated) if you self-host one.
const OVERPASS = (process.env.OVERPASS_URLS ||
  'https://overpass-api.de/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter,https://overpass.kumi.systems/api/interpreter')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

async function queryOverpass(query) {
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Kinetiq/2.0 (gym finder)' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok && res.headers.get('content-type')?.includes('json')) return await res.json();
    } catch {
      // try the next mirror
    }
  }
  return null;
}

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(300).max(15000).default(3000),
});

function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

router.get('/nearby', async (req, res) => {
  const { lat, lng, radius } = parse(querySchema, req.query);
  const around = `(around:${radius},${lat},${lng})`;
  const query = `[out:json][timeout:20];(
    nwr["leisure"="fitness_centre"]${around};
    nwr["leisure"="sports_centre"]["sport"~"fitness|gym|crossfit|weightlifting"]${around};
    nwr["amenity"="gym"]${around};
  );out center tags 60;`;

  const json = await queryOverpass(query);
  if (!json) throw new HttpError(502, 'Map data is unavailable right now. Try again shortly.');

  res.set('Cache-Control', 'private, max-age=300').json({ gyms: toGyms(json.elements, lat, lng) });
});

/** Normalize raw Overpass elements into sorted, de-duplicated gym records. */
export function toGyms(elements = [], lat, lng) {
  const seen = new Set();
  return elements
    .map((el) => {
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      const t = el.tags ?? {};
      if (pLat == null || pLng == null) return null;
      const address = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ');
      return {
        id: `${el.type}/${el.id}`,
        name: t.name || t.brand || 'Unnamed gym',
        lat: pLat,
        lng: pLng,
        distanceKm: Math.round(distanceKm(lat, lng, pLat, pLng) * 100) / 100,
        address: address || null,
        openingHours: t.opening_hours || null,
        // OSM tags are user-contributed — only pass through real http(s) links.
        website: /^https?:\/\//i.test(t.website || t['contact:website'] || '') ? t.website || t['contact:website'] : null,
        phone: t.phone || t['contact:phone'] || null,
        tags: [t.sport, t.fee === 'no' ? 'free' : null, t.wheelchair === 'yes' ? 'accessible' : null].filter(Boolean),
      };
    })
    .filter(Boolean)
    .filter((g) => {
      const key = `${g.name.toLowerCase()}|${g.lat.toFixed(3)}|${g.lng.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export default router;
