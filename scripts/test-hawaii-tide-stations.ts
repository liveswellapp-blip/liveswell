/**
 * Smoke-test: Hawaii NOAA tide station IDs
 *
 * Verifies that all four Hawaii CO-OPS station IDs return real predictions
 * and that the key surf-spot coordinates map to the correct stations.
 *
 * Run with:  npx tsx scripts/test-hawaii-tide-stations.ts
 */

const STATIONS = [
  { id: '1612340', name: 'Honolulu (Oahu)'   },
  { id: '1615680', name: 'Kahului (Maui)'    },
  { id: '1617760', name: 'Hilo (Big Island)' },
  { id: '1619910', name: 'Nawiliwili (Kauai)'},
];

// Tide station map — must stay in sync with server/weather-service.ts
const tideStationMap = [
  // Oahu (Pipeline / North Shore ~21.6°N, -158.1°W)
  { latRange: [21.2, 21.8], lonRange: [-158.3, -157.6], stationId: '1612340', name: 'Honolulu' },
  // Maui (Hookipa, Pe'ahi ~20.9°N, -156.4°W)
  { latRange: [20.6, 21.1], lonRange: [-156.7, -155.9], stationId: '1615680', name: 'Kahului, Maui' },
  // Big Island (Honolii, Pohoiki ~19.7°N, -155.0°W)
  { latRange: [19.4, 20.3], lonRange: [-156.1, -154.8], stationId: '1617760', name: 'Hilo, Hawaii' },
  // Kauai (Hanalei, Tunnels ~22.1°N, -159.5°W)
  { latRange: [21.8, 22.3], lonRange: [-159.8, -159.2], stationId: '1619910', name: 'Nawiliwili, Kauai' },
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
  console.log(' Hawaii NOAA Tide Station Smoke Tests');
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
    { label: 'Pipeline / North Shore Oahu', lat: 21.6,  lon: -158.1, expectedId: '1612340' },
    { label: 'Hookipa Maui',                lat: 20.9,  lon: -156.4, expectedId: '1615680' },
    { label: "Pe'ahi (Jaws) Maui",          lat: 20.93, lon: -156.31, expectedId: '1615680' },
    { label: 'Hanalei Bay Kauai',            lat: 22.2,  lon: -159.5, expectedId: '1619910' },
    { label: 'Honolii Beach Big Island',     lat: 19.75, lon: -155.05, expectedId: '1617760' },
  ];

  for (const spot of surfSpots) {
    const station = findStation(spot.lat, spot.lon);
    const pass = station !== null && station.stationId === spot.expectedId;
    allPassed = allPassed && pass;
    const icon = pass ? '✅' : '❌';
    const got = station ? `→ ${station.stationId} (${station.name})` : '→ no station found (returns "estimated")';
    console.log(`  ${icon}  ${spot.label.padEnd(30)} ${got}`);
  }

  // ── 3. Confirmed: source !== 'estimated' for Pipeline & Hookipa ───────────
  console.log('\n3. Source field check (expected: NOT "estimated")…\n');

  const checkSpots = [
    { label: 'Pipeline (21.6, -158.1)', lat: 21.6, lon: -158.1 },
    { label: 'Hookipa  (20.9, -156.4)', lat: 20.9, lon: -156.4 },
  ];
  for (const s of checkSpots) {
    const station = findStation(s.lat, s.lon);
    // fetchTideData returns source = station.name (a real station name) when a station is found.
    // It only returns source = 'estimated' when no station is matched.
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
