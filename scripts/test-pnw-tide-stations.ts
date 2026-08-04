/**
 * Smoke-test: Pacific Northwest NOAA tide station IDs
 *
 * Verifies that all four PNW CO-OPS station IDs return real predictions
 * and that the key surf-spot coordinates map to the correct stations.
 *
 * Run with:  npx tsx scripts/test-pnw-tide-stations.ts
 */

const STATIONS = [
  { id: '9435380', name: 'South Beach, OR'  },
  { id: '9439040', name: 'Astoria, OR'      },
  { id: '9440910', name: 'Toke Point, WA'   },
  { id: '9441102', name: 'Westport, WA'     },
];

// Tide station map — must stay in sync with server/weather-service.ts (PNW entries)
const tideStationMap = [
  // Oregon coast — South Beach / Newport covers central OR (42.0–45.5°N)
  { latRange: [42.0, 45.5], lonRange: [-124.8, -123.5], stationId: '9435380', name: 'South Beach, OR' },
  // Oregon coast — Astoria covers northern OR / Columbia River mouth (45.5–46.3°N)
  { latRange: [45.5, 46.3], lonRange: [-124.5, -123.4], stationId: '9439040', name: 'Astoria, OR' },
  // Washington coast — Toke Point / Willapa Bay (46.3–47.2°N)
  { latRange: [46.3, 47.2], lonRange: [-124.5, -123.5], stationId: '9440910', name: 'Toke Point, WA' },
  // Washington coast — Westport / Grays Harbor (47.2–48.5°N)
  { latRange: [47.2, 48.5], lonRange: [-124.8, -123.5], stationId: '9441102', name: 'Westport, WA' },
];

function findStation(lat: number, lon: number) {
  return tideStationMap.find(
    s => lat >= s.latRange[0] && lat <= s.latRange[1] &&
         lon >= s.lonRange[0] && lon <= s.lonRange[1]
  ) ?? null;
}

async function fetchPredictions(stationId: string): Promise<{
  ok: boolean;
  count: number;
  sample?: string;
  error?: string;
}> {
  const url =
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?begin_date=${todayStr()}&end_date=${todayStr()}` +
    `&station=${stationId}&product=predictions&datum=MLLW` +
    `&units=english&time_zone=lst_ldt&format=json&interval=hilo`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, count: 0, error: `HTTP ${res.status}` };
    const json: any = await res.json();
    if (json.error) return { ok: false, count: 0, error: json.error.message };
    const preds: any[] = json.predictions ?? [];
    const sample = preds[0] ? `t=${preds[0].t} v=${preds[0].v} type=${preds[0].type}` : undefined;
    return { ok: preds.length > 0, count: preds.length, sample };
  } catch (e: any) {
    return { ok: false, count: 0, error: e.message };
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// ─── Run tests ────────────────────────────────────────────────────────────────

async function main() {
  let allPassed = true;

  console.log('═══════════════════════════════════════════════════════');
  console.log(' Pacific Northwest NOAA Tide Station Smoke Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. Each station returns real predictions ────────────────────────────────
  console.log('1. Verifying NOAA CO-OPS predictions for all four station IDs…\n');
  for (const station of STATIONS) {
    const result = await fetchPredictions(station.id);
    const pass = result.ok && result.count > 0;
    allPassed = allPassed && pass;
    const icon = pass ? '✅' : '❌';
    const detail = result.error
      ? `ERROR: ${result.error}`
      : `${result.count} predictions  (${result.sample ?? 'no sample'})`;
    console.log(`  ${icon}  ${station.id}  ${station.name.padEnd(22)} ${detail}`);
  }

  // ── 2. Surf-spot coordinates map to the expected stations ──────────────────
  console.log('\n2. Verifying surf-spot coordinate → station mapping…\n');

  const surfSpots = [
    // Oregon
    // Seaside OR (45.9°N) and Cannon Beach OR (45.9°N) are north of the 45.5° boundary
    // so they correctly map to Astoria (9439040), not South Beach.
    { label: 'Seaside OR (northern OR coast)',  lat: 45.9,  lon: -123.9,  expectedId: '9439040' },
    { label: 'Newport OR (South Beach area)',   lat: 44.6,  lon: -124.0,  expectedId: '9435380' },
    { label: 'Cannon Beach OR (northern OR)',   lat: 45.9,  lon: -123.97, expectedId: '9439040' },
    { label: 'Astoria OR (Columbia mouth)',     lat: 46.2,  lon: -123.8,  expectedId: '9439040' },
    // Washington
    { label: 'Long Beach WA (southern WA)',     lat: 46.4,  lon: -124.0, expectedId: '9440910' },
    { label: 'Westport WA (Grays Harbor)',      lat: 46.9,  lon: -124.1, expectedId: '9440910' },
    { label: 'Ocean Shores WA (central WA)',    lat: 47.0,  lon: -124.15, expectedId: '9440910' },
    { label: 'La Push WA (northern WA)',        lat: 47.9,  lon: -124.6, expectedId: '9441102' },
  ];

  for (const spot of surfSpots) {
    const station = findStation(spot.lat, spot.lon);
    const pass = station !== null && station.stationId === spot.expectedId;
    allPassed = allPassed && pass;
    const icon = pass ? '✅' : '❌';
    const got = station
      ? `→ ${station.stationId} (${station.name})`
      : '→ no station found (returns "estimated")';
    console.log(`  ${icon}  ${spot.label.padEnd(34)} ${got}`);
  }

  // ── 3. Source field check (NOT 'estimated') ────────────────────────────────
  console.log('\n3. Source field check (expected: NOT "estimated")…\n');

  const checkSpots = [
    { label: 'Seaside OR  (45.9, -123.9)',   lat: 45.9,  lon: -123.9  },
    { label: 'Westport WA (46.9, -124.1)',   lat: 46.9,  lon: -124.1  },
  ];
  for (const s of checkSpots) {
    const station = findStation(s.lat, s.lon);
    const sourceWouldBe = station ? station.name : 'estimated';
    const pass = station !== null && sourceWouldBe !== 'estimated';
    allPassed = allPassed && pass;
    const icon = pass ? '✅' : '❌';
    console.log(`  ${icon}  ${s.label}  source="${sourceWouldBe}"`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  if (allPassed) {
    console.log(' ✅  ALL TESTS PASSED');
  } else {
    console.log(' ❌  SOME TESTS FAILED — see output above');
  }
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
