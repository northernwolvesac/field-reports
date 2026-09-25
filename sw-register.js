/**
 * sw-register.js — Auto-updating Service Worker registration
 *
 * When a new SW version is deployed:
 * 1. The open page checks for a new sw.js every 10 seconds
 * 2. New SW installs (skipWaiting activates it immediately)
 * 3. controllerchange fires →
 *      - nothing typed on this page yet → page reloads with the new version (as before)
 *      - the user has typed / picked files on this page → NO reload; a banner offers
 *        "Update" so nobody loses a half-filled form. Leaving the page loads the new version anyway.
 */
(function() {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  var refreshing = false;
  var userEdited = false;   // true once the user types, picks an option or attaches a file on this page

  function markEdited(e) {
    if (!e.isTrusted) return;   // ignore values set by scripts (auto-fill from the database, drafts…)
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) userEdited = true;
  }
  document.addEventListener('input', markEdited, true);
  document.addEventListener('change', markEdited, true);
  // signature pads and drawing canvases
  document.addEventListener('pointerdown', function(e) { if (e.isTrusted && e.target && e.target.tagName === 'CANVAS') userEdited = true; }, true);

  function reload() {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  }

  function showUpdateBanner() {
    if (document.getElementById('nwUpdateBanner')) return;
    var b = document.createElement('div');
    b.id = 'nwUpdateBanner';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));z-index:2147483000;' +
      'max-width:560px;margin:0 auto;background:#111318;color:#fff;border-radius:12px;padding:10px 12px 10px 14px;' +
      'display:flex;align-items:center;gap:10px;font:600 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.25)';
    b.innerHTML = '<span style="flex:1">New version of the app is ready. Save your work first, then tap Update.</span>' +
      '<button type="button" data-u style="background:#0696D7;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer">Update</button>' +
      '<button type="button" data-x aria-label="Later" style="background:transparent;color:#9ca3af;border:0;font-size:18px;line-height:1;padding:4px 6px;cursor:pointer">✕</button>';
    b.querySelector('[data-u]').addEventListener('click', reload);
    b.querySelector('[data-x]').addEventListener('click', function() { b.remove(); });
    (document.body || document.documentElement).appendChild(b);
  }

  // A new version took control of this page
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (refreshing) return;
    if (userEdited) { console.log('[sw-register] New version active — waiting for the user (unsaved input on this page)'); showUpdateBanner(); return; }
    console.log('[sw-register] New version active — reloading...');
    reload();
  });

  // Register and check for updates
  navigator.serviceWorker.register('sw.js').then(function(reg) {
    // Check for updates every 10 seconds while page is open
    setInterval(function() {
      reg.update().catch(function() {});
    }, 10000);

    // If there's a waiting SW (installed but not yet active), activate it
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // When a new SW is found and installed, activate it immediately
    reg.addEventListener('updatefound', function() {
      var newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', function() {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[sw-register] New version installed — activating...');
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch(function(err) {
    console.error('[sw-register] Registration failed:', err);
  });
})();
