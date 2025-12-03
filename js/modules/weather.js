// ------------------ Weather module ------------------
// Responsibilities:
// - Read/save a user-provided latitude/longitude
// - Fetch current weather from Open‑Meteo and present a concise summary
// - Wire the modal controls (use my location / save location)
// The module keeps display logic minimal and exposes small helpers on
// `window` so the top-level script can call into it if needed.
(function(){
  const WEATHER_KEY = 'weatherLocation';
  const weatherEl = document.getElementById('weather');
  const latInput = document.getElementById('weatherLat');
  const lonInput = document.getElementById('weatherLon');
  const useGeoBtn = document.getElementById('useGeoBtn');
  const saveWeatherBtn = document.getElementById('saveWeatherBtn');

  /**
   * loadSavedWeatherLocation()
   * - Loads previously saved lat/lon from localStorage and populates the
   *   modal inputs if present. Returns the parsed object {lat, lon} or {}.
   */
  function loadSavedWeatherLocation(){
    try{
      const saved = JSON.parse(localStorage.getItem(WEATHER_KEY) || '{}');
      if(latInput) latInput.value = saved.lat || '';
      if(lonInput) lonInput.value = saved.lon || '';
      return saved;
    }catch(e){ return {}; }
  }

  /**
   * fetchWeatherFor(lat, lon)
   * - Query Open‑Meteo for the current weather at the provided coordinates.
   * - Displays temperature in both °C and °F, wind speed in km/h and mph, a
   *   rounded wind direction, and a short condition derived from the numeric
   *   weather code.
   */
  async function fetchWeatherFor(lat, lon){
    if(!lat || !lon) return setWeatherText('No location set');
    setWeatherText('Loading weather...');
    try{
      // Request metric units (Celsius, km/h) and current weather
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const cur = j && j.current_weather;
      if(!cur) return setWeatherText('No weather data');

      const tC = Number(cur.temperature);
      const wKmh = Number(cur.windspeed);
      const dir = cur.winddirection;
      // convert to other units for convenience
      const tF = Math.round(tC * 9/5 + 32);
      const wMph = Math.round(wKmh * 0.621371);

      // Map numeric Open‑Meteo weather codes to short human phrases used in the UI
      const wc = typeof cur.weathercode !== 'undefined' ? Number(cur.weathercode) : null;
      const weatherCodeMap = new Map([
        [0, 'Clear sky'], [1, 'Mainly clear'], [2, 'Partly cloudy'], [3, 'Overcast'],
        [45, 'Fog'], [48, 'Depositing rime fog'],
        [51, 'Drizzle: light'], [53, 'Drizzle: moderate'], [55, 'Drizzle: dense'],
        [56, 'Freezing Drizzle: light'], [57, 'Freezing Drizzle: dense'],
        [61, 'Rain: slight'], [63, 'Rain: moderate'], [65, 'Rain: heavy'],
        [66, 'Freezing Rain: light'], [67, 'Freezing Rain: heavy'],
        [71, 'Snow fall: slight'], [73, 'Snow fall: moderate'], [75, 'Snow fall: heavy'],
        [77, 'Snow grains'], [80, 'Rain showers: slight'], [81, 'Rain showers: moderate'], [82, 'Rain showers: violent'],
        [85, 'Snow showers slight'], [86, 'Snow showers heavy'], [95, 'Thunderstorm: slight or moderate'], [96, 'Thunderstorm with slight hail'], [99, 'Thunderstorm with heavy hail']
      ]);
      const cond = wc !== null && weatherCodeMap.has(wc) ? weatherCodeMap.get(wc) : '';

      // Friendly output: show both metric and imperial units and a short condition
      const parts = [`${Math.round(tC)}°C (${tF}°F)`, `${Math.round(wKmh)} km/h (${wMph} mph)`];
      if(dir !== undefined && dir !== null) parts.push(`${Math.round(dir)}°`);
      if(cond) parts.push(cond);
      setWeatherText(parts.join(' • '));
    }catch(err){
      console.warn('Weather fetch failed', err);
      setWeatherText('Unable to load weather');
    }
  }

  // Small helper to update the simple weather display element
  function setWeatherText(txt){ if(weatherEl) weatherEl.textContent = txt; }

  // Wire the 'Save' button in the modal to persist the lat/lon and fetch
  if(saveWeatherBtn){
    saveWeatherBtn.addEventListener('click', ()=>{
      const lat = latInput?.value?.trim(); const lon = lonInput?.value?.trim();
      if(!lat || !lon){ alert('Please provide both latitude and longitude.'); return; }
      try{ localStorage.setItem(WEATHER_KEY, JSON.stringify({lat, lon})); }catch(e){}
      fetchWeatherFor(lat, lon);
    });
  }

  // 'Use my location' button: obtain geolocation then save and fetch
  if(useGeoBtn){
    useGeoBtn.addEventListener('click', ()=>{
      if(!navigator.geolocation){ alert('Geolocation not available'); return; }
      useGeoBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        const lat = String(pos.coords.latitude); const lon = String(pos.coords.longitude);
        if(latInput) latInput.value = lat; if(lonInput) lonInput.value = lon;
        try{ localStorage.setItem(WEATHER_KEY, JSON.stringify({lat, lon})); }catch(e){}
        await fetchWeatherFor(lat, lon);
        useGeoBtn.disabled = false;
      }, (err)=>{ alert('Unable to determine location'); useGeoBtn.disabled = false; });
    });
  }

  // initialize: load saved and fetch if available
  const saved = loadSavedWeatherLocation();
  if(saved && saved.lat && saved.lon){ fetchWeatherFor(saved.lat, saved.lon); }
  else { setWeatherText('Set weather location in Config'); }

  // expose for compatibility
  window.loadSavedWeatherLocation = loadSavedWeatherLocation;
  window.fetchWeatherFor = fetchWeatherFor;

})();
