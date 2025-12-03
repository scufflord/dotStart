// bookmarks.js
// Handles bookmark rendering, editor UI in the Config modal, drag/reorder
// operations, favicon loading, and persistence to localStorage.

(function(){
  const STORAGE_KEY = 'bookmarks';
  const bookmarksGrid = document.querySelector('.bookmarks-grid');
  const bookmarkEditor = document.getElementById('bookmarkEditor');
  const previewGrid = document.getElementById('previewGrid');
  const addBookmarkBtn = document.getElementById('addBookmark');
  const saveBookmarksBtn = document.getElementById('saveBookmarks');

  // Sensible defaults shown on first run so the grid isn't empty.
  const DEFAULT_BOOKMARKS = [
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { name: 'MDN', url: 'https://developer.mozilla.org' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { name: 'News', url: 'https://news.ycombinator.com' }
  ];

  // Load bookmarks from storage or return defaults on first run.
  function loadBookmarks(){
    try{
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if(!stored || !Array.isArray(stored) || stored.length === 0) return DEFAULT_BOOKMARKS.slice();
      return stored;
    }catch(e){ return DEFAULT_BOOKMARKS.slice(); }
  }
  let bookmarks = loadBookmarks();

  // Expose bookmarks to global scope for hotkeys and export
  window.bookmarks = bookmarks;

  // ------------------ Bookmarks module ------------------
  // Renders the main bookmarks grid (clickable tiles)
  function renderBookmarks(){
    const bookmarks = loadBookmarks(); if(!bookmarksGrid) return;
    bookmarksGrid.innerHTML = '';
    bookmarks.forEach(b => {
      const a = document.createElement('a');
      a.href = b.url; a.className = 'bm'; a.setAttribute('target', '_blank'); 
      a.setAttribute('rel', 'noopener noreferrer'); // Added rel attribute for security
      const img = document.createElement('img');
      // tryLoadFavicon is provided by utils module
      if(window.tryLoadFavicon) window.tryLoadFavicon(img, b.url);
      img.alt = b.name || '';
      a.appendChild(img);
      a.appendChild(document.createTextNode(b.name || ''));
      bookmarksGrid.appendChild(a);
    });
    // Update global bookmarks reference
    window.bookmarks = bookmarks;
  }

  // Renders the editor rows inside the Config modal
  function renderEditor(){
    if(!bookmarkEditor) return;
    bookmarkEditor.innerHTML = '';
    bookmarks.forEach((b,i)=>{
      const row = document.createElement('div'); row.className = 'bookmark-row'; row.draggable = true; row.dataset.index = String(i);
      const handle = document.createElement('span'); handle.className = 'drag-handle'; handle.setAttribute('aria-hidden','true'); handle.textContent = '≡';
      row.appendChild(handle);

      const nameInput = document.createElement('input'); nameInput.type='text'; nameInput.value=b.name||''; nameInput.placeholder='Name'; nameInput.className='edit-name'; nameInput.dataset.index = i;
      const urlInput = document.createElement('input'); urlInput.type='text'; urlInput.value=b.url||''; urlInput.placeholder='URL'; urlInput.className='edit-url'; urlInput.dataset.index = i;

      const select = document.createElement('select'); select.dataset.index = i; select.className='positionSelect';
      for(let idx=0; idx<bookmarks.length; idx++){ const opt = document.createElement('option'); opt.value = String(idx); opt.textContent = String(idx+1); if(idx===i) opt.selected=true; select.appendChild(opt); }

      const del = document.createElement('button'); del.dataset.index = i; del.className = 'deleteBookmark'; del.type='button'; del.textContent='Delete';
      row.appendChild(nameInput); row.appendChild(urlInput); row.appendChild(select); row.appendChild(del);

      // Drag handlers (simple)
      row.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; row.classList.add('dragging'); });
      row.addEventListener('dragend', ()=>{ row.classList.remove('dragging'); document.querySelectorAll('.bookmark-row').forEach(r=>r.classList.remove('drag-over')); });
      row.addEventListener('dragover', e=>{ e.preventDefault(); row.classList.add('drag-over'); e.dataTransfer.dropEffect='move'; });
      row.addEventListener('dragleave', ()=>{ row.classList.remove('drag-over'); });
      row.addEventListener('drop', e=>{ e.preventDefault(); row.classList.remove('drag-over'); const from = Number(e.dataTransfer.getData('text/plain')); const to = Number(row.dataset.index); if(Number.isFinite(from) && from!==to){ reorderBookmarks(from,to); } });

      bookmarkEditor.appendChild(row);
    });
    renderPreview();
  }

  function reorderBookmarks(from,to){
    if(from<0||to<0||from===to) return;
    const item = bookmarks.splice(from,1)[0];
    bookmarks.splice(to,0,item);
    persistBookmarks(); renderEditor(); renderBookmarks();
  }

  function renderPreview(){
    if(!previewGrid) return;
    previewGrid.innerHTML = '';
    bookmarks.forEach(b=>{
      const a = document.createElement('div'); a.className='bm';
      const img = document.createElement('img'); if(window.tryLoadFavicon) window.tryLoadFavicon(img, b.url);
      img.alt = b.name || '';
      a.appendChild(img); a.appendChild(document.createTextNode(b.name || ''));
      previewGrid.appendChild(a);
    });
  }

  function persistBookmarks(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    window.bookmarks = bookmarks;
  }

  // Wire up editor buttons if present (these elements are in index.html)
  if(addBookmarkBtn){ addBookmarkBtn.addEventListener('click', ()=>{ bookmarks.push({name:'New', url:'https://'}); renderEditor(); }); }
  if(saveBookmarksBtn){ saveBookmarksBtn.addEventListener('click', ()=>{
    const names = document.querySelectorAll('.edit-name');
    const urls = document.querySelectorAll('.edit-url');
    const positions = document.querySelectorAll('.positionSelect');
    const newArr = Array.from({length:bookmarks.length}, ()=>null);
    const invalids = [];
    for(let i=0;i<bookmarks.length;i++){
      const rawName = names[i].value.trim();
      const rawUrl = urls[i].value.trim();
      const normalized = window.normalizeUrl ? window.normalizeUrl(rawUrl) : rawUrl;
      if(rawUrl && !normalized) invalids.push(i+1);
      const b = {name: rawName || `Bookmark ${i+1}`, url: normalized || ''}; const pos = parseInt(positions[i].value);
      newArr[pos] = b;
    }
    if(invalids.length){ alert('Invalid URL for bookmark positions: ' + invalids.join(', ') + '. Please fix before saving.'); return; }
    bookmarks = newArr.filter(Boolean);
    persistBookmarks(); renderBookmarks(); renderEditor();
  }); }

  if(bookmarkEditor){
    bookmarkEditor.addEventListener('click', e=>{
      if(e.target.classList.contains('deleteBookmark')){ bookmarks.splice(e.target.dataset.index,1); persistBookmarks(); renderEditor(); }
    });
    bookmarkEditor.addEventListener('change', e=>{ if(e.target.classList.contains('positionSelect')) renderPreview(); });
  }

  // Initial render
  renderBookmarks(); renderEditor();

  // debug visibility
  try{ console.debug('bookmarks module loaded, items:', bookmarks); }catch(e){}

  // expose for debugging / hotkeys
  window.renderBookmarks = renderBookmarks;
  window.renderEditor = renderEditor;
  window.reorderBookmarks = reorderBookmarks;
  window.bookmarks = bookmarks;
})();