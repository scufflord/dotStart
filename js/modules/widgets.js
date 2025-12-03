// widgets.js
// Widgets module: todo + news widgets, draggable/pinnable behavior, lock
// and visibility persistence. Exposes a small compatibility surface on
// `window` so the rest of the app can control widgets without depending
// on internal implementation details.
(
function(){
  // --- Keys for persistence ---
  const TODOS_KEY = 'todos';
  const NEWS_CACHE_KEY = 'newsCache';
  const NEWS_CACHE_EXPIRY = 3600000; // 1 hour
  const WIDGET_POSITIONS_KEY = 'widgetPositions';
  const WIDGET_LOCK_KEY = 'widgetsLocked';
  const WIDGET_VISIBILITY_KEY = 'widgetVisibility';

  // --- DOM refs (may be null in some page variants) ---
  const todoWidget = document.getElementById('todoWidget');
  const newsWidget = document.getElementById('newsWidget');
  const todoInput = document.getElementById('todoInput');
  const todoAdd = document.getElementById('todoAdd') || document.getElementById('todoAdd2');
  const todoList = document.getElementById('todoList');
  const newsFeed = document.getElementById('newsFeed');
  const newsRefresh = document.getElementById('newsRefresh');

  // simple in-memory flag for lock state (persisted to localStorage)
  let _widgetsLocked = localStorage.getItem(WIDGET_LOCK_KEY) === '1' || localStorage.getItem(WIDGET_LOCK_KEY) === 'true';

  // ---------------- Todos ----------------
  function loadTodos(){
    try{ return JSON.parse(localStorage.getItem(TODOS_KEY) || '[]'); }catch(e){ return []; }
  }
  function saveTodos(list){ localStorage.setItem(TODOS_KEY, JSON.stringify(list)); }

  function renderTodos(){
    if(!todoList) return;
    const todos = loadTodos();
    todoList.innerHTML = '';
    todos.forEach((t, i)=>{
      const li = document.createElement('li');
      li.className = 'todo-item' + (t.completed ? ' completed' : '');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.completed;
      cb.setAttribute('aria-label', `Todo: ${t.text}`);
      cb.addEventListener('change', ()=>{ todos[i].completed = cb.checked; saveTodos(todos); renderTodos(); });
      const span = document.createElement('span'); span.textContent = t.text;
      const del = document.createElement('button'); del.type='button'; del.className='todo-item-delete'; del.textContent='×';
      del.addEventListener('click', ()=>{ todos.splice(i,1); saveTodos(todos); renderTodos(); });
      li.appendChild(cb); li.appendChild(span); li.appendChild(del); todoList.appendChild(li);
    });
  }

  function addTodo(text){
    if(!text) return;
    const t = String(text).trim(); if(!t) return;
    const todos = loadTodos(); todos.push({text: t, completed: false}); saveTodos(todos); renderTodos();
    if(todoInput) todoInput.value = '';
  }

  if(todoAdd) todoAdd.addEventListener('click', ()=> addTodo(todoInput?.value || ''));
  if(todoInput) todoInput.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') addTodo(todoInput.value); });

  renderTodos();

  // ---------------- News (RSS) ----------------
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

  async function fetchRSSFeedProxy(url){
    try{
      const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(txt, 'text/xml');
      if(doc.getElementsByTagName('parsererror').length) throw new Error('Parse');
      const items = [];
      const entries = doc.querySelectorAll('item, entry');
      entries.forEach(entry => {
        const title = entry.querySelector('title')?.textContent?.trim() || 'Untitled';
        const linkEl = entry.querySelector('link');
        let link = '';
        if(linkEl){ link = linkEl.getAttribute('href') || linkEl.textContent || ''; }
        const pub = entry.querySelector('pubDate, published')?.textContent;
        const pubTs = pub ? new Date(pub).getTime() : Date.now();
        if(title && link) items.push({title, link: link.trim(), pubDate: pubTs});
      });
      return items;
    }catch(e){ console.warn('RSS fetch failed', e); return []; }
  }

  async function fetchAllNews(){
    if(!newsFeed) return;
    newsFeed.innerHTML = '<div class="news-loading">Loading news...</div>';
    try{
      const cached = localStorage.getItem(NEWS_CACHE_KEY);
      if(cached){
        try{ const parsed = JSON.parse(cached); if(Date.now() - parsed.timestamp < NEWS_CACHE_EXPIRY){ renderNews(parsed.data); return; } }catch(e){}
      }
      const articles = [];
      await Promise.all(RSS_FEEDS.map(f => fetchRSSFeedProxy(f).then(items => articles.push(...items))));
      const seen = new Set();
      const unique = articles.filter(a => { const k = (a.title||'').toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }).sort((a,b)=>b.pubDate - a.pubDate).slice(0,15);
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({data: unique, timestamp: Date.now()}));
      renderNews(unique);
    }catch(e){ console.error('fetchAllNews', e); newsFeed.innerHTML = '<div class="news-error">Unable to load news</div>'; }
  }

  function renderNews(list){
    if(!newsFeed) return;
    if(!list || list.length === 0){ newsFeed.innerHTML = '<div class="news-error">No articles available.</div>'; return; }
    newsFeed.innerHTML = '';
    list.forEach(item => {
      const div = document.createElement('div'); div.className = 'news-item';
      const h = document.createElement('h4'); h.className = 'news-item-title';
      const a = document.createElement('a'); a.href = item.link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = item.title;
      h.appendChild(a);
      const p = document.createElement('p'); p.className = 'news-item-source'; p.textContent = new Date(item.pubDate).toLocaleString();
      div.appendChild(h); div.appendChild(p); newsFeed.appendChild(div);
    });
  }

  if(newsRefresh) newsRefresh.addEventListener('click', ()=>{ localStorage.removeItem(NEWS_CACHE_KEY); fetchAllNews(); });
  fetchAllNews();

  // ---------------- Widget positions & dragging ----------------
  function loadWidgetPositions(){ try{ return JSON.parse(localStorage.getItem(WIDGET_POSITIONS_KEY) || '{}'); }catch(e){ return {}; } }
  function saveWidgetPositions(obj){ try{ localStorage.setItem(WIDGET_POSITIONS_KEY, JSON.stringify(obj)); }catch(e){} }

  function applyWidgetPositions(){
    const pos = loadWidgetPositions();
    Object.keys(pos).forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      const p = pos[id];
      if(p && typeof p.left !== 'undefined' && typeof p.top !== 'undefined'){
        // When restoring stored positions we switch the widget to fixed
        // positioning. To avoid it expanding to fill available space (the
        // CSS rule for fixed widgets removes max-width), capture the
        // element's current width and lock it as an inline width so the
        // widget keeps its intended size after leaving the grid flow.
        try{
          const rect = el.getBoundingClientRect();
          el.style.width = rect.width + 'px';
          el.style.maxWidth = rect.width + 'px';
        }catch(e){}
        el.style.position = 'fixed'; el.style.left = p.left + 'px'; el.style.top = p.top + 'px';
      }
    });
  }

  function makeDraggable(el){
    if(!el) return;
    // Prevent attaching listeners multiple times if makeDraggable is
    // accidentally called more than once for the same element.
    if(el._draggableInitialized) return;
    el._draggableInitialized = true;
    // Prefer the explicit drag handle if present so clicks inside the
    // widget (links, inputs) don't accidentally start a drag.
    const handle = el.querySelector('.widget-drag-handle') || el;
    let dragging = false, offsetX = 0, offsetY = 0;

    function onDown(ev){
      // ev may be a MouseEvent or a Touch-like object (with clientX/clientY)
      if(_widgetsLocked) return;
      // Ignore non-primary pointers to avoid duplicate events for the
      // same gesture (some platforms fire secondary pointers).
      if(ev.isPrimary === false) return;
      if(ev.button !== undefined && ev.button !== 0) return; // only left button
      ev.preventDefault && ev.preventDefault();
      ev.stopPropagation && ev.stopPropagation();
      // remove focus from the handle/button which can cause small layout
      // shifts in some browsers (focus outlines or active styles) and
      // produce a visible 'jump' when we switch to fixed positioning.
      try{ handle.blur && handle.blur(); if(document.activeElement) document.activeElement.blur && document.activeElement.blur(); }catch(e){}
      const rectBefore = el.getBoundingClientRect();
      // Store the initial pointer position and widget position
      el._dragStartX = ev.clientX;
      el._dragStartY = ev.clientY;
      el._dragInitialLeft = rectBefore.left;
      el._dragInitialTop = rectBefore.top;
      // lock the current width
      try{
        el.style.width = rectBefore.width + 'px';
        el.style.maxWidth = rectBefore.width + 'px';
      }catch(e){}
      // Don't change position mode yet - just mark as dragging
      el.classList.add('dragging');
      document.body.classList.add('dragging-widget');
      dragging = true;
    }

    function onMove(ev){
      if(!dragging) return;
      ev.preventDefault && ev.preventDefault();
      // Calculate how far the pointer has moved from the drag start
      const deltaX = ev.clientX - el._dragStartX;
      const deltaY = ev.clientY - el._dragStartY;
      // Use CSS transform to move the widget visually (doesn't change layout)
      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      // Set z-index to bring it above other content while dragging
      el.style.zIndex = '9999';
    }

    function onUp(ev){
      if(!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      document.body.classList.remove('dragging-widget');
      try{
        // Get the current visual position of the widget (with transform applied)
        const rectBefore = el.getBoundingClientRect();
        
        // Switch to position:fixed temporarily to measure the shift
        el.style.position = 'fixed';
        el.style.left = rectBefore.left + 'px';
        el.style.top = rectBefore.top + 'px';
        el.style.margin = '0';
        el.style.transform = '';
        
        // Measure where it actually ended up
        const rectAfter = el.getBoundingClientRect();
        
        // Calculate the shift and compensate
        const shiftX = rectAfter.left - rectBefore.left;
        const shiftY = rectAfter.top - rectBefore.top;
        
        const correctedLeft = rectBefore.left - shiftX;
        const correctedTop = rectBefore.top - shiftY;
        
        el.style.left = correctedLeft + 'px';
        el.style.top = correctedTop + 'px';
        el.style.zIndex = '';
        
        // Save the position
        const positions = loadWidgetPositions();
        positions[el.id] = { left: correctedLeft, top: correctedTop };
        saveWidgetPositions(positions);
      }catch(e){}
    }

    // Prefer Pointer Events when available: they provide a consistent
    // stream (pointerdown/pointermove/pointerup) and support capture so
    // the pointer remains attached to the handle during the drag. This
    // prevents many classes of jumpy behaviour across mouse/touch/stylus.
    if (window.PointerEvent) {
      handle.addEventListener('pointerdown', (e) => {
        onDown(e);
        // Try to capture the pointer on both the handle and the widget
        // element; different browsers sometimes require one or the other.
        try{ handle.setPointerCapture && handle.setPointerCapture(e.pointerId); }catch(_){ }
        try{ el.setPointerCapture && el.setPointerCapture(e.pointerId); }catch(_){ }
        // log briefly for debugging if needed
        try{ console.debug && console.debug('pointerdown', el.id, e.pointerId); }catch(_){ }
      }, {passive:false});
      // also listen for pointerup on the window in case the release
      // occurs outside the handle element — this prevents the "stuck"
      // dragging state when pointerup isn't delivered to the handle.
      window.addEventListener('pointerup', (e)=>{
        onUp(e);
        try{ handle.releasePointerCapture && handle.releasePointerCapture(e.pointerId); }catch(_){ }
        try{ el.releasePointerCapture && el.releasePointerCapture(e.pointerId); }catch(_){ }
      });
      window.addEventListener('pointermove', onMove, {passive:false});
      window.addEventListener('pointercancel', onUp);
    } else {
      // Mouse events fallback
      handle.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      // Touch support: map touch events to the same handlers (use first touch)
      handle.addEventListener('touchstart', (e)=>{ if(e.touches && e.touches[0]) onDown(e.touches[0]); }, {passive:false});
      window.addEventListener('touchmove', (e)=>{ if(e.touches && e.touches[0]) onMove(e.touches[0]); }, {passive:false});
      window.addEventListener('touchend', onUp);
    }
  }

  function setupWidgetDragging(){
    makeDraggable(todoWidget); makeDraggable(newsWidget);
    // The top-level script wires the lock button click; here we only
    // update the button state/aria attributes so both modules agree on
    // the visual state without registering a second click handler.
    const lockBtn = document.getElementById('widgetLockToggle');
    if(lockBtn){
      lockBtn.textContent = isWidgetsLocked() ? '🔒' : '🔓';
      lockBtn.setAttribute('aria-pressed', isWidgetsLocked() ? 'true' : 'false');
    }
  }

  function setWidgetsLocked(v){
    _widgetsLocked = !!v;
    try{ localStorage.setItem(WIDGET_LOCK_KEY, _widgetsLocked ? '1' : '0'); }catch(e){}
    const btn = document.getElementById('widgetLockToggle');
    if(btn){ btn.textContent = _widgetsLocked ? '🔒' : '🔓'; btn.setAttribute('aria-pressed', _widgetsLocked ? 'true' : 'false'); }
    // visual state on widgets
    try{
      const all = document.querySelectorAll('.widget');
      all.forEach(w=>{ if(_widgetsLocked) w.classList.add('locked'); else w.classList.remove('locked'); });
    }catch(e){}
    try{ console.debug && console.debug('setWidgetsLocked ->', _widgetsLocked); }catch(_){}
  }
  function isWidgetsLocked(){ return !!_widgetsLocked; }

  // ---------------- Visibility ----------------
  function toggleWidgetVisibility(widgetId, visible){ const el = document.getElementById(widgetId); if(!el) return; el.style.display = visible ? '' : 'none'; try{ const v = JSON.parse(localStorage.getItem(WIDGET_VISIBILITY_KEY) || '{}'); v[widgetId] = !!visible; localStorage.setItem(WIDGET_VISIBILITY_KEY, JSON.stringify(v)); }catch(e){} }

  function loadWidgetVisibility(){
    try{
      const v = JSON.parse(localStorage.getItem(WIDGET_VISIBILITY_KEY) || '{}');
      const todoVisible = (typeof v.todoWidget === 'undefined') ? true : !!v.todoWidget;
      const newsVisible = (typeof v.newsWidget === 'undefined') ? true : !!v.newsWidget;
      toggleWidgetVisibility('todoWidget', todoVisible);
      toggleWidgetVisibility('newsWidget', newsVisible);
      const t1 = document.getElementById('todoWidgetToggle'); if(t1) t1.checked = todoVisible;
      const t2 = document.getElementById('newsWidgetToggle'); if(t2) t2.checked = newsVisible;
    }catch(e){}
  }

  // ----------------- Initialization & Exports -----------------
  applyWidgetPositions(); setupWidgetDragging(); loadWidgetVisibility();

  // Expose small API for the rest of the app
  window.setWidgetsLocked = setWidgetsLocked;
  window.isWidgetsLocked = isWidgetsLocked;
  window.toggleWidgetVisibility = toggleWidgetVisibility;
  window.loadWidgetVisibility = loadWidgetVisibility;
  window.applyWidgetPositions = applyWidgetPositions;
  window.initWidgets = function(){ applyWidgetPositions(); setupWidgetDragging(); loadWidgetVisibility(); };

})();

