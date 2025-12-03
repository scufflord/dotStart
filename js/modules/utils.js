// utils.js
// Shared helper utilities used across the Startpage app.
//
// Purpose
// - Provide small, well-documented utilities that are used by multiple
//   modules (toasts, URL normalization, favicon loading, color helpers).
// - During the incremental refactor these helpers are exposed on
//   `window` so older code and HTML that expect globals still work.
//
// Design notes
// - Keep these helpers pure where possible and only touch the DOM when
//   explicitly required (e.g., `showToast` writes into the toast node).
// - Favor safety: many helpers use try/catch and perform graceful no-ops
//   if DOM nodes are missing (useful when tests or partial HTML are used).
// - Exported names: `showToast`, `normalizeUrl`, `tryLoadFavicon`,
//   `getLuminance`, `updateDynamicTextColors` (attached to `window`).


// ------------------ Toast (non-blocking notifications) ------------------
// The toast markup exists in `index.html` with ids: `toast`, `toastMsg`,
// and `toastUndo`. This helper provides a small, debounced toast UI with
// an optional undo callback. It's intentionally minimal — other modules
// call `showToast(message, undoCallback, timeout)` to provide feedback.
(function(){
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastUndo = document.getElementById('toastUndo');
  let _toastTimer = null;

  /**
   * showToast - display a temporary toast message with optional undo
   *
   * @param {string} message - Text to show inside the toast
   * @param {Function|null} undoCallback - Optional callback invoked if the user clicks "Undo"
   * @param {number} timeout - Milliseconds before the toast auto-hides (default 6000)
   *
   * Behavior: no-op if toast elements are not present (safe for partial DOMs).
   */
  function showToast(message, undoCallback, timeout=6000){
    if(!toast || !toastMsg || !toastUndo) return;
    try{
      toastMsg.textContent = String(message || '');
      toast.classList.add('show');
      if(_toastTimer) clearTimeout(_toastTimer);
      const clear = ()=>{ toast.classList.remove('show'); if(_toastTimer){ clearTimeout(_toastTimer); _toastTimer = null; } };
      _toastTimer = setTimeout(()=>{ clear(); }, Number(timeout) || 6000);
      function onUndo(){
        try{ if(typeof undoCallback === 'function') undoCallback(); }catch(e){}
        clear();
        try{ toastUndo.removeEventListener('click', onUndo); }catch(e){}
      }
      toastUndo.addEventListener('click', onUndo, {once:true});
    }catch(e){ /* swallow to avoid breaking callers */ }
  }

  // Expose globally for backwards compatibility (other modules rely on it)
  window.showToast = showToast;
})();

// ------------------ URL helpers & favicons ------------------
// ------------------ URL helpers & favicons ------------------
(function(){
  /**
   * normalizeUrl - take a user-provided string and produce a reasonable
   * URL string or return null if the input looks invalid.
   *
   * Rules:
   * - If the string already contains a scheme (http:, https:, mailto:, data:, etc.)
   *   it is returned as-is.
   * - Protocol-relative URLs (`//example.com`) are rewritten to `https:`.
   * - Strings without a scheme must contain a dot and no spaces to be
   *   considered a hostname; otherwise `null` is returned.
   * - Returns a string suitable for assigning to `href` or `src`.
   */
  function normalizeUrl(input){
    if(!input) return null;
    let s = String(input).trim();
    if(!s) return null;
    if(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s; // has scheme
    if(s.startsWith('//')) return 'https:' + s; // protocol-relative -> https
    if(s.includes(' ') || s.indexOf('.') === -1) return null; // basic sanity
    return 'https://' + s;
  }

  /**
   * tryLoadFavicon - attempts to populate an <img> element with a favicon
   * for a given page URL. Uses a fallback chain to improve chance of success.
   *
   * @param {HTMLImageElement} imgEl - target image element
   * @param {string} pageUrl - page URL to derive the favicon host from
   * Side effects: sets `imgEl.src` and installs `onerror` fallbacks.
   */
  function tryLoadFavicon(imgEl, pageUrl){
    if(!imgEl) return;
    try{
      const u = new URL(pageUrl);
      const host = u.hostname.replace(/^www\./i,'');
      const ddg = `https://icons.duckduckgo.com/ip3/${host}.ico`;
      const google = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
      const svgFallback = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='100%' height='100%' fill='%23${(hashCode(host)%0xFFFFFF).toString(16).padStart(6,'0')}'/><text x='50%' y='50%' font-size='20' font-family='Arial, sans-serif' fill='%23fff' dominant-baseline='middle' text-anchor='middle'>${(host[0]||'').toUpperCase()}</text></svg>`)}`;
      imgEl.src = ddg;
      imgEl.onerror = ()=>{ imgEl.onerror = null; imgEl.src = google; imgEl.onerror = ()=>{ imgEl.onerror = null; imgEl.src = svgFallback; }; };
    }catch(e){
      // If URL parsing fails, set a neutral placeholder SVG data URI
      try{ imgEl.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='100%' height='100%' fill='%23888'/></svg>`); }catch(err){}
    }
  }

  // small deterministic hash for color generation (used by SVG fallback)
  function hashCode(str){
    let h = 0; for(let i=0;i<str.length;i++){ h = Math.imul(31, h) + str.charCodeAt(i) | 0; } return Math.abs(h);
  }

  // Expose helpers for legacy callers
  window.normalizeUrl = normalizeUrl;
  window.tryLoadFavicon = tryLoadFavicon;
})();

// ------------------ Color utilities & dynamic text color ------------------
// ------------------ Color utilities & dynamic text color ------------------
(function(){
  /**
   * getLuminance - compute relative luminance from RGB (0..255)
   * Implementation follows the WCAG recommendation for relative luminance
   * which is useful to decide readable foreground color on top of a
   * given background.
   */
  function getLuminance(r,g,b){
    const a=[r,g,b].map(v=>{ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
  }

  /**
   * updateDynamicTextColors - attempt to pick a readable `--fg` value based
   * on the current page background. It prefers the translucent container's
   * background when a background image is present (so text overlaid on the
   * container remains readable). The function mutates CSS custom properties
   * and also applies the color inline to bookmark tiles for immediate effect.
   */
  function updateDynamicTextColors(){
    try{
      let bgColor = getComputedStyle(document.body).backgroundColor || '';
      if(document.body.style.backgroundImage && document.body.style.backgroundImage!=='none'){
        const tc = document.querySelector('.translucent-container');
        if(tc) bgColor = getComputedStyle(tc).backgroundColor || bgColor;
      }
      const rgb = (bgColor.match(/\d+/g)?.map(Number)) || [40,40,40];
      const lum = getLuminance(rgb[0], rgb[1], rgb[2]);
      const color = lum>0.5 ? '#1a1a1a' : '#ebdbb2';
      try{ document.documentElement.style.setProperty('--fg', color); }catch(e){}
      document.querySelectorAll('.bm').forEach(b=>{ b.style.color = 'var(--fg)'; });
    }catch(e){ /* defensive: do not throw from utility */ }
  }

  // Expose color helpers on window for other modules to use
  window.getLuminance = getLuminance;
  window.updateDynamicTextColors = updateDynamicTextColors;
})();
