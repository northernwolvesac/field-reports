const CACHE_NAME = 'nw-field-v366';
const ASSETS = [
  './',
  './ai-chat.js',
  './ai-estimator.html',
  './ai-summary.js',
  './assembly-library.html',
  './auth.js',
  './bid-actions.js',
  './bid-board.html',
  './bid-project.html',
  './change-order.html',
  './cloud-save.js',
  './crew.html',
  './customer-utils.js',
  './customers.html',
  './dispatch.html',
  './draft-utils.js',
  './driver-schedule.html',
  './edit-utils.js',
  './email-utils.js',
  './equipment-utils.js',
  './equipment.html',
  './est-drawings.js',
  './est-engine.js',
  './est-import.html',
  './est-knowledge.html',
  './est-totals.js',
  './estimating.html',
  './favicon-32.png',
  './field-orders.html',
  './form-utils.js',
  './geo-takeoff.js',
  './history.html',
  './icon-192.png',
  './icon-512.png',
  './index.html',
  './install.html',
  './invoicing.html',
  './labor-rates.js',
  './login.html',
  './logo-header.png',
  './logo-wolf-dark.png',
  './logo-wolf.png',
  './management.html',
  './manifest.json',
  './nw-catalog-picker.js',
  './nw-drive-browser.js',
  './nw-drive.js',
  './nw-form-kit.js',
  './nw-proposal.js',
  './pdf-utils.js',
  './pm-checklist.html',
  './pm-templates.html',
  './po.html',
  './procore-ui.css',
  './procore-ui.js',
  './project-files.html',
  './project-managers.html',
  './project-utils.js',
  './projects.html',
  './purchase-orders.html',
  './nw-email.js',
  './report-view.html',
  './rfi.html',
  './schedule-utils.js',
  './schedule.html',
  './service-call-report.html',
  './site-survey-report.html',
  './startup-report.html',
  './styles.css',
  './subcontractors.html',
  './submittal.html',
  './submittals-generator.html',
  './supabase-config.js',
  './support.html',
  './sw-register.js',
  './takeoff.html',
  './vendors.html',
  './warranty.html',
  './wip.html',
  './work-order.html',
  './workload.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
];

// CDN URLs — these rarely change, safe to cache-first
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];

function isCDN(url) {
  try {
    var host = new URL(url).hostname;
    return CDN_HOSTS.some(function(h) { return host === h; });
  } catch(e) { return false; }
}

// Install — fill this version's cache.
//   own files : conditional request (cache:'no-cache') → GitHub Pages answers 304 for unchanged files, so a deploy costs a few KB, not MBs
//   CDN files : never change → copied from the previous version's cache instead of downloaded again
//   one missing file must not abort the whole install (cache.addAll would)
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const oldNames = (await caches.keys()).filter(k => k !== CACHE_NAME);
    await Promise.all(ASSETS.map(async u => {
      const cdn = /^https?:/.test(u) && isCDN(u);
      if (cdn) {
        for (const k of oldNames) {
          const hit = await (await caches.open(k)).match(u);
          if (hit) { await cache.put(u, hit); return; }
        }
      }
      try { await cache.add(new Request(u, { cache: cdn ? 'default' : 'no-cache' })); } catch (e) { /* skip */ }
    }));
    await self.skipWaiting();
  })());
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Message — allow page to trigger skipWaiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Web Push — show notification when Edge Function delivers a push
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); }
  catch (e) { payload = { title: 'Northern Wolves', body: event.data.text() }; }
  const title = payload.title || 'Northern Wolves Schedule';
  const options = {
    body: payload.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: payload.url || './schedule.html', entry_id: payload.entry_id || null },
    tag: 'nw-' + (payload.entry_id || payload.notification_id || Date.now()),
    renotify: true,
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// When the user taps the push notification, focus an existing window or open a new one.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './schedule.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        // Match by app origin (PWA scope)
        if (client.url && client.url.indexOf(self.registration.scope) === 0 && 'focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// Fetch strategy (performance pass 2026-09-29):
//   CDN libraries          → cache-first (they never change)
//   same-origin app files  → stale-while-revalidate: the cached copy is served at once (no waiting for the network), a conditional
//                            request refreshes it in the background. A deploy changes CACHE_NAME, so a new version starts with fresh copies.
//   everything else (Supabase API + storage, Drive proxy, EmailJS …) → NOT handled here: straight to the network. Before this pass every
//   API response (thousands of estimate lines, PDFs) was cloned into Cache Storage on every request.
self.addEventListener('fetch', event => {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (isCDN(request.url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      // ignoreSearch: '?v=337' cache-busters and page parameters (history.html?type=…) all map to the one cached file
      return cache.match(request, { ignoreSearch: true }).then(cached => {
        var refresh = fetch(request, { cache: 'no-cache' }).then(response => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        });
        if (cached) {
          event.waitUntil(refresh.catch(() => {}));
          return cached;
        }
        return refresh.catch(() => {
          if (request.mode === 'navigate') return cache.match('./index.html');
          return Response.error();
        });
      });
    })
  );
});
