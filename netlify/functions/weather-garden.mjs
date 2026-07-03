const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const HUAIROU = { latitude: 40.32, longitude: 116.63, timezone: 'Asia/Shanghai' };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(HUAIROU.latitude));
  url.searchParams.set('longitude', String(HUAIROU.longitude));
  url.searchParams.set('timezone', HUAIROU.timezone);
  url.searchParams.set('past_days', '2');
  url.searchParams.set('forecast_days', '4');
  url.searchParams.set('current', [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_gusts_10m',
  ].join(','));
  url.searchParams.set('hourly', [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'precipitation_probability',
    'weather_code',
    'wind_speed_10m',
    'wind_gusts_10m',
    'vapour_pressure_deficit',
    'et0_fao_evapotranspiration',
    'soil_temperature_0cm',
    'soil_temperature_6cm',
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
  ].join(','));
  url.searchParams.set('daily', [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'apparent_temperature_max',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'uv_index_max',
    'sunshine_duration',
    'et0_fao_evapotranspiration',
  ].join(','));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url.toString(), { signal: controller.signal }).finally(() => clearTimeout(timer));
    const text = await response.text();
    if (!response.ok) {
      return { statusCode: response.status, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Open-Meteo request failed', detail: text.slice(0, 300), request_url: url.toString() }) };
    }
    return { statusCode: 200, headers: JSON_HEADERS, body: text };
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Weather request timed out' : (error.message || 'Weather request failed');
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: message, request_url: url.toString() }) };
  }
}
