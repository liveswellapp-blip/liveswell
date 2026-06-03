---
name: Open-Meteo Marine fallback
description: How international surf spots get wave data when NOAA NDBC has no nearby buoys
---

## Rule
When `getComprehensiveMarineData` returns no primary buoy (0 NDBC stations within 150 miles), call Open-Meteo Marine API for current-hour wave height/period/direction and return it as `primaryBuoy` with `stationId: "open-meteo"`.

**Why:** NOAA NDBC only covers US and nearby offshore waters. All non-US spots (South Africa, Indonesia, France, Brazil, etc.) have 0 stations nearby and previously showed "No buoy data". Open-Meteo Marine is free, no API key, and covers the global ocean.

**How to apply:**
- Correct base URL: `https://marine-api.open-meteo.com/v1/marine` (NOT `api.open-meteo.com/v1/marine` — that returns 404 for non-US coords)
- Current-hour lookup: request `timezone=UTC`, match `hourly.time[idx]` to current UTC hour string
- Convert wave_height from meters to feet (`* 3.28084`) to match NOAA buoy units
- Frontend detects `stationId === 'open-meteo'` and shows "Marine Forecast" label + hides Wave History button
