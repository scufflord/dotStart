// background.js
// Handles background application, gallery rendering, uploaded image storage
// (IndexedDB), and optional auto-theming derived from the selected image.
(function(){
  const STORAGE_KEY = 'backgroundURL';
  const AUTO_THEME_KEY = 'autoThemeEnabled';
  const IDB_NAME = 'startpage-images';
  const IDB_STORE = 'images';

  // DOM refs (may be absent during tests or if HTML changed)
  const bgInput = document.getElementById('bgInput');
  const saveBg = document.getElementById('saveBg');
  const bgGallery = document.getElementById('bgGallery');
  const bgUpload = document.getElementById('bgUpload');
  const clearBgBtn = document.getElementById('clearBackground');
  const autoThemeToggle = document.getElementById('autoThemeToggle');

  // curated sample backgrounds
  const curatedBackgrounds = [
    'https://picsum.photos/id/1015/1600/1000',
    'https://picsum.photos/id/1016/1600/1000',
    'https://picsum.photos/id/1025/1600/1000',
    'https://picsum.photos/id/1035/1600/1000',
    'https://picsum.photos/id/1043/1600/1000'
  ];

  // internal object URL for currently-applied DB blob (so we can revoke)
  let _currentObjectUrl = null;

  // ---------------- IndexedDB helpers ----------------
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

  async function deleteImage(id){
    const db = await initDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const r = store.delete(Number(id));
      r.onsuccess = ()=>resolve(); r.onerror = (e)=>reject(e.target.error);
    });
  }

  // initialize DB early (best-effort)
  try{ initDB().catch(()=>{}); }catch(e){}

  // ---------------- Apply background ----------------
  async function applySavedBackground(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if(!saved){ document.body.style.backgroundImage=''; return; }
    if(saved.startsWith('db:')){
      const id = saved.split(':')[1];
      // ------------------ Background & gallery module ------------------
      (function(){
        const DB_NAME = 'startpage_bg_db';
        const STORE = 'images';

        function openDb(){
          return new Promise((resolve, reject)=>{
            const r = indexedDB.open(DB_NAME, 1);
            r.onupgradeneeded = ()=>{ r.result.createObjectStore(STORE, {keyPath:'id', autoIncrement:true}); };
            r.onsuccess = ()=> resolve(r.result);
            r.onerror = ()=> reject(r.error);
          });
        }

        // addImage - store a Blob (image) in IndexedDB and return its generated id
        async function addImage(blob){
          const db = await openDb(); const tx = db.transaction(STORE, 'readwrite'); const st = tx.objectStore(STORE);
          const p = new Promise((res,rej)=>{ const req = st.add({blob}); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
          await tx.complete; return p;
        }

        // getAllImages - return array of objects {id, blob}
        async function getAllImages(){
          const db = await openDb(); const tx = db.transaction(STORE, 'readonly'); const st = tx.objectStore(STORE);
          return new Promise((res,rej)=>{ const r = st.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
        }

        // applyBackgroundFromUrl - apply CSS background-image and attempt to derive
        // a readable foreground color based on the image by calling the shared
        // updateDynamicTextColors helper.
        function applyBackgroundFromUrl(url){
          try{
            document.body.style.backgroundImage = `url(${url})`;
            if(window.updateDynamicTextColors) window.updateDynamicTextColors();
          }catch(e){ console.warn('Failed to apply background', e); }
        }

        window.addImage = addImage; window.getAllImages = getAllImages; window.applyBackgroundFromUrl = applyBackgroundFromUrl;
      })();

    // If the saved reference is a DB reference, try to load the blob and apply
    try{
      const blob = await getImage(Number(id));
      if(blob){ if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; } _currentObjectUrl = URL.createObjectURL(blob); document.body.style.backgroundImage = `url('${_currentObjectUrl}')`; }
      return;
    }catch(e){ console.warn('Failed to load background blob', e); return; }
  }
  // otherwise it's a plain URL
  try{ document.body.style.backgroundImage = `url('${saved}')`; }catch(e){ document.body.style.backgroundImage = ''; }
}

// renderGallery - build the background gallery UI including uploaded
// images (from IndexedDB) and a curated list of remote backgrounds.
async function renderGallery(){
  if(!bgGallery) return;
  bgGallery.innerHTML = '';
  const current = localStorage.getItem(STORAGE_KEY);

  // uploaded images
  try{
    const images = await getAllImages();
    for(const item of images){
      const thumb = document.createElement('button'); thumb.type='button'; thumb.className='bg-thumb';
      const img = document.createElement('img');
      const url = URL.createObjectURL(item.blob);
      img.src = url; img.alt = item.name || 'Uploaded background'; thumb.appendChild(img);

      const actions = document.createElement('div'); actions.className = 'bg-actions';
      const deleteBtn = document.createElement('button'); deleteBtn.type='button'; deleteBtn.className='bg-delete'; deleteBtn.textContent='Delete';
      actions.appendChild(deleteBtn); thumb.appendChild(actions);

      if(current && current === `db:${item.id}`) thumb.classList.add('selected');

      thumb.addEventListener('click', (e)=>{
        if(e.target === deleteBtn) return;
        if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; }
        _currentObjectUrl = url;
        document.body.style.backgroundImage = `url('${url}')`;
        localStorage.setItem(STORAGE_KEY, `db:${item.id}`);
        try{ window.updateDynamicTextColors(); }catch(e){}
        maybeAutoThemeOnSet(`db:${item.id}`);
        document.querySelectorAll('.bg-thumb').forEach(t=>t.classList.remove('selected'));
        thumb.classList.add('selected');
      });

      deleteBtn.addEventListener('click', async (ev)=>{
        ev.stopPropagation();
        try{
          const wasSelected = (localStorage.getItem(STORAGE_KEY) === `db:${item.id}`);
          await deleteImage(item.id);
          if(wasSelected){ localStorage.removeItem(STORAGE_KEY); if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; } document.body.style.backgroundImage=''; }
          renderGallery(); try{ window.updateDynamicTextColors(); }catch(e){}
          if(window.showToast){
            // offer an undo by re-adding the blob
            window.showToast('Background deleted', async ()=>{
              try{ const newId = await addImage(item.blob, item.name || 'Uploaded image'); if(wasSelected){ localStorage.setItem(STORAGE_KEY, `db:${newId}`); await applySavedBackground(); if(window.maybeAutoThemeOnSet) window.maybeAutoThemeOnSet(`db:${newId}`); } renderGallery(); try{ window.updateDynamicTextColors(); }catch(e){} }catch(err){ console.error('Undo failed', err); }
            });
          }
        }catch(err){ alert('Failed to delete image'); }
      });

      bgGallery.appendChild(thumb);
    }
  }catch(err){ console.warn('Could not load uploaded backgrounds', err); }

  // curated backgrounds
  curatedBackgrounds.forEach(url=>{
    const thumb = document.createElement('button'); thumb.type='button'; thumb.className='bg-thumb';
    const img = document.createElement('img'); img.src = url; img.alt = 'Background option'; thumb.appendChild(img);
    if(current && current === url) thumb.classList.add('selected');
    thumb.addEventListener('click', ()=>{
      if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; }
      document.body.style.backgroundImage = `url('${url}')`;
      localStorage.setItem(STORAGE_KEY, url);
      try{ window.updateDynamicTextColors(); }catch(e){}
      maybeAutoThemeOnSet(url);
      document.querySelectorAll('.bg-thumb').forEach(t=>t.classList.remove('selected'));
      thumb.classList.add('selected');
    });
    bgGallery.appendChild(thumb);
  });
}

  // ---------------- Auto-theming ----------------
  function isAutoThemeEnabled(){ return localStorage.getItem(AUTO_THEME_KEY) === '1'; }

  if(autoThemeToggle){
    autoThemeToggle.checked = isAutoThemeEnabled();
    autoThemeToggle.addEventListener('change', ()=>{
      localStorage.setItem(AUTO_THEME_KEY, autoThemeToggle.checked ? '1' : '0');
      if(autoThemeToggle.checked){ const current = localStorage.getItem(STORAGE_KEY); if(current) applyThemeFromBackgroundRef(current); }
    });
  }

  async function applyThemeFromBackgroundRef(ref){
    if(!isAutoThemeEnabled()) return;
    try{
      if(!ref) return;
      if(ref.startsWith('db:')){
        const id = ref.split(':')[1]; const blob = await getImage(id); if(!blob) return; const obj = URL.createObjectURL(blob); await applyThemeFromImage(obj, true); URL.revokeObjectURL(obj);
      } else { await applyThemeFromImage(ref, true); }
    }catch(err){ console.warn('Auto-theme failed', err); }
  }

  async function applyThemeFromImage(src, force=false){
    if(!isAutoThemeEnabled() && !force) return;
    return new Promise((resolve)=>{
      const img = new Image(); img.crossOrigin = 'Anonymous';
      img.onload = function(){
        try{
          const w = Math.min(200, img.naturalWidth); const h = Math.min(200, img.naturalHeight);
          const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
          let data;
          try{ data = ctx.getImageData(0,0,w,h).data; }catch(e){ console.warn('CORS or tainted canvas, cannot extract colors'); resolve(); return; }
          const counts = new Map();
          for(let i=0;i<data.length;i+=4){ const r = data[i]>>4; const g = data[i+1]>>4; const b = data[i+2]>>4; const a = data[i+3]; if(a < 125) continue; const key = (r<<8) | (g<<4) | b; counts.set(key, (counts.get(key)||0)+1); }
          const entries = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]); if(entries.length===0){ resolve(); return; }
          const toRgb = (key)=>{ const r = (key>>8)&0xF; const g = (key>>4)&0xF; const b = key&0xF; return [ (r<<4)|(r), (g<<4)|(g), (b<<4)|(b) ]; };
          const top = entries.slice(0,6).map(e=>toRgb(e[0])); const primary = top[0]; const lum = window.getLuminance ? window.getLuminance(primary[0], primary[1], primary[2]) : 0.5; const fg = lum > 0.5 ? '#111111' : '#ffffff';
          const saturations = top.map(rgb=>{ const max=Math.max(...rgb); const min=Math.min(...rgb); return (max===0?0:(max-min)/max); }); let accIdx = saturations.indexOf(Math.max(...saturations)); if(accIdx<0) accIdx=1<top.length?1:0; const accentRgb = top[accIdx] || top[0]; const accent = `rgb(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]})`;
          const secondaryRgb = primary.map(v=> Math.round(v*0.7 + 40)); const secondary = `rgb(${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]})`;

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
          try{ window.updateDynamicTextColors(); }catch(e){}
          resolve();
        }catch(err){ console.error('Palette extraction error', err); resolve(); }
      };
      img.onerror = function(){ console.warn('Image failed to load for theming', src); resolve(); };
      img.src = src;
    });
  }

  function maybeAutoThemeOnSet(ref){ if(isAutoThemeEnabled()){ applyThemeFromBackgroundRef(ref); } }

  // ---------------- DOM wiring ----------------
  // Save background by URL
  if(saveBg){ saveBg.addEventListener('click', ()=>{
    const urlRaw = bgInput?.value?.trim();
    if(!urlRaw){ document.body.style.backgroundImage=''; localStorage.removeItem(STORAGE_KEY); try{ window.updateDynamicTextColors(); }catch(e){} return; }
    const normalized = window.normalizeUrl ? window.normalizeUrl(urlRaw) : urlRaw;
    if(!normalized){ alert('Background URL appears invalid. Please provide a valid URL.'); return; }
    document.body.style.backgroundImage = `url('${normalized}')`; localStorage.setItem(STORAGE_KEY, normalized); try{ window.updateDynamicTextColors(); }catch(e){} maybeAutoThemeOnSet(normalized); renderGallery();
  }); }

  if(bgUpload){
    bgUpload.addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0]; if(!file) return; if(!file.type.startsWith('image/')){ alert('Please upload an image file.'); return; }
      try{
        const id = await addImage(file, file.name || 'Uploaded image');
        localStorage.setItem(STORAGE_KEY, `db:${id}`);
        const blob = await getImage(id); const objUrl = URL.createObjectURL(blob);
        document.body.style.backgroundImage = `url('${objUrl}')`; try{ window.updateDynamicTextColors(); }catch(e){}
        maybeAutoThemeOnSet(`db:${id}`);
        renderGallery();
      }catch(err){ console.error(err); alert('Unable to save uploaded image.'); }
    });
  }

  if(clearBgBtn){
    clearBgBtn.addEventListener('click', ()=>{
      document.body.style.backgroundImage = '';
      localStorage.removeItem(STORAGE_KEY);
      if(_currentObjectUrl){ URL.revokeObjectURL(_currentObjectUrl); _currentObjectUrl = null; }
      try{ window.updateDynamicTextColors(); }catch(e){}
      if(bgUpload) bgUpload.value = '';
      document.querySelectorAll('.bg-thumb').forEach(t=>t.classList.remove('selected'));
    });
  }

  // expose selected helpers for backwards compatibility
  window.applySavedBackground = applySavedBackground;
  window.renderGallery = renderGallery;
  window.addImage = addImage;
  window.getImage = getImage;
  window.getAllImages = getAllImages;
  window.deleteImage = deleteImage;
  window.applyThemeFromBackgroundRef = applyThemeFromBackgroundRef;
  window.isAutoThemeEnabled = isAutoThemeEnabled;
  window.maybeAutoThemeOnSet = maybeAutoThemeOnSet;

  // initialize gallery on import
  try{ renderGallery(); }catch(e){}
})();
