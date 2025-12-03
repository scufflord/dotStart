// ----------------- Application entry (script.js) -----------------
// This file is the top-level orchestrator: it imports feature modules
// and provides a small compatibility layer (exposing/using `window.*`)
// so the incremental modularization doesn't break existing wiring.
//
// NOTE: The page must be served over HTTP to allow ES modules and
// certain browser APIs to behave predictably during development.
import './modules/utils.js';
import './modules/modal.js';
import './modules/bookmarks.js';
import './modules/widgets.js';
import './modules/background.js';
import './modules/weather.js';
import './modules/importExport.js';

// Local aliases for helpers exported by `js/modules/utils.js`.
// The utilities module exposes a minimal set of helpers on `window` to
// allow this top-level script (and any remaining inline code) to keep
// calling the same functions while we migrate functionality into modules.
const normalizeUrl = window.normalizeUrl;
const tryLoadFavicon = window.tryLoadFavicon;
const showToast = window.showToast;
const updateDynamicTextColors = window.updateDynamicTextColors;
function updateClock(){
  const el = document.getElementById("clock");
  if(el) el.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
setInterval(updateClock,1000); updateClock();

// ---------------- Search form handler ----------------
const searchEngines = {
  google: 'https://www.google.com/search?q={q}',
  ddg: 'https://duckduckgo.com/?q={q}',
  bing: 'https://www.bing.com/search?q={q}',
  startpage: 'https://www.startpage.com/do/search?q={q}',
  brave: 'https://search.brave.com/search?q={q}',
  custom: ''
};

const searchEngineFavicons = {
  google: 'https://www.google.com/favicon.ico',
  ddg: 'https://duckduckgo.com/favicon.ico',
  bing: 'https://www.bing.com/favicon.ico',
  startpage: 'https://www.startpage.com/favicon.ico',
  brave: 'https://brave.com/static-assets/images/brave-favicon.png',
  custom: ''
};

function updateSearchFavicon(){
  const faviconImg = document.getElementById('searchEngineFavicon');
  if(!faviconImg) return;
  
  const engineSelect = document.getElementById('searchEngineSelect');
  const selected = engineSelect?.value || 'google';
  
  if(selected === 'custom'){
    const templateInput = document.getElementById('searchEngineTemplate');
    const template = templateInput?.value?.trim() || '';
    if(template){
      try{
        const url = new URL(template.replace('{q}', ''));
        faviconImg.src = `${url.origin}/favicon.ico`;
      }catch(e){
        faviconImg.src = '';
      }
    }else{
      faviconImg.src = '';
    }
  }else{
    faviconImg.src = searchEngineFavicons[selected] || '';
  }
}

function getSearchTemplate(){
  const engineSelect = document.getElementById('searchEngineSelect');
  const templateInput = document.getElementById('searchEngineTemplate');
  const selected = engineSelect?.value || 'google';
  
  if(selected === 'custom'){
    const custom = templateInput?.value?.trim() || '';
    return custom || searchEngines.google;
  }
  return searchEngines[selected] || searchEngines.google;
}

function saveSearchEngine(){
  const engineSelect = document.getElementById('searchEngineSelect');
  const templateInput = document.getElementById('searchEngineTemplate');
  if(engineSelect){
    localStorage.setItem('searchEngine', engineSelect.value);
  }
  if(templateInput){
    localStorage.setItem('searchTemplate', templateInput.value);
  }
}

function loadSearchEngine(){
  const engineSelect = document.getElementById('searchEngineSelect');
  const templateInput = document.getElementById('searchEngineTemplate');
  const saved = localStorage.getItem('searchEngine') || 'google';
  const savedTemplate = localStorage.getItem('searchTemplate') || '';
  
  if(engineSelect) engineSelect.value = saved;
  if(templateInput) templateInput.value = savedTemplate || searchEngines[saved] || '';
  
  // Update template when selection changes
  if(engineSelect){
    engineSelect.addEventListener('change', ()=>{
      const selected = engineSelect.value;
      if(selected !== 'custom' && templateInput){
        templateInput.value = searchEngines[selected] || '';
      }
      saveSearchEngine();
      updateSearchFavicon();
    });
  }
  if(templateInput){
    templateInput.addEventListener('input', ()=>{
      saveSearchEngine();
      updateSearchFavicon();
    });
  }
  
  updateSearchFavicon();
}

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');

if(searchForm){
  searchForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const query = searchInput?.value?.trim();
    if(!query) return;
    
    const template = getSearchTemplate();
    const url = template.replace('{q}', encodeURIComponent(query));
    
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

loadSearchEngine();

function updateGreeting(){
  const el = document.getElementById("greeting");
  if(!el) return;
  const h = new Date().getHours();
  // load custom greetings if present
  const saved = JSON.parse(localStorage.getItem('greetings') || '{}');
  const morning = saved.morning || 'Good morning';
  const afternoon = saved.afternoon || 'Good afternoon';
  const evening = saved.evening || 'Good evening';
  let msg = 'dotStart';
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

// Helper: detect if the user is currently typing in an input-like element.
// Used to prevent global hotkeys (Ctrl+1..9) from triggering while
// the user is entering text.
function _isTypingInForm(){
  const a = document.activeElement;
  if(!a) return false;
  const tag = a.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || a.isContentEditable) return true;
  if(a.getAttribute && a.getAttribute('role') === 'textbox') return true;
  return false;
}

function loadSavedWeatherLocation(){
  try{
    const saved = JSON.parse(localStorage.getItem('weatherLocation') || '{}');
    if(typeof weatherLatInput !== 'undefined' && weatherLatInput) weatherLatInput.value = saved.lat || '';
    if(typeof weatherLonInput !== 'undefined' && weatherLonInput) weatherLonInput.value = saved.lon || '';
  }catch(e){}
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
    const bm = window.bookmarks || [];
    if(idx < 0 || idx >= bm.length) return;
    const b = bm[idx];
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
  // Modal keyboard handler used by the modal module.
  // Keeps Escape/Tab behavior centralized here while the modal module
  // remains small. This function is installed/removed when the modal
  // opens/closes and expects the modal to expose `window._getFocusable`.
  const cfg = window.configModal;
  if(!cfg || !cfg.classList.contains('show')) return;
  if(e.key === 'Escape'){
    e.preventDefault();
    if(window.closeConfigModal) window.closeConfigModal();
    return;
  }
  if(e.key === 'Tab'){
    const focusables = (window._getFocusable ? window._getFocusable(cfg) : []);
    if(!focusables.length) return;
    const idx = focusables.indexOf(document.activeElement);
    if(e.shiftKey){
      if(idx === 0){ focusables[focusables.length-1].focus(); e.preventDefault(); }
    } else {
      if(idx === focusables.length-1){ focusables[0].focus(); e.preventDefault(); }
    }
  }
}

// expose for modal module to call
window._handleKeydown = _handleKeydown;

// Modal controls: the modal module exposes `window.configButton` and
// `window.closeConfig` during initialization. Use those globals to avoid
// ReferenceErrors if the module hasn't wired DOM refs yet.
if(window.configButton){
  window.configButton.addEventListener('click',()=>{ if(window.openConfigModal) window.openConfigModal(); });
}
if(window.closeConfig){
  window.closeConfig.addEventListener('click',()=>{ if(window.closeConfigModal) window.closeConfigModal(); });
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
if(modalCloseFloat){ modalCloseFloat.addEventListener('click', ()=>{ if(window.closeConfigModal) window.closeConfigModal(); }); }

// Bookmark actions are handled in `js/modules/bookmarks.js` (rendering,
// editor UI, drag/reorder, and persistence). That module exposes
// `window.bookmarks` and helper functions for compatibility.

// Import/export handled by `js/modules/importExport.js` (keeps script.js small)

// ---------------- Custom theme editor ----------------
document.querySelectorAll('#themeEditor input').forEach(input=>{
  input.addEventListener('input',e=>{
    const v=e.target.dataset.var; document.documentElement.style.setProperty(v,e.target.value);
    localStorage.setItem('customTheme',JSON.stringify({...JSON.parse(localStorage.getItem('customTheme')||'{}'),[v]:e.target.value}));
    updateDynamicTextColors();
  });
});
const savedCustom=JSON.parse(localStorage.getItem('customTheme')||'{}'); for(let v in savedCustom) document.documentElement.style.setProperty(v,savedCustom[v]);

// Dynamic color helpers moved to `js/modules/utils.js` and exposed as
// `window.getLuminance` and `window.updateDynamicTextColors`.

// Initial render (use the functions exposed by modules; guard in case
// a module didn't expose them yet).
if(window.renderBookmarks) window.renderBookmarks();
if(typeof updateDynamicTextColors === 'function') updateDynamicTextColors();

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
// Widgets implementation was moved to `js/modules/widgets.js`.
// The module initializes itself on import and exposes helpers on
// `window` that the top-level script can use.
// Widget logic now lives in `js/modules/widgets.js`. Re-use the
// module's helpers (exposed on `window`) to initialize visibility
// and positions if available.
if(window.loadWidgetVisibility) window.loadWidgetVisibility();
if(window.applyWidgetPositions) window.applyWidgetPositions();

// ---------------- Widget toggles & lock ----------------
// The widgets module owns widget rendering/dragging/position persistence.
// Here we only wire the modal's visibility toggles and the bottom-bar
// lock button to the helpers that the widgets module exposes on `window`.
const todoWidgetToggle = document.getElementById('todoWidgetToggle');
const newsWidgetToggle = document.getElementById('newsWidgetToggle');
const widgetLockToggle = document.getElementById('widgetLockToggle');

if(todoWidgetToggle){
  todoWidgetToggle.addEventListener('change', ()=>{
    if(window.toggleWidgetVisibility) window.toggleWidgetVisibility('todoWidget', todoWidgetToggle.checked);
  });
}

if(newsWidgetToggle){
  newsWidgetToggle.addEventListener('change', ()=>{
    if(window.toggleWidgetVisibility) window.toggleWidgetVisibility('newsWidget', newsWidgetToggle.checked);
  });
}

// Widget lock toggle button (bottom bar)
function updateLockButton(){
  // Update the emoji-only button to reflect the widgets module lock state.
  if(widgetLockToggle){
    const locked = window.isWidgetsLocked ? window.isWidgetsLocked() : false;
    widgetLockToggle.textContent = locked ? '🔒' : '🔓';
    widgetLockToggle.setAttribute('aria-label', locked ? 'Unlock widgets' : 'Lock widgets');
  }
}

if(widgetLockToggle){
  updateLockButton();
  widgetLockToggle.addEventListener('click', ()=>{
    if(window.setWidgetsLocked){
      const newState = !(window.isWidgetsLocked ? window.isWidgetsLocked() : false);
      window.setWidgetsLocked(newState);
      updateLockButton();
    }
  });
}

// Initial lock state is handled by the widgets module.

// Apply saved background and auto-theme using the background module
// if it was successfully imported and initialized.
if(window.applySavedBackground) window.applySavedBackground();
if(window.maybeAutoThemeOnSet) window.maybeAutoThemeOnSet(localStorage.getItem('backgroundURL'));
