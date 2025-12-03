// ------------------ Import/Export module ------------------
// Responsibilities:
// - Export selected application settings to a JSON file
// - Import settings from a user-provided JSON file and apply them
// - Provide a compatibility surface (`window.exportSettings`, etc.) so
//   the rest of the app can trigger import/export actions.
(function(){
  // Keys we will serialize from localStorage (if present). Keep this list
  // slim to avoid exporting large caches or ephemeral values.
  const EXPORT_KEYS = ['selectedTheme','customTheme','backgroundURL','greetings','weatherLocation','autoThemeEnabled','derivedTheme'];

  /**
   * exportSettings()
   * - Collects `bookmarks` and the listed keys from localStorage into a
   *   JSON object and triggers a download of a `.json` file.
   */
  function exportSettings(){
    try{
      const out = {};
      try{ out.bookmarks = window.bookmarks || JSON.parse(localStorage.getItem('bookmarks')||'[]'); }catch(e){ out.bookmarks = []; }
      EXPORT_KEYS.forEach(k=>{ try{ const v = localStorage.getItem(k); if(v !== null) out[k] = JSON.parse(v); }catch(e){} });
      const json = JSON.stringify(out, null, 2);
      const blob = new Blob([json], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `startpage-export-${(new Date()).toISOString().slice(0,10)}.json`; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      if(window.showToast) window.showToast('Export downloaded');
    }catch(err){ console.error(err); alert('Export failed'); }
  }

  /**
   * applyImportedSettings(obj)
   * - Apply a parsed settings object into localStorage and update the UI
   *   where possible (bookmarks, theme vars, etc.). This function is
   *   defensive and tolerates partial/invalid payloads.
   */
  function applyImportedSettings(obj){
    try{
      if(!obj || typeof obj !== 'object') return;
      // Bookmarks: overwrite and attempt to re-render the UI
      if(Array.isArray(obj.bookmarks)){
        try{ localStorage.setItem('bookmarks', JSON.stringify(obj.bookmarks)); }catch(e){}
        try{ window.bookmarks = obj.bookmarks; }catch(e){}
        try{ if(window.renderBookmarks) window.renderBookmarks(); }catch(e){}
        try{ if(window.renderEditor) window.renderEditor(); }catch(e){}
      }

      // Persist other keys from EXPORT_KEYS and apply any theme variables
      EXPORT_KEYS.forEach(k=>{
        if(typeof obj[k] !== 'undefined'){
          try{ localStorage.setItem(k, JSON.stringify(obj[k])); }catch(e){}
          // apply theme vars immediately if present so the UI updates without reload
          if(k === 'customTheme' && obj[k] && typeof obj[k] === 'object'){
            try{ for(const v in obj[k]) document.documentElement.style.setProperty(v, obj[k][v]); }catch(e){}
          }
          if(k === 'derivedTheme' && obj[k] && typeof obj[k] === 'object'){
            try{ for(const v in obj[k]) document.documentElement.style.setProperty(v, obj[k][v]); }catch(e){}
          }
        }
      });

      if(window.showToast) window.showToast('Settings imported');
    }catch(err){ console.error('applyImportedSettings', err); }
  }

  /**
   * importFromFile(file)
   * - Reads a user-chosen file (expects JSON) and attempts to apply it.
   * - On success the page reloads after a short delay so all modules pick up
   *   their new persisted state. This avoids trying to update every module
   *   in place.
   */
  function importFromFile(file){
    if(!file) return; const reader = new FileReader();
    reader.onload = function(ev){
      try{
        const obj = JSON.parse(ev.target.result);
        applyImportedSettings(obj);
        // small delay to allow UI to apply then reload to ensure all modules pick up new state
        setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 700);
      }catch(e){ alert('Invalid JSON file'); }
    };
    reader.onerror = function(){ alert('Failed to read file'); };
    reader.readAsText(file);
  }

  // Wire DOM controls if present (defensive)
  try{
    const exportBtn = document.getElementById('exportSettings'); if(exportBtn) exportBtn.addEventListener('click', ()=>{ exportSettings(); });
    const importFile = document.getElementById('importFile'); if(importFile) importFile.addEventListener('change', (e)=>{ const f = e.target.files && e.target.files[0]; if(f) importFromFile(f); });
  }catch(e){}

  // expose for compatibility
  window.exportSettings = exportSettings;
  window.importFromFile = importFromFile;
  window.applyImportedSettings = applyImportedSettings;

})();
