// ---------------- Clock & Greeting ----------------
function updateClock(){
  const el = document.getElementById("clock");
  if(el) el.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
setInterval(updateClock,1000); updateClock();

function updateGreeting(){
  const el = document.getElementById("greeting");
  if(!el) return;
  const h = new Date().getHours();
  // load custom greetings if present
  const saved = JSON.parse(localStorage.getItem('greetings') || '{}');
  const morning = saved.morning || 'Good morning';
  const afternoon = saved.afternoon || 'Good afternoon';
  const evening = saved.evening || 'Good evening';
  let msg = 'Welcome';
  if(h < 12) msg = morning + ' 🌅';
  else if(h < 18) msg = afternoon + ' ☀️';
  else msg = evening + ' 🌙';
  el.textContent = msg;
}

function loadSavedGreetings(){
  try{
    const saved = JSON.parse(localStorage.getItem('greetings') || '{}');
    if(window && document){
      const m = document.getElementById('greetingMorning');
      const a = document.getElementById('greetingAfternoon');
      const e = document.getElementById('greetingEvening');
      if(m) m.value = saved.morning || '';
      if(a) a.value = saved.afternoon || '';
      if(e) e.value = saved.evening || '';
    }
  }catch(e){}
}

function saveGreetingValues(){
  const m = document.getElementById('greetingMorning');
  const a = document.getElementById('greetingAfternoon');
  const e = document.getElementById('greetingEvening');
  const obj = {
    morning: m?.value?.trim() || '',
    afternoon: a?.value?.trim() || '',
    evening: e?.value?.trim() || ''
  };
  localStorage.setItem('greetings', JSON.stringify(obj));
  updateGreeting();
}

function loadSavedWeatherLocation(){
  try{
    const saved = JSON.parse(localStorage.getItem('weatherLocation') || '{}');
    if(weatherLatInput) weatherLatInput.value = saved.lat || '';
    if(weatherLonInput) weatherLonInput.value = saved.lon || '';
  }catch(e){}
}

function saveWeatherLocation(){
  if(!weatherLatInput || !weatherLonInput) return;
  const latRaw = weatherLatInput.value.trim();
  const lonRaw = weatherLonInput.value.trim();
  if(latRaw === '' || lonRaw === ''){ alert('Please enter both latitude and longitude.'); return; }
  const lat = Number(latRaw); const lon = Number(lonRaw);
  if(Number.isNaN(lat) || Number.isNaN(lon)){ alert('Latitude and longitude must be valid numbers.'); return; }
  localStorage.setItem('weatherLocation', JSON.stringify({lat: lat, lon: lon}));
  // refresh weather immediately
  loadWeather(lat, lon);
}
updateGreeting();

// ---------------- Weather ----------------
async function loadWeather(lat, lon){
  try{
    // resolve lat/lon: function args -> saved settings -> defaults
    let latVal = (typeof lat !== 'undefined') ? lat : undefined;
    let lonVal = (typeof lon !== 'undefined') ? lon : undefined;
    if(typeof latVal === 'undefined' || typeof lonVal === 'undefined'){
      try{
        const saved = JSON.parse(localStorage.getItem('weatherLocation') || '{}');
        if(typeof latVal === 'undefined' && saved.lat) latVal = saved.lat;
        if(typeof lonVal === 'undefined' && saved.lon) lonVal = saved.lon;
      }catch(e){}
    }
    if(!latVal || !lonVal){ latVal = 35.1401; lonVal = -93.9216; }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latVal)}&longitude=${encodeURIComponent(lonVal)}&hourly=temperature_2m,weather_code,precipitation_probability`;
    const res = await fetch(url);
    const data = await res.json();
    const temp = data.hourly.temperature_2m[0]; const precip = data.hourly.precipitation_probability[0]; const code = data.hourly.weather_code[0];
    const descs = {0:"Clear sky",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",95:"Thunderstorm"};
    const wEl = document.getElementById('weather');
    if(wEl) wEl.textContent = `${descs[code]||'Weather'} • ${Math.round((temp*9/5)+32)}°F (${Math.round(temp)}°C) • ${precip}% rain`;
  } catch(e){ const wEl = document.getElementById('weather'); if(wEl) wEl.textContent = 'Weather unavailable'; }
}

// initial weather load (will pick saved location if present)
loadWeather();

// ---------------- Themes ----------------
const colorSchemes={gruvbox:{'--bg':'#282828','--fg':'#ebdbb2','--accent':'#d79921','--secondary':'#504945','--bookmark-bg':'rgba(235,219,178,0.08)','--bookmark-hover-bg':'rgba(235,219,178,0.18)'},
darkOcean:{'--bg':'#0f2027','--fg':'#a7c7e7','--accent':'#00bcd4','--secondary':'#1c3b50','--bookmark-bg':'rgba(167,199,231,0.08)','--bookmark-hover-bg':'rgba(167,199,231,0.18)'},
solarized:{'--bg':'#002b36','--fg':'#839496','--accent':'#b58900','--secondary':'#073642','--bookmark-bg':'rgba(131,148,150,0.08)','--bookmark-hover-bg':'rgba(131,148,150,0.18)'},
catppuccinMocha:{'--bg':'#1e1e2e','--fg':'#cdd6f4','--accent':'#f5c2e7','--secondary':'#313244','--bookmark-bg':'rgba(205,214,244,0.08)','--bookmark-hover-bg':'rgba(205,214,244,0.18)'},
catppuccinLatte:{'--bg':'#fbf1c7','--fg':'#575268','--accent':'#d7827e','--secondary':'#f2d5cf','--bookmark-bg':'rgba(87,82,104,0.08)','--bookmark-hover-bg':'rgba(87,82,104,0.18)'},
catppuccinFrappe:{'--bg':'#303446','--fg':'#c6d0f5','--accent':'#f2cdcd','--secondary':'#5b6078','--bookmark-bg':'rgba(198,208,245,0.08)','--bookmark-hover-bg':'rgba(198,208,245,0.18)'}};
const themeSelector=document.getElementById('themeSelector');
const savedTheme=localStorage.getItem('selectedTheme');
if(themeSelector){
  if(savedTheme && colorSchemes[savedTheme]){
    for(let v in colorSchemes[savedTheme]) document.documentElement.style.setProperty(v,colorSchemes[savedTheme][v]);
    themeSelector.value=savedTheme;
  }
  themeSelector.addEventListener('change', e=>{
    const s=e.target.value;
    if(colorSchemes[s]){
      for(let v in colorSchemes[s]) document.documentElement.style.setProperty(v,colorSchemes[s][v]);
      localStorage.setItem('selectedTheme', s);
      updateDynamicTextColors();
    }
  });
}

// ---------------- Search Engine (configurable) ----------------
const defaultSearchEngines = {
  google: 'https://www.google.com/search?q={q}',
  ddg: 'https://duckduckgo.com/?q={q}',
  bing: 'https://www.bing.com/search?q={q}',
  startpage: 'https://www.startpage.com/do/search?q={q}',
  brave: 'https://search.brave.com/search?q={q}'
};
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchEngineSelect = document.getElementById('searchEngineSelect');
const searchEngineTemplate = document.getElementById('searchEngineTemplate');

function loadSavedSearchEngine(){
  try{
    const saved = JSON.parse(localStorage.getItem('searchEngine') || '{}');
    const engine = saved.engine || 'google';
    const template = saved.template || defaultSearchEngines[engine] || defaultSearchEngines.google;
    if(searchEngineSelect) searchEngineSelect.value = engine;
    if(searchEngineTemplate) searchEngineTemplate.value = template;
    applySearchEngineToUI(engine, template);
  }catch(e){}
}

function saveSearchEngine(engine, template){
  if(!template || template.indexOf('{q}') === -1){
    alert('Search template must include {q} where the query goes.');
    return false;
  }
  localStorage.setItem('searchEngine', JSON.stringify({engine: engine, template: template}));
  applySearchEngineToUI(engine, template);
  return true;
}

function applySearchEngineToUI(engine, template){
  if(searchInput){
    const name = engine === 'custom' ? 'Search' : (engine[0].toUpperCase()+engine.slice(1));
    searchInput.placeholder = `Search ${name}...`;
  }
}

if(searchEngineSelect){
  searchEngineSelect.addEventListener('change', (e)=>{
    const val = e.target.value;
    const tmpl = defaultSearchEngines[val] || '';
    if(searchEngineTemplate){
      if(val !== 'custom') searchEngineTemplate.value = tmpl;
    }
    saveSearchEngine(val, searchEngineTemplate ? searchEngineTemplate.value.trim() : tmpl);
  });
}
if(searchEngineTemplate){
  searchEngineTemplate.addEventListener('input', (e)=>{
    const v = e.target.value.trim();
    if(searchEngineSelect){
      const preset = Object.keys(defaultSearchEngines).find(k => defaultSearchEngines[k] === v);
      if(preset) searchEngineSelect.value = preset;
      else searchEngineSelect.value = 'custom';
    }
    if(v.indexOf('{q}') !== -1) saveSearchEngine(searchEngineSelect ? searchEngineSelect.value : 'custom', v);
  });
}

if(searchForm){
  searchForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
    if(!q) return;
    const saved = JSON.parse(localStorage.getItem('searchEngine') || '{}');
    const template = saved.template || defaultSearchEngines[saved.engine] || defaultSearchEngines.google;
    let url = template;
    if(template.indexOf('{q}') !== -1) url = template.replace('{q}', encodeURIComponent(q));
    else {
      url = template + (template.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q);
    }
    // navigate in same tab
    window.location.href = url;
  });
}

// load saved on startup
loadSavedSearchEngine();

// ---------------- Bookmarks ----------------
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [
  {name:"YouTube", url:"https://www.youtube.com"},
  {name:"Reddit", url:"https://www.reddit.com"},
  {name:"GitHub", url:"https://github.com"},
  {name:"Twitter", url:"https://twitter.com"},
  {name:"Twitch", url:"https://www.twitch.tv"},
  {name:"OpenAI", url:"https://openai.com"},
  {name:"Gmail", url:"https://gmail.com"}
];
function getFavicon(url){
  try{
    const host = new URL(url).hostname;
    if(!host) return '';
    // Use the `domain` parameter which is more widely supported by the favicon service
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  }catch(e){
    return '';
  }
}

// Robust favicon loader: try Google, then DuckDuckGo, then a tiny placeholder SVG
function tryLoadFavicon(img, url){
  try{
    const host = new URL(url).hostname;
    if(!host){ img.src = ''; return; }
    const google = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
    const ddg = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
    const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" font-size="24" text-anchor="middle" alignment-baseline="central" fill="%23666">?</text></svg>';

    // Try DuckDuckGo first to avoid Google redirecting to gstatic (which can 404)
    img.src = ddg;
    img.onerror = function(){
      // fallback -> Google
      img.onerror = null;
      img.src = google;
      img.onerror = function(){ img.onerror = null; img.src = placeholder; };
    };

    // safety: if image remains zero-sized after short timeout, trigger fallback
    setTimeout(()=>{ if(img.complete && img.naturalWidth===0){ if(typeof img.onerror === 'function') img.onerror(); } }, 1500);
  }catch(e){ img.src = ''; }
}

const bookmarksGrid=document.querySelector('.bookmarks-grid');
const bookmarkEditor=document.getElementById('bookmarkEditor');
const configModal=document.getElementById('configModal');
const configButton=document.getElementById('configButton');
const addBookmark=document.getElementById('addBookmark');
const saveBookmarks=document.getElementById('saveBookmarks');
const closeConfig=document.getElementById('closeConfig');
const previewGrid=document.getElementById('previewGrid');
const bgInput=document.getElementById('backgroundInput');
const saveBg=document.getElementById('saveBackground');
const greetingMorningInput = document.getElementById('greetingMorning');
const greetingAfternoonInput = document.getElementById('greetingAfternoon');
const greetingEveningInput = document.getElementById('greetingEvening');
const resetGreetingsBtn = document.getElementById('resetGreetings');

// Note: header will remain fixed; content will scroll beneath it (no auto-hide)

// attach greeting input listeners (guarded)
if(greetingMorningInput) greetingMorningInput.addEventListener('input', ()=>{ saveGreetingValues(); });
if(greetingAfternoonInput) greetingAfternoonInput.addEventListener('input', ()=>{ saveGreetingValues(); });
if(greetingEveningInput) greetingEveningInput.addEventListener('input', ()=>{ saveGreetingValues(); });
if(resetGreetingsBtn) resetGreetingsBtn.addEventListener('click', ()=>{
  localStorage.removeItem('greetings'); loadSavedGreetings(); updateGreeting();
});

// Weather location inputs and controls
const weatherLatInput = document.getElementById('weatherLat');
const weatherLonInput = document.getElementById('weatherLon');
const useGeoBtn = document.getElementById('useGeoBtn');
const saveWeatherBtn = document.getElementById('saveWeatherBtn');

if(saveWeatherBtn) saveWeatherBtn.addEventListener('click', ()=>{ saveWeatherLocation(); });
if(useGeoBtn) useGeoBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('Geolocation is not available in this browser.'); return; }
  useGeoBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude; const lon = pos.coords.longitude;
    if(weatherLatInput) weatherLatInput.value = String(lat);
    if(weatherLonInput) weatherLonInput.value = String(lon);
    saveWeatherLocation();
    useGeoBtn.disabled = false;
  }, err=>{ alert('Unable to get location: '+ (err.message || err.code)); useGeoBtn.disabled = false; });
});

function normalizeUrl(input){
  if(!input) return null;
  const trimmed = input.trim();
  try{ new URL(trimmed); return trimmed; }catch(e){
    try{ const withProto = 'https://' + trimmed; new URL(withProto); return withProto; }catch(e){ return null; }
  }
}

function renderBookmarks(){
  if(!bookmarksGrid) return;
  bookmarksGrid.innerHTML='';
  bookmarks.forEach(b=>{
    const a=document.createElement('a');
    a.href=b.url; a.className='bm'; a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer');
    const img = document.createElement('img');
    tryLoadFavicon(img, b.url);
    img.alt = b.name;
    a.appendChild(img);
    a.appendChild(document.createTextNode(b.name));
    bookmarksGrid.appendChild(a);
  });
  updateDynamicTextColors();
}

function renderEditor(){
  if(!bookmarkEditor) return;
  bookmarkEditor.innerHTML='';
  bookmarks.forEach((b,i)=>{
    const row=document.createElement('div'); row.className = 'bookmark-row'; row.draggable = true; row.dataset.index = String(i);
    // drag handle
    const handle = document.createElement('span'); handle.className = 'drag-handle'; handle.setAttribute('aria-hidden','true'); handle.textContent = '≡';
    row.appendChild(handle);
    const nameInput = document.createElement('input');
    nameInput.type='text'; nameInput.value = b.name; nameInput.placeholder='Name'; nameInput.dataset.index = i; nameInput.className='edit-name';

    const urlInput = document.createElement('input');
    urlInput.type='text'; urlInput.value = b.url; urlInput.placeholder='URL'; urlInput.dataset.index = i; urlInput.className='edit-url';

    const select = document.createElement('select'); select.dataset.index = i; select.className='positionSelect';
    for(let idx=0; idx<bookmarks.length; idx++){
      const opt = document.createElement('option'); opt.value = String(idx); opt.textContent = String(idx+1);
      if(idx===i) opt.selected = true; select.appendChild(opt);
    }

    const del = document.createElement('button'); del.dataset.index = i; del.className='deleteBookmark'; del.type = 'button'; del.textContent = 'Delete';
    row.appendChild(nameInput); row.appendChild(urlInput); row.appendChild(select); row.appendChild(del);

    // Drag & Drop handlers
    row.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', String(i));
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', ()=>{
      row.classList.remove('dragging');
      document.querySelectorAll('.bookmark-row').forEach(r=>r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e)=>{ e.preventDefault(); row.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move'; });
    row.addEventListener('dragleave', ()=>{ row.classList.remove('drag-over'); });
    row.addEventListener('drop', (e)=>{ e.preventDefault(); row.classList.remove('drag-over'); const from = Number(e.dataTransfer.getData('text/plain')); const to = Number(row.dataset.index); if(Number.isFinite(from) && from!==to){ reorderBookmarks(from, to); } });

    bookmarkEditor.appendChild(row);
  });
  renderPreview();
}

function reorderBookmarks(from, to){
  if(from<0 || to<0 || from===to) return;
  const item = bookmarks.splice(from,1)[0];
  bookmarks.splice(to,0,item);
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  renderEditor(); renderBookmarks();
}

function renderPreview(){
  if(!previewGrid) return;
  previewGrid.innerHTML='';
  bookmarks.forEach((b,i)=>{
    const a=document.createElement('div');
    a.className='bm';
    const img = document.createElement('img');
    tryLoadFavicon(img, b.url);
    img.alt = b.name;
    a.appendChild(img); a.appendChild(document.createTextNode(b.name));
    previewGrid.appendChild(a);
  });
}

// ---------------- Modal + Accessibility (focus trap, Esc to close) ----------------
let _previouslyFocused = null;
const _focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function _getFocusable(el){
  return Array.from(el.querySelectorAll(_focusableSelectors)).filter(e => e.offsetParent !== null);
}

function openConfigModal(){
  renderEditor();
  renderGallery && renderGallery();
  loadSavedGreetings && loadSavedGreetings();
  loadSavedWeatherLocation && loadSavedWeatherLocation();
  if(!configModal) return;
  _previouslyFocused = document.activeElement;
  configModal.classList.add('show');
  configModal.setAttribute('aria-hidden','false');
  if(configButton) configButton.setAttribute('aria-expanded','true');

  const focusables = _getFocusable(configModal);
  if(focusables.length) focusables[0].focus();

  // attach modal-body scroll listener to update floating close button position
  try{ if(modalBody) { modalBody.addEventListener('scroll', _onModalBodyScroll, {passive:true}); _onModalBodyScroll(); } }catch(e){}

  document.addEventListener('keydown', _handleKeydown);
}

function closeConfigModal(){
  if(!configModal) return;
  configModal.classList.remove('show');
  configModal.setAttribute('aria-hidden','true');
  if(configButton) configButton.setAttribute('aria-expanded','false');
  document.removeEventListener('keydown', _handleKeydown);
  try{ if(modalBody) modalBody.removeEventListener('scroll', _onModalBodyScroll); }catch(e){}
  try{ if(modalCloseFloat) modalCloseFloat.classList.remove('scrolled'); }catch(e){}
  if(_previouslyFocused && typeof _previouslyFocused.focus === 'function') _previouslyFocused.focus();
}

// ---------------- Hotkeys: Control + 1..9 and 0 (for 10) open bookmarks ----------------
function _isTypingInForm(){
  const a = document.activeElement;
  if(!a) return false;
  const tag = a.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || a.isContentEditable) return true;
  if(a.getAttribute && a.getAttribute('role') === 'textbox') return true;
  return false;
}

document.addEventListener('keydown', (e)=>{
  try{
    // only respond to Control (no Cmd/meta) per user preference
    if(!e.ctrlKey) return;
    if(e.altKey) return; // ignore Alt combinations
    const key = String(e.key || '');
    if(!/^[0-9]$/.test(key)) return;
    if(_isTypingInForm()) return;
    // map '0' -> index 9 (bookmark 10)
    const idx = (key === '0') ? 9 : (Number(key) - 1);
    if(idx < 0 || idx >= bookmarks.length) return;
    const b = bookmarks[idx];
    if(!b || !b.url) return;
    const normalized = normalizeUrl(b.url) || b.url;
    // open safely using an anchor click to set rel="noopener noreferrer"
    const a = document.createElement('a');
    a.href = normalized;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // show a short toast confirming the hotkey action (uses existing showToast)
    try{ showToast('Opened ' + (b.name || normalized) + ' (' + key + ')', null, 2000); }catch(ex){}
    e.preventDefault();
  }catch(err){ /* swallow */ }
});

function _handleKeydown(e){
  if(!configModal || !configModal.classList.contains('show')) return;
  if(e.key === 'Escape'){
    e.preventDefault();
    closeConfigModal();
    return;
  }
  if(e.key === 'Tab'){
    const focusables = _getFocusable(configModal);
    if(!focusables.length) return;
    const idx = focusables.indexOf(document.activeElement);
    if(e.shiftKey){
      if(idx === 0){ focusables[focusables.length-1].focus(); e.preventDefault(); }
    } else {
      if(idx === focusables.length-1){ focusables[0].focus(); e.preventDefault(); }
    }
  }
}

if(configButton){
  configButton.addEventListener('click',()=>{ openConfigModal(); });
}
if(closeConfig){
  closeConfig.addEventListener('click',()=>{ closeConfigModal(); });
}
// floating close button and scroll-linked movement
const modalCloseFloat = document.getElementById('modalCloseFloat');
const modalBody = document.querySelector('#configModal .modal-body');
function _onModalBodyScroll(){
  try{
    if(!modalBody || !modalCloseFloat) return;
    const st = modalBody.scrollTop || 0;
    if(st > 30) modalCloseFloat.classList.add('scrolled');
    else modalCloseFloat.classList.remove('scrolled');
  }catch(e){}
}
if(modalCloseFloat){ modalCloseFloat.addEventListener('click', ()=>{ closeConfigModal(); }); }

// ---------------- Bookmark actions ----------------
if(addBookmark){ addBookmark.addEventListener('click',()=>{bookmarks.push({name:"New", url:"https://"}); renderEditor();}); }
if(saveBookmarks){ saveBookmarks.addEventListener('click',()=>{
  const names=document.querySelectorAll('.edit-name');
  const urls=document.querySelectorAll('.edit-url');
  const positions=document.querySelectorAll('.positionSelect');
  const newArr=Array.from({length:bookmarks.length},()=>null);
  const invalids = [];
  for(let i=0;i<bookmarks.length;i++){
    const rawName = names[i].value.trim();
    const rawUrl = urls[i].value.trim();
    const normalized = normalizeUrl(rawUrl);
    if(rawUrl && !normalized){ invalids.push(i+1); }
    const b={name: rawName || `Bookmark ${i+1}`, url: normalized || ''}; const pos=parseInt(positions[i].value);
    newArr[pos]=b;
  }
  if(invalids.length){ alert('Invalid URL for bookmark positions: ' + invalids.join(', ') + '. Please fix before saving.'); return; }
  bookmarks=newArr.filter(Boolean);
  localStorage.setItem('bookmarks',JSON.stringify(bookmarks));
  renderBookmarks(); renderEditor();
}); }

if(bookmarkEditor){
  bookmarkEditor.addEventListener('click', e=>{
    if(e.target.classList.contains('deleteBookmark')){
      bookmarks.splice(e.target.dataset.index,1); renderEditor();
    }
  });
  bookmarkEditor.addEventListener('change', e=>{if(e.target.classList.contains('positionSelect')) renderPreview();});
}

// ---------------- Background ----------------
const savedBg=localStorage.getItem('backgroundURL');
let _currentObjectUrl = null;
async function applySavedBackground(){
  const saved = localStorage.getItem('backgroundURL');
  if(!saved){ document.body.style.backgroundImage=''; return; }
  if(saved.startsWith('db:')){
    const id = saved.split(':')[1];
    try{
      const blob = await getImage(id);
      if(blob){
        if(_currentObjectUrl) URL.revokeObjectURL(_currentObjectUrl);
        _currentObjectUrl = URL.createObjectURL(blob);
        document.body.style.backgroundImage = `url('${_currentObjectUrl}')`;
        // ensure text colors update to match the newly-applied background
        try{ updateDynamicTextColors(); }catch(e){}
      }
    }catch(err){ console.warn('Failed to load DB background', err); }
  } else {
    if(_currentObjectUrl) { URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; }
    document.body.style.backgroundImage=`url('${saved}')`;
    // ensure text colors update to match the newly-applied background
    try{ updateDynamicTextColors(); }catch(e){}
  }
}
if(saveBg){ saveBg.addEventListener('click',()=>{
  const urlRaw = bgInput.value.trim();
  if(!urlRaw){ document.body.style.backgroundImage=''; localStorage.removeItem('backgroundURL'); updateDynamicTextColors(); return; }
  const normalized = normalizeUrl(urlRaw);
  if(!normalized){ alert('Background URL appears invalid. Please provide a valid URL.'); return; }
  document.body.style.backgroundImage = `url('${normalized}')`; localStorage.setItem('backgroundURL', normalized); updateDynamicTextColors(); maybeAutoThemeOnSet(normalized);
}); }

// ---------------- Background Gallery & Upload ----------------
const bgGallery = document.getElementById('bgGallery');
const bgUpload = document.getElementById('bgUpload');
const clearBgBtn = document.getElementById('clearBackground');
const autoThemeToggle = document.getElementById('autoThemeToggle');

// Curated sample backgrounds (replace or expand as desired)
const curatedBackgrounds = [
  'https://picsum.photos/id/1015/1600/1000',
  'https://picsum.photos/id/1016/1600/1000',
  'https://picsum.photos/id/1025/1600/1000',
  'https://picsum.photos/id/1035/1600/1000',
  'https://picsum.photos/id/1043/1600/1000'
];

function renderGallery(){
  if(!bgGallery) return;
  bgGallery.innerHTML = '';
  const current = localStorage.getItem('backgroundURL') || '';
  // first render uploaded images from IndexedDB (if any)
  (async function(){
    try{
      const uploaded = await getAllImages();
      for(const item of uploaded){
        const url = URL.createObjectURL(item.blob);
        const thumb = document.createElement('div');
        thumb.tabIndex = 0;
        thumb.role = 'button';
        thumb.className = 'bg-thumb';
        thumb.dataset.dbId = String(item.id);
        const img = document.createElement('img'); img.src = url; img.alt = item.name || 'Uploaded background';
        thumb.appendChild(img);

        // actions overlay (delete only)
        const actions = document.createElement('div'); actions.className = 'thumb-actions';
        const deleteBtn = document.createElement('button'); deleteBtn.type='button'; deleteBtn.title='Delete'; deleteBtn.innerText='✕'; deleteBtn.setAttribute('aria-label','Delete uploaded background');
        actions.appendChild(deleteBtn);
        thumb.appendChild(actions);

        if(current && current === `db:${item.id}`) thumb.classList.add('selected');

        // click to select
        thumb.addEventListener('click', (e)=>{
          // if click originated from an action button, ignore
          if(e.target === deleteBtn) return;
          document.body.style.backgroundImage = `url('${url}')`;
          localStorage.setItem('backgroundURL', `db:${item.id}`);
          updateDynamicTextColors();
          maybeAutoThemeOnSet(`db:${item.id}`);
          document.querySelectorAll('.bg-thumb').forEach(t=>t.classList.remove('selected'));
          thumb.classList.add('selected');
        });

        // delete handler (immediate delete with undo via toast)
        deleteBtn.addEventListener('click', async (ev)=>{
          ev.stopPropagation();
          try{
            // cache blob & name for undo
            const blob = item.blob;
            const name = item.name;
            const wasSelected = (localStorage.getItem('backgroundURL') === `db:${item.id}`);
            // delete now
            await deleteImage(item.id);
            // clear background if it was selected
            if(wasSelected){ localStorage.removeItem('backgroundURL'); if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; } document.body.style.backgroundImage=''; }
            renderGallery(); updateDynamicTextColors();

            // show toast with undo
            showToast('Background deleted', async ()=>{
              try{
                const newId = await addImage(blob, name || 'Uploaded image');
                // if it was previously selected, restore selection
                if(wasSelected){ localStorage.setItem('backgroundURL', `db:${newId}`); await applySavedBackground(); }
                // try to auto-theme from restored image
                if(wasSelected){ maybeAutoThemeOnSet(`db:${newId}`); }
                renderGallery(); updateDynamicTextColors();
              }catch(err){ console.error('Undo failed', err); }
            });
          }catch(err){ alert('Failed to delete image'); }
        });

        bgGallery.appendChild(thumb);
      }
    }catch(err){ console.warn('Could not load uploaded backgrounds', err); }
    // then curated backgrounds
    curatedBackgrounds.forEach(url=>{
      const thumb = document.createElement('button');
      thumb.type = 'button'; thumb.className = 'bg-thumb';
      const img = document.createElement('img'); img.src = url; img.alt = 'Background option';
      thumb.appendChild(img);
      if(current && current === url) thumb.classList.add('selected');
      thumb.addEventListener('click', ()=>{
        document.body.style.backgroundImage = `url('${url}')`;
        localStorage.setItem('backgroundURL', url);
        updateDynamicTextColors();
        maybeAutoThemeOnSet(url);
        // refresh selection
        document.querySelectorAll('.bg-thumb').forEach(t=>t.classList.remove('selected'));
        thumb.classList.add('selected');
      });
      bgGallery.appendChild(thumb);
    });
  })();
}

    // ---------------- Auto-theming from background ----------------
    const AUTO_THEME_KEY = 'autoThemeEnabled';
    function isAutoThemeEnabled(){ return localStorage.getItem(AUTO_THEME_KEY) === '1'; }
    if(autoThemeToggle){
      autoThemeToggle.checked = isAutoThemeEnabled();
      autoThemeToggle.addEventListener('change', ()=>{
        localStorage.setItem(AUTO_THEME_KEY, autoThemeToggle.checked ? '1' : '0');
        if(autoThemeToggle.checked){
          const current = localStorage.getItem('backgroundURL');
          if(current) applyThemeFromBackgroundRef(current);
        }
      });
    }

    async function applyThemeFromBackgroundRef(ref){
      if(!isAutoThemeEnabled()) return;
      try{
        if(!ref) return;
        if(ref.startsWith('db:')){
          const id = ref.split(':')[1];
          const blob = await getImage(id);
          if(!blob) return;
          const obj = URL.createObjectURL(blob);
          await applyThemeFromImage(obj, true);
          URL.revokeObjectURL(obj);
        } else {
          await applyThemeFromImage(ref, true);
        }
      }catch(err){ console.warn('Auto-theme failed', err); }
    }

    async function applyThemeFromImage(src, force=false){
      if(!isAutoThemeEnabled() && !force) return;
      return new Promise((resolve)=>{
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
          try{
            const w = Math.min(200, img.naturalWidth);
            const h = Math.min(200, img.naturalHeight);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            let data;
            try{ data = ctx.getImageData(0,0,w,h).data; }catch(e){ console.warn('CORS or tainted canvas, cannot extract colors'); resolve(); return; }

            const counts = new Map();
            for(let i=0;i<data.length;i+=4){
              const r = data[i]>>4; const g = data[i+1]>>4; const b = data[i+2]>>4; const a = data[i+3];
              if(a < 125) continue;
              const key = (r<<8) | (g<<4) | b;
              counts.set(key, (counts.get(key)||0)+1);
            }
            const entries = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
            if(entries.length===0){ resolve(); return; }
            const toRgb = (key)=>{
              const r = (key>>8)&0xF; const g = (key>>4)&0xF; const b = key&0xF;
              return [ (r<<4)|(r), (g<<4)|(g), (b<<4)|(b) ];
            };
            const top = entries.slice(0,6).map(e=>toRgb(e[0]));
            const primary = top[0];
            const lum = getLuminance(primary[0], primary[1], primary[2]);
            const fg = lum > 0.5 ? '#111111' : '#ffffff';
            const saturations = top.map(rgb=>{ const max=Math.max(...rgb); const min=Math.min(...rgb); return (max===0?0:(max-min)/max); });
            let accIdx = saturations.indexOf(Math.max(...saturations)); if(accIdx<0) accIdx=1<top.length?1:0;
            const accentRgb = top[accIdx] || top[0];
            const accent = `rgb(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]})`;
            const secondaryRgb = primary.map(v=> Math.round(v*0.7 + 40));
            const secondary = `rgb(${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]})`;

            document.documentElement.style.setProperty('--bg', `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`);
            document.documentElement.style.setProperty('--fg', fg);
            document.documentElement.style.setProperty('--accent', accent);
            document.documentElement.style.setProperty('--secondary', secondary);
            document.documentElement.style.setProperty('--bookmark-bg', `rgba(${primary[0]}, ${primary[1]}, ${primary[2]}, 0.08)`);
            document.documentElement.style.setProperty('--bookmark-hover-bg', `rgba(${primary[0]}, ${primary[1]}, ${primary[2]}, 0.18)`);
            localStorage.setItem('derivedTheme', JSON.stringify({
              '--bg': `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`, '--fg': fg, '--accent': accent, '--secondary': secondary,
              '--bookmark-bg': `rgba(${primary[0]}, ${primary[1]}, ${primary[2]}, 0.08)`, '--bookmark-hover-bg': `rgba(${primary[0]}, ${primary[1]}, ${primary[2]}, 0.18)`
            }));

            updateDynamicTextColors();
            resolve();
          }catch(err){ console.error('Palette extraction error', err); resolve(); }
        };
        img.onerror = function(){ console.warn('Image failed to load for theming', src); resolve(); };
        img.src = src;
      });
    }

    function maybeAutoThemeOnSet(ref){ if(isAutoThemeEnabled()){ applyThemeFromBackgroundRef(ref); } }

// ---------------- IndexedDB helper for uploaded images ----------------
const IDB_NAME = 'startpage-images';
const IDB_STORE = 'images';
let _dbPromise = null;

function initDB(){
  if(_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = function(e){
      const db = e.target.result;
      if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, {keyPath:'id', autoIncrement:true});
    };
    req.onsuccess = function(e){ resolve(e.target.result); };
    req.onerror = function(e){ reject(e.target.error); };
  });
  return _dbPromise;
}

async function addImage(blob, name){
  const db = await initDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const rec = {blob: blob, name: name, created: Date.now()};
    const r = store.add(rec);
    r.onsuccess = function(ev){ resolve(ev.target.result); };
    r.onerror = function(ev){ reject(ev.target.error); };
  });
}

async function getImage(id){
  const db = await initDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const r = store.get(Number(id));
    r.onsuccess = function(ev){ resolve(ev.target.result?.blob); };
    r.onerror = function(ev){ reject(ev.target.error); };
  });
}

async function getAllImages(){
  const db = await initDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const out = [];
    const req = store.openCursor(null, 'prev');
    req.onsuccess = function(e){
      const cur = e.target.result;
      if(cur){ out.push({id: cur.primaryKey, blob: cur.value.blob, name: cur.value.name}); cur.continue(); }
      else resolve(out);
    };
    req.onerror = function(e){ reject(e.target.error); };
  });
}

// initialize DB early
initDB().catch(err=>console.warn('IndexedDB not available', err));

// ---------------- image management helpers ----------------
async function deleteImage(id){
  const db = await initDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const r = store.delete(Number(id));
    r.onsuccess = ()=>resolve(); r.onerror = (e)=>reject(e.target.error);
  });
}

// renameImage removed — rename functionality intentionally disabled

// ---------------- Toast (undo) ----------------
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastUndo = document.getElementById('toastUndo');
let _toastTimer = null;
function showToast(message, undoCallback, timeout=6000){
  if(!toast) return;
  toastMsg.textContent = message;
  toast.classList.add('show');
  // clear previous
  if(_toastTimer) clearTimeout(_toastTimer);
  const clear = ()=>{ toast.classList.remove('show'); if(_toastTimer){ clearTimeout(_toastTimer); _toastTimer = null; } };
  _toastTimer = setTimeout(()=>{ clear(); }, timeout);
  // setup undo
  function onUndo(){ if(undoCallback) undoCallback(); clear(); toastUndo.removeEventListener('click', onUndo); }
  toastUndo.addEventListener('click', onUndo, {once:true});
}

// ---------------- Import / Export Settings ----------------
function exportSettings(){
  try{
    const keys = ['selectedTheme','customTheme','backgroundURL','greetings','weatherLocation','autoThemeEnabled','derivedTheme'];
    const out = {};
    out.bookmarks = bookmarks || [];
    keys.forEach(k=>{ try{ const v = localStorage.getItem(k); if(v !== null) out[k] = JSON.parse(v); }catch(e){} });
    const json = JSON.stringify(out, null, 2);
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `startpage-export-${(new Date()).toISOString().slice(0,10)}.json`; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Export downloaded');
  }catch(err){ console.error(err); alert('Export failed'); }
}

function importFromFile(file){
  if(!file) return; const reader = new FileReader(); reader.onload = function(ev){ try{ const obj = JSON.parse(ev.target.result); applyImportedSettings(obj); setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 700); }catch(e){ alert('Invalid JSON file'); } }; reader.onerror = function(){ alert('Failed to read file'); }; reader.readAsText(file);
}

// wire up controls (guarded)
try{
  const exportBtn = document.getElementById('exportSettings'); if(exportBtn) exportBtn.addEventListener('click', ()=>{ exportSettings(); });
  const importFile = document.getElementById('importFile'); if(importFile) importFile.addEventListener('change', (e)=>{ const f = e.target.files && e.target.files[0]; if(f) importFromFile(f); });
}catch(e){}

if(bgUpload){
  bgUpload.addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){ alert('Please upload an image file.'); return; }
    try{
      // store blob in IndexedDB
      const id = await addImage(file, file.name || 'Uploaded image');
      // set background to DB id
      localStorage.setItem('backgroundURL', `db:${id}`);
      const blob = await getImage(id);
      const objUrl = URL.createObjectURL(blob);
      document.body.style.backgroundImage = `url('${objUrl}')`;
      updateDynamicTextColors();
      maybeAutoThemeOnSet(`db:${id}`);
      // re-render gallery to include uploaded image
      renderGallery();
    }catch(err){
      console.error(err);
      alert('Unable to save uploaded image.');
    }
  });
}

if(clearBgBtn){
  clearBgBtn.addEventListener('click', ()=>{
    document.body.style.backgroundImage = '';
    localStorage.removeItem('backgroundURL');
    if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; }
    updateDynamicTextColors();
    if(bgUpload) bgUpload.value = '';
    document.querySelectorAll('.bg-thumb').forEach(t=>t.classList.remove('selected'));
  });
}

// ---------------- Custom theme editor ----------------
document.querySelectorAll('#themeEditor input').forEach(input=>{
  input.addEventListener('input',e=>{
    const v=e.target.dataset.var; document.documentElement.style.setProperty(v,e.target.value);
    localStorage.setItem('customTheme',JSON.stringify({...JSON.parse(localStorage.getItem('customTheme')||'{}'),[v]:e.target.value}));
    updateDynamicTextColors();
  });
});
const savedCustom=JSON.parse(localStorage.getItem('customTheme')||'{}'); for(let v in savedCustom) document.documentElement.style.setProperty(v,savedCustom[v]);

// ---------------- Dynamic Text Color ----------------
function getLuminance(r,g,b){
  const a=[r,g,b].map(v=>{
    v/=255;
    return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}

function updateDynamicTextColors(){
  let bgColor = getComputedStyle(document.body).backgroundColor;
  if(document.body.style.backgroundImage && document.body.style.backgroundImage!=='none'){
    const tc = document.querySelector('.translucent-container');
    if(tc) bgColor = getComputedStyle(tc).backgroundColor;
  }
  const rgb = bgColor.match(/\d+/g)?.map(Number) || [40,40,40];
  const lum = getLuminance(rgb[0], rgb[1], rgb[2]);
  const color = lum>0.5 ? '#1a1a1a' : '#ebdbb2';
  // set CSS variable so components and inputs pick up theme consistently
  try{ document.documentElement.style.setProperty('--fg', color); }catch(e){}
  // ensure bookmark items use the computed color as fallback
  document.querySelectorAll('.bm').forEach(b=>{ b.style.color = 'var(--fg)'; });
}

// Initial render
renderBookmarks();
updateDynamicTextColors();

// ========== WIDGETS: TODO LIST =========
const todoInput = document.getElementById('todoInput');
const todoAdd = document.getElementById('todoAdd');
const todoList = document.getElementById('todoList');
const todoWidget = document.getElementById('todoWidget');
const TODOS_KEY = 'todos';

function loadTodos(){
  try{ return JSON.parse(localStorage.getItem(TODOS_KEY) || '[]'); }
  catch(e){ return []; }
}

function saveTodos(todos){
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

function renderTodos(){
  const todos = loadTodos();
  todoList.innerHTML = '';
  todos.forEach((todo, idx)=>{
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `Todo: ${todo.text}`);
    checkbox.addEventListener('change', ()=>{
      todos[idx].completed = checkbox.checked;
      saveTodos(todos);
      renderTodos();
    });
    const span = document.createElement('span');
    span.textContent = todo.text;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'todo-item-delete';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', `Delete: ${todo.text}`);
    delBtn.addEventListener('click', ()=>{
      todos.splice(idx, 1);
      saveTodos(todos);
      renderTodos();
    });
    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    todoList.appendChild(li);
  });
}

function addTodo(text){
  const trimmed = text.trim();
  if(!trimmed) return;
  const todos = loadTodos();
  todos.push({text: trimmed, completed: false});
  saveTodos(todos);
  renderTodos();
  if(todoInput) todoInput.value = '';
}

if(todoAdd) todoAdd.addEventListener('click', ()=>{ addTodo(todoInput?.value || ''); });
if(todoInput) todoInput.addEventListener('keypress', (e)=>{
  if(e.key === 'Enter'){ addTodo(todoInput.value); }
});

renderTodos();

// ========== WIDGETS: NEWS FEED (RSS) =========
const newsFeed = document.getElementById('newsFeed');
const newsWidget = document.getElementById('newsWidget');
const newsRefresh = document.getElementById('newsRefresh');
const NEWS_CACHE_KEY = 'newsCache';
const NEWS_CACHE_EXPIRY = 3600000; // 1 hour in ms

// Top 10 news/tech RSS feeds in America
const RSS_FEEDS = [
  'https://feeds.reuters.com/reuters/technologyNews',
  'https://feeds.bloomberg.com/markets/news.rss',
  'https://feeds.cnbc.com/cnbc/world-news',
  'https://feeds.washingtonpost.com/rss/politics',
  'https://feeds.bloomberg.com/technology/news.rss',
  'https://feeds.theguardian.com/world',
  'https://feeds.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://feeds.arstechnica.com/arstechnica/feed',
  'https://feeds.theverge.com/feed',
  'https://techcrunch.com/feed/'
];

async function fetchRSSFeed(url){
  try{
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
      headers: { 'Accept': 'application/rss+xml,application/xml,text/xml' }
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    if(doc.getElementsByTagName('parsererror').length) throw new Error('Parse error');
    
    const items = [];
    const entries = doc.querySelectorAll('item, entry');
    entries.forEach(entry=>{
      const titleEl = entry.querySelector('title');
      const linkEl = entry.querySelector('link');
      const pubEl = entry.querySelector('pubDate, published');
      const sourceEl = entry.querySelector('source > title');
      
      const title = titleEl?.textContent?.trim() || 'Untitled';
      let link = '';
      if(linkEl?.tagName === 'link'){
        link = linkEl.getAttribute('href') || linkEl.textContent?.trim() || '';
      } else {
        link = linkEl?.textContent?.trim() || '';
      }
      const pubDate = pubEl?.textContent ? new Date(pubEl.textContent).getTime() : Date.now();
      const source = sourceEl?.textContent?.trim() || url.split('/')[2] || 'News';
      
      if(title && link) items.push({title, link, pubDate, source});
    });
    return items;
  }catch(err){
    console.warn('Failed to fetch RSS:', url, err);
    return [];
  }
}

async function fetchAllNews(){
  try{
    newsFeed.innerHTML = '<div class="news-loading">Loading news...</div>';
    
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if(cached){
      try{
        const {data, timestamp} = JSON.parse(cached);
        if(Date.now() - timestamp < NEWS_CACHE_EXPIRY){
          renderNews(data);
          return;
        }
      }catch(e){}
    }
    
    const allArticles = [];
    const promises = RSS_FEEDS.map(feed=>fetchRSSFeed(feed).then(items=>allArticles.push(...items)));
    await Promise.all(promises);
    
    // deduplicate by title + sort by date (newest first)
    const seen = new Set();
    const unique = allArticles.filter(a=>{
      const key = a.title.toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a,b)=>b.pubDate - a.pubDate).slice(0,15);
    
    // cache the results
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
      data: unique,
      timestamp: Date.now()
    }));
    
    renderNews(unique);
  }catch(err){
    console.error('News fetch error:', err);
    newsFeed.innerHTML = '<div class="news-error">Unable to load news feed. Please try again later.</div>';
  }
}

function renderNews(articles){
  if(!articles || articles.length === 0){
    newsFeed.innerHTML = '<div class="news-error">No articles available.</div>';
    return;
  }
  
  newsFeed.innerHTML = '';
  articles.forEach(article=>{
    const div = document.createElement('div');
    div.className = 'news-item';
    
    const titleEl = document.createElement('h4');
    titleEl.className = 'news-item-title';
    const link = document.createElement('a');
    link.href = article.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = article.title;
    titleEl.appendChild(link);
    
    const sourceEl = document.createElement('p');
    sourceEl.className = 'news-item-source';
    const date = new Date(article.pubDate);
    const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    sourceEl.textContent = `${article.source} • ${timeStr}`;
    
    div.appendChild(titleEl);
    div.appendChild(sourceEl);
    newsFeed.appendChild(div);
  });
}

if(newsRefresh) newsRefresh.addEventListener('click', ()=>{ localStorage.removeItem(NEWS_CACHE_KEY); fetchAllNews(); });

// Load news on startup
fetchAllNews();

// ========== WIDGETS: DRAG & LOCK =========
const widgetsContainer = document.getElementById('widgetsContainer');
const WIDGET_POSITIONS_KEY = 'widgetPositions';
const WIDGET_LOCK_KEY = 'widgetsLocked';
const WIDGET_VISIBILITY_KEY = 'widgetVisibility';

let _draggedWidget = null;
let _widgetsLocked = localStorage.getItem(WIDGET_LOCK_KEY) === '1';

function loadWidgetPositions(){
  try{ return JSON.parse(localStorage.getItem(WIDGET_POSITIONS_KEY) || '{}'); }
  catch(e){ return {}; }
}

function saveWidgetPositions(){
  const positions = {};
  document.querySelectorAll('.widget').forEach(w=>{
    const id = w.id;
    if(w.style.position === 'fixed'){
      positions[id] = {
        left: parseFloat(w.style.left) || 0,
        top: parseFloat(w.style.top) || 0,
        width: parseFloat(w.style.width) || 0
      };
    }
  });
  localStorage.setItem(WIDGET_POSITIONS_KEY, JSON.stringify(positions));
}

function applyWidgetPositions(){
  const positions = loadWidgetPositions();
  document.querySelectorAll('.widget').forEach(w=>{
    const id = w.id;
    const pos = positions[id];
    if(pos && typeof pos.left === 'number' && typeof pos.top === 'number'){
      w.style.position = 'fixed';
      w.style.left = pos.left + 'px';
      w.style.top = pos.top + 'px';
      w.style.width = pos.width + 'px';
      w.style.zIndex = '100';
      w.style.margin = '0';
    }
  });
}

function setupWidgetDragging(){
  document.querySelectorAll('.widget-drag-handle').forEach(handle=>{
    handle.addEventListener('mousedown', (e)=>{
      if(_widgetsLocked) return;
      const widget = handle.closest('.widget');
      if(!widget) return;
      
      _draggedWidget = widget;
      widget.classList.add('dragging');
      
      // Convert to fixed positioning if not already
      if(widget.style.position !== 'fixed'){
        const rect = widget.getBoundingClientRect();
        widget.style.position = 'fixed';
        widget.style.left = rect.left + 'px';
        widget.style.top = rect.top + 'px';
        widget.style.width = rect.width + 'px';
        widget.style.zIndex = '100';
      }
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(widget.style.left) || 0;
      const startTop = parseFloat(widget.style.top) || 0;
      
      function onMouseMove(ev){
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        widget.style.left = (startLeft + dx) + 'px';
        widget.style.top = (startTop + dy) + 'px';
      }
      
      function onMouseUp(){
        if(!_draggedWidget) return;
        _draggedWidget.classList.remove('dragging');
        saveWidgetPositions();
        _draggedWidget = null;
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });
  });
}

function setWidgetsLocked(locked){
  _widgetsLocked = locked;
  localStorage.setItem(WIDGET_LOCK_KEY, locked ? '1' : '0');
  document.querySelectorAll('.widget').forEach(w=>{
    if(locked) w.classList.add('locked');
    else w.classList.remove('locked');
  });
}

function toggleWidgetVisibility(widgetId, visible){
  const widget = document.getElementById(widgetId);
  if(widget) widget.style.display = visible ? '' : 'none';
  
  const visibility = JSON.parse(localStorage.getItem(WIDGET_VISIBILITY_KEY) || '{}');
  visibility[widgetId] = visible;
  localStorage.setItem(WIDGET_VISIBILITY_KEY, JSON.stringify(visibility));
}

function loadWidgetVisibility(){
  const visibility = JSON.parse(localStorage.getItem(WIDGET_VISIBILITY_KEY) || '{}');
  // default to showing both
  const todoVisible = visibility.todoWidget !== false;
  const newsVisible = visibility.newsWidget !== false;
  
  toggleWidgetVisibility('todoWidget', todoVisible);
  toggleWidgetVisibility('newsWidget', newsVisible);
  
  const todoToggle = document.getElementById('todoWidgetToggle');
  const newsToggle = document.getElementById('newsWidgetToggle');
  if(todoToggle) todoToggle.checked = todoVisible;
  if(newsToggle) newsToggle.checked = newsVisible;
}

setupWidgetDragging();
loadWidgetVisibility();
applyWidgetPositions();

// Set up widget visibility toggles in modal
const todoWidgetToggle = document.getElementById('todoWidgetToggle');
const newsWidgetToggle = document.getElementById('newsWidgetToggle');
const widgetLockToggle = document.getElementById('widgetLockToggle');

if(todoWidgetToggle){
  todoWidgetToggle.addEventListener('change', ()=>{
    toggleWidgetVisibility('todoWidget', todoWidgetToggle.checked);
  });
}

if(newsWidgetToggle){
  newsWidgetToggle.addEventListener('change', ()=>{
    toggleWidgetVisibility('newsWidget', newsWidgetToggle.checked);
  });
}

if(widgetLockToggle){
  widgetLockToggle.checked = _widgetsLocked;
  widgetLockToggle.addEventListener('change', ()=>{
    setWidgetsLocked(widgetLockToggle.checked);
  });
}

// Apply initial lock state
if(_widgetsLocked){
  document.querySelectorAll('.widget').forEach(w=> w.classList.add('locked'));
}

// Apply saved background and auto-theme after all helpers/constants
// have been declared (avoids temporal-dead-zone ReferenceErrors).
applySavedBackground();
// apply auto-theme at startup if enabled
maybeAutoThemeOnSet(localStorage.getItem('backgroundURL'));
