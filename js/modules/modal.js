// ------------------ Modal module ------------------
// Responsibilities:
// - Manage opening/closing the configuration modal (ARIA state + focus)
// - Provide a small focus-trap helper so Tab/Shift+Tab stay within the modal
// - Wire the floating close button and react to modal body scroll
// - Expose a minimal compatibility surface on `window` for the rest of the app
(function(){
  const configModal = document.getElementById('configModal');
  const configButton = document.getElementById('configButton');
  const closeConfig = document.getElementById('closeConfig'); // optional older close button
  const modalCloseFloat = document.getElementById('modalCloseFloat');

  /**
   * _getFocusable(container) -> Element[]
   * Returns a list of focusable elements within `container` in DOM order.
   */
  function _getFocusable(container){
    if(!container) return [];
    const sel = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex], [contenteditable]';
    return Array.from(container.querySelectorAll(sel)).filter(el=>el.tabIndex !== -1 && isVisible(el));
  }

  // Basic visibility check used to filter hidden or display:none elements
  function isVisible(el){
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  /**
   * Show the modal and move focus into it.
   * Delegates keyboard handling to the global `_handleKeydown` so the app
   * keeps one place that handles Escape/Tab trapping.
   */
  function openConfigModal(){
    if(!configModal) return;
    configModal.classList.add('show');
    configModal.setAttribute('aria-hidden', 'false');
    if(configButton) configButton.setAttribute('aria-expanded','true');
    const focusables = _getFocusable(configModal);
    if(focusables.length) focusables[0].focus();
    if(window && typeof window._handleKeydown === 'function') document.addEventListener('keydown', window._handleKeydown);
  }

  /**
   * Hide the modal and restore ARIA state. Returns focus to the opener.
   */
  function closeConfigModal(){
    if(!configModal) return;
    configModal.classList.remove('show');
    configModal.setAttribute('aria-hidden', 'true');
    if(configButton) configButton.setAttribute('aria-expanded','false');
    if(configButton) configButton.focus();
    if(window && typeof window._handleKeydown === 'function') document.removeEventListener('keydown', window._handleKeydown);
  }

  // Wire click handlers (defensive guards in case elements are missing)
  if(configButton) configButton.addEventListener('click', ()=>{ openConfigModal(); });
  if(closeConfig) closeConfig.addEventListener('click', ()=>{ closeConfigModal(); });
  if(modalCloseFloat) modalCloseFloat.addEventListener('click', ()=>{ closeConfigModal(); });

  // Move/animate floating close when modal content scrolls for better affordance
  const modalBody = document.querySelector('#configModal .modal-body');
  function _onModalBodyScroll(){
    try{
      if(!modalBody || !modalCloseFloat) return;
      const st = modalBody.scrollTop || 0;
      if(st > 30) modalCloseFloat.classList.add('scrolled');
      else modalCloseFloat.classList.remove('scrolled');
    }catch(e){ /* defensive */ }
  }
  if(modalBody){ modalBody.addEventListener('scroll', _onModalBodyScroll); }

  // Compatibility surface for legacy code while migrating to modules
  window.configModal = configModal;
  window.configButton = configButton;
  window.closeConfig = closeConfig;
  window.modalCloseFloat = modalCloseFloat;
  window.openConfigModal = openConfigModal;
  window.closeConfigModal = closeConfigModal;
  window._getFocusable = _getFocusable;

})();
