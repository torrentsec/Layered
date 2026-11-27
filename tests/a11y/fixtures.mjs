// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

// Open-Meteo responses for a cold, showery late-November fortnight in London,
// so audits never depend on the real weather.

const START = Date.UTC(2026, 10, 26, 0);

export function forecast() {
  const keys = ['time', 'temperature_2m', 'apparent_temperature', 'precipitation_probability', 'precipitation', 'snowfall', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'uv_index', 'is_day', 'visibility'];
  const hourly = Object.fromEntries(keys.map((k) => [k, []]));
  for (let i = 0; i < 16 * 24; i++) {
    const d = new Date(START + i * 3600e3);
    const h = d.getUTCHours();
    const day = Math.floor(i / 24);
    const t = 6 + 5 * Math.sin(((h - 9) / 24) * 2 * Math.PI) - day * 0.3;
    const wet = h >= 16 && h <= 19 && day % 2 === 0;
    hourly.time.push(d.toISOString().slice(0, 16));
    hourly.temperature_2m.push(t);
    hourly.apparent_temperature.push(t - 3);
    hourly.precipitation_probability.push(wet ? 70 : 10);
    hourly.precipitation.push(wet ? 0.6 : 0);
    hourly.snowfall.push(0);
    hourly.weather_code.push(wet ? 80 : 2);
    hourly.wind_speed_10m.push(18);
    hourly.wind_gusts_10m.push(35);
    hourly.uv_index.push(h > 10 && h < 14 ? 1 : 0);
    hourly.is_day.push(h >= 7 && h < 16 ? 1 : 0);
    hourly.visibility.push(20000);
  }
  const dkeys = ['time', 'sunrise', 'sunset', 'temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_max', 'apparent_temperature_min', 'precipitation_probability_max', 'precipitation_sum', 'uv_index_max', 'wind_gusts_10m_max', 'weather_code'];
  const daily = Object.fromEntries(dkeys.map((k) => [k, []]));
  for (let d = 0; d < 16; d++) {
    const ds = new Date(START + d * 864e5).toISOString().slice(0, 10);
    const wet = d % 2 === 0;
    daily.time.push(ds);
    daily.sunrise.push(`${ds}T07:32`);
    daily.sunset.push(`${ds}T15:58`);
    daily.temperature_2m_max.push(11 - d * 0.3);
    daily.temperature_2m_min.push(1 - d * 0.3);
    daily.apparent_temperature_max.push(8 - d * 0.3);
    daily.apparent_temperature_min.push(-2 - d * 0.3);
    daily.precipitation_probability_max.push(wet ? 70 : 10);
    daily.precipitation_sum.push(wet ? 2.4 : 0);
    daily.uv_index_max.push(1);
    daily.wind_gusts_10m_max.push(35);
    daily.weather_code.push(wet ? 80 : 2);
  }
  return { latitude: 51.49, longitude: 0.07, timezone: 'Europe/London', utc_offset_seconds: 0, hourly, daily };
}

export function airQuality() {
  const time = forecast().hourly.time.slice(0, 48);
  return { hourly: { time, european_aqi: Array(48).fill(45), grass_pollen: Array(48).fill(5) } };
}

export function geocoding() {
  return { results: [{ id: 1, name: 'Woolwich', admin1: 'England', country: 'United Kingdom', latitude: 51.49, longitude: 0.07 }] };
}
