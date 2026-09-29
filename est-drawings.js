/* ═══════════════════════════════════════════════════════════════════
   est-drawings.js — shared drawing (PDF plan) helpers for the estimating
   module: takeoff.html (plan viewer) and bid-project.html (Documents tab).

   window.EstDrawings
     ensurePdfjs()                       → Promise<pdfjsLib>  (loads pdf.js 3.11.174 + worker if the page did not)
     list(rootId)                        → Promise<rows[]>    estimate_drawings for the root estimate, oldest first
     pages(rows)                         → [{drawing,page,sheet,scale,key}]  flattened plan list (one entry per PDF page)
     upload(rootId, fileList, opts)      → Promise<{rows:[], errors:[{file,message}]}>
                                           NEVER throws per file: a failed file (non-PDF, storage or RLS/insert error — storage object
                                           rolled back) lands in errors[]; callers MUST read errors[] and rows.length before toasting.
                                           opts: {onProgress(info), uploadedBy, drawingType:'base'}
                                           info: ONE object {index,total,file,stage:'upload'|'pages'|'insert'|'done'|'error',row,error}
     detectPage(pdfPage)                 → Promise<{sheet, scale, scaleLabel, ppf}>   one already-loaded pdf.js page (used by takeoff on open)
     detectSheets(row, opts)             → Promise<{meta, pages:{'1':{sheet,scale,scaleLabel,ppf}}}>
                                           every page (or opts.pages=[..]) → UPDATE estimate_drawings.page_meta (merged, only when something
                                           changed; throws when RLS blocks the save). A page already parsed (sheet + explicit scale key, scale
                                           may be null) is skipped unless opts.force. A doc opened only for detection is released afterwards.
     signedUrl(storage_path, opts)       → Promise<string>   cached ~55 min; opts.download = true | 'file name.pdf'
     doc(row)                            → Promise<PDFDocumentProxy>  cached per drawing id
     thumbnail(row, page=1, width=142)   → Promise<dataURL>  JPEG, in-flight promise cached (id:page:width); rendered at min(2×width, 800px)
     remove(row)                         → Promise<void>     deletes the row (throws when 0 rows deleted → RLS), and the storage object when no other row shares it
     rename(id, filename)                → Promise<row>
     download(row)                       → Promise<void>     opens a signed download URL in a new tab
     forget(idOrRow)                     → clears the pdf.js / thumbnail cache for one drawing (or everything when omitted)
     scaleLabel(inchesPerFoot)           → '1/8" = 1\''   scaleToPpf(inchesPerFoot) → PDF points per foot
     sanitizeName(name), pageCount(file), storagePath(rootId, name)
     BUCKET, SHEET_RE, SCALE_RE, PDFJS_VERSION

   Data conventions (plan §8): drawings are keyed by rootId (est.parent_estimate_id || est.id);
   page_meta is {"<page>": {sheet:'M-201', scale:'0.125'}} — scale = paper inches per foot as a string
   (same format takeoff.html has always stored; scaleToPpf(scale) gives PDF points per foot).
   Copies made by BidActions.copyProject share the same storage_path, so remove() only deletes the
   storage object when the path is no longer referenced by any estimate_drawings row.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BUCKET = 'estimate-drawings';
  var PDFJS_VERSION = '3.11.174';
  var PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/';
  var URL_TTL = 3600;                 // seconds requested from Storage
  var URL_REUSE_MS = 55 * 60 * 1000;  // reuse a cached link for 55 min, then ask for a fresh one

  // sheet numbers: M-101, M101, MP-201.1, E-401 … (last occurrence on the page = title block)
  var SHEET_RE = /\b([A-Z]{1,2}-?\d{3}(?:\.\d{1,2})?)\b/g;
  // stated scales: 1/8" = 1'-0", 3/16"=1', 1" = 1'-0 …  → captured group = inches per foot (fraction or integer)
  var SCALE_RE = /(\d+(?:\s*\/\s*\d+)?)\s*["”]\s*=\s*1\s*['’]\s*-?\s*0?\s*["”]?/g;

  var urlCache = {};    // storage_path[|dl:<name>] → {url, at}
  var docCache = {};    // drawing id → Promise<PDFDocumentProxy>
  var thumbCache = {};  // id:page:width → data URL
  var pdfjsLoading = null;

  function sb() {
    if (!window.supabaseClient) throw new Error('supabaseClient is not loaded (supabase-config.js)');
    return window.supabaseClient;
  }

  // ─── pdf.js ─────────────────────────────────────────────────────────
  function ensureWorker() {
    var lib = window.pdfjsLib;
    if (lib && lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
    return lib;
  }
  function ensurePdfjs() {
    if (window.pdfjsLib) return Promise.resolve(ensureWorker());
    if (pdfjsLoading) return pdfjsLoading;
    pdfjsLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS_BASE + 'pdf.min.js';
      s.onload = function () { pdfjsLoading = null; if (window.pdfjsLib) resolve(ensureWorker()); else reject(new Error('pdf.js did not initialise')); };
      s.onerror = function () { pdfjsLoading = null; reject(new Error('Could not load pdf.js ' + PDFJS_VERSION)); };
      document.head.appendChild(s);
    });
    return pdfjsLoading;
  }
  // set the worker right away when the page already loaded pdf.js before us
  ensureWorker();

  // ─── helpers ─────────────────────────────────────────────────────────
  function sanitizeName(name) { return String(name || 'drawing.pdf').replace(/[^A-Za-z0-9._-]/g, '_'); }
  function storagePath(rootId, name) { return rootId + '/' + Date.now() + '_' + sanitizeName(name); }
  function isPdf(file) { return /pdf$/i.test(file.type || '') || /\.pdf$/i.test(file.name || ''); }
  function frac(s) { s = String(s).replace(/\s+/g, ''); if (s.indexOf('/') >= 0) { var p = s.split('/'); return +p[0] / +p[1]; } return +s; }
  function scaleToPpf(inchesPerFoot) { var n = Number(inchesPerFoot); return n > 0 ? n * 72 : null; }
  // 0.125 → 1/8" = 1'   ·   0.1875 → 3/16" = 1'   ·   0.1 → 1" = 10'   ·   1 → 1" = 1'
  function scaleLabel(inchesPerFoot) {
    var n = Number(inchesPerFoot); if (!(n > 0)) return '';
    var dens = [1, 2, 4, 8, 16, 32, 64];
    for (var i = 0; i < dens.length; i++) { var num = n * dens[i]; if (Math.abs(num - Math.round(num)) < 1e-6) { num = Math.round(num); return (dens[i] === 1 ? num : (num > dens[i] ? Math.floor(num / dens[i]) + ' ' + (num % dens[i]) + '/' + dens[i] : num + '/' + dens[i])) + '" = 1\''; } }
    var inv = 1 / n; if (Math.abs(inv - Math.round(inv)) < 1e-6) return '1" = ' + Math.round(inv) + '\'';
    return n.toFixed(3) + '" = 1\'';
  }
  async function pageCount(file) {
    var lib = await ensurePdfjs();
    var doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    var n = doc.numPages; try { doc.destroy(); } catch (e) {}
    return n;
  }
  async function currentUserId() {
    try { var u = await sb().auth.getUser(); return u.data && u.data.user ? u.data.user.id : null; } catch (e) { return null; }
  }

  // ─── list / pages ────────────────────────────────────────────────────
  async function list(rootId) {
    var r = await sb().from('estimate_drawings').select('*').eq('estimate_id', rootId).order('created_at');
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  }
  function pages(rows) {
    var out = [];
    (rows || []).forEach(function (d) {
      for (var p = 1; p <= (d.page_count || 1); p++) {
        var meta = (d.page_meta || {})[String(p)] || {};
        out.push({ drawing: d, page: p, sheet: meta.sheet || null, scale: meta.scale || null, key: d.id + ':' + p });
      }
    });
    return out;
  }

  // ─── upload ──────────────────────────────────────────────────────────
  async function upload(rootId, fileList, opts) {
    opts = opts || {};
    var files = Array.prototype.slice.call(fileList || []);
    var rows = [], errors = [];
    if (!rootId) throw new Error('upload: rootId is required');
    if (!files.length) return { rows: rows, errors: errors };
    var uploadedBy = opts.uploadedBy || await currentUserId();
    var progress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};
    var client = sb();
    for (var i = 0; i < files.length; i++) {
      var file = files[i], info = { index: i, total: files.length, file: file, stage: 'upload', row: null, error: null };
      try {
        if (!isPdf(file)) throw new Error(file.name + ': only PDF drawings can be uploaded');
        progress(info);
        var path = storagePath(rootId, file.name);
        var up = await client.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });
        if (up.error) throw new Error('Upload failed: ' + up.error.message);
        info.stage = 'pages'; progress(info);
        var n = 1;
        try { n = await pageCount(file); } catch (e) { console.warn('est-drawings: page count', e); }
        info.stage = 'insert'; progress(info);
        var ins = await client.from('estimate_drawings').insert({
          estimate_id: rootId, filename: file.name, storage_path: path, page_count: n,
          drawing_type: opts.drawingType || 'base', uploaded_by: uploadedBy
        }).select().single();
        if (ins.error) { try { await client.storage.from(BUCKET).remove([path]); } catch (e) {} throw new Error(ins.error.message); }
        info.row = ins.data; info.stage = 'done'; progress(info);
        rows.push(ins.data);
      } catch (e) {
        info.stage = 'error'; info.error = e; progress(info);
        errors.push({ file: file, message: e.message || String(e) });
      }
    }
    return { rows: rows, errors: errors };
  }

  // ─── sheet number + scale detection ──────────────────────────────────
  // one loaded pdf.js page → {sheet, scale (inches/ft as string), scaleLabel, ppf}
  async function detectPage(pdfPage) {
    var tc = await pdfPage.getTextContent();
    var txt = tc.items.map(function (t) { return t.str; }).join(' ');
    var found = {}, m; SCALE_RE.lastIndex = 0;
    while ((m = SCALE_RE.exec(txt))) { var f = frac(m[1]); if (f > 0) found[f] = (found[f] || 0) + 1; }
    var best = null; Object.keys(found).forEach(function (k) { if (!best || found[k] > found[best]) best = k; });
    // the sheet number sits in the title block, i.e. among the last text on the page: take the candidate seen last
    var sheets = {}, s; SHEET_RE.lastIndex = 0;
    while ((s = SHEET_RE.exec(txt))) sheets[s[1]] = s.index;
    var sheet = Object.keys(sheets).sort(function (a, b) { return sheets[b] - sheets[a]; })[0] || null;
    return { sheet: sheet, scale: best ? String(best) : null, scaleLabel: best ? scaleLabel(best) : null, ppf: best ? scaleToPpf(best) : null };
  }
  // every page of a drawing row (or opts.pages) → merged page_meta saved to the row; returns {meta, pages}
  async function detectSheets(row, opts) {
    opts = opts || {};
    if (!row || !row.id) throw new Error('detectSheets: drawing row required');
    var hadDoc = !!docCache[row.id];   // opened only for detection → release it again at the end
    var pdf = await doc(row);
    var total = row.page_count || pdf.numPages || 1;
    var want = Array.isArray(opts.pages) && opts.pages.length ? opts.pages : null;
    var meta = Object.assign({}, row.page_meta || {}), result = {}, changed = false;
    try {
      for (var p = 1; p <= total; p++) {
        if (want && want.indexOf(p) < 0) continue;
        var cur = meta[String(p)] || {};
        // a page already parsed once has sheet + an explicit scale key (null when the sheet states none) — skip unless forced
        if (!opts.force && cur.sheet && ('scale' in cur)) { result[String(p)] = { sheet: cur.sheet, scale: cur.scale || null, scaleLabel: cur.scale ? scaleLabel(cur.scale) : null, ppf: cur.scale ? scaleToPpf(cur.scale) : null }; continue; }
        try {
          var pg = await pdf.getPage(p), d = await detectPage(pg);
          var next = Object.assign({}, cur);
          next.sheet = d.sheet || (opts.force ? null : (cur.sheet || null));
          next.scale = d.scale || (opts.force ? null : (cur.scale || null));
          if (next.sheet !== (cur.sheet || null) || next.scale !== (cur.scale || null) || !('scale' in cur) || !('sheet' in cur)) changed = true;
          meta[String(p)] = next; result[String(p)] = d;
          if (typeof opts.onPage === 'function') opts.onPage(p, d, total);
        } catch (e) { console.warn('est-drawings: detect page ' + p, e); }
      }
    } finally {
      if (!hadDoc) forget(row.id);
    }
    if (!changed) return { meta: meta, pages: result };
    var r = await sb().from('estimate_drawings').update({ page_meta: meta }).eq('id', row.id).select('id');
    if (r.error) throw new Error(r.error.message);
    if (!r.data || !r.data.length) throw new Error('page_meta not saved (drawing not found or no permission)');
    row.page_meta = meta;
    return { meta: meta, pages: result };
  }

  // ─── signed urls / documents ────────────────────────────────────────
  async function signedUrl(storage_path, opts) {
    opts = opts || {};
    if (!storage_path) throw new Error('signedUrl: storage_path required');
    var dl = opts.download ? (typeof opts.download === 'string' ? opts.download : true) : false;
    var key = storage_path + (dl ? '|dl:' + dl : '');
    var hit = urlCache[key];
    if (hit && Date.now() - hit.at < URL_REUSE_MS) return hit.url;
    var s = await sb().storage.from(BUCKET).createSignedUrl(storage_path, URL_TTL, dl ? { download: dl } : undefined);
    if (s.error) throw new Error(s.error.message);
    urlCache[key] = { url: s.data.signedUrl, at: Date.now() };
    return s.data.signedUrl;
  }
  function doc(row) {
    if (!row || !row.id) return Promise.reject(new Error('doc: drawing row required'));
    if (docCache[row.id]) return docCache[row.id];
    docCache[row.id] = (async function () {
      var lib = await ensurePdfjs();
      var url = await signedUrl(row.storage_path);
      return lib.getDocument(url).promise;
    })();
    docCache[row.id].catch(function () { delete docCache[row.id]; });
    return docCache[row.id];
  }
  // JPEG thumbnail of one page, rendered once per (drawing, page, width)
  // the cache holds the in-flight promise, so concurrent requests for the same page render it once
  function thumbnail(row, page, width) {
    if (!row || !row.id) return Promise.reject(new Error('thumbnail: drawing row required'));
    page = page || 1; width = width || 142;
    var key = row.id + ':' + page + ':' + width;
    if (thumbCache[key]) return thumbCache[key];
    thumbCache[key] = (async function () {
      var pdf = await doc(row), pg = await pdf.getPage(page), v1 = pg.getViewport({ scale: 1 });
      var sc = Math.min(width * 2, 800) / v1.width;        // 2× for crisp retina thumbnails, capped at 800px wide
      var v = pg.getViewport({ scale: sc });
      var c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
      var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: cx, viewport: v, intent: 'print' }).promise;
      return c.toDataURL('image/jpeg', 0.72);
    })();
    thumbCache[key].catch(function () { delete thumbCache[key]; });
    return thumbCache[key];
  }
  function forget(idOrRow) {
    if (!idOrRow) {
      Object.keys(docCache).forEach(function (id) { docCache[id].then(function (d) { try { d.destroy(); } catch (e) {} }).catch(function () {}); });
      docCache = {}; thumbCache = {}; urlCache = {};
      return;
    }
    var id = typeof idOrRow === 'string' ? idOrRow : idOrRow.id;
    if (docCache[id]) { docCache[id].then(function (d) { try { d.destroy(); } catch (e) {} }).catch(function () {}); delete docCache[id]; }
    Object.keys(thumbCache).forEach(function (k) { if (k.indexOf(id + ':') === 0) delete thumbCache[k]; });
    if (idOrRow.storage_path) Object.keys(urlCache).forEach(function (k) { if (k.indexOf(idOrRow.storage_path) === 0) delete urlCache[k]; });
  }

  // ─── remove / rename / download ─────────────────────────────────────
  async function remove(row) {
    if (!row || !row.id) throw new Error('remove: drawing row required');
    var client = sb();
    // .select('id') so an RLS-filtered delete (0 rows, no error) is reported instead of silently "succeeding"
    var del = await client.from('estimate_drawings').delete().eq('id', row.id).select('id');
    if (del.error) throw new Error(del.error.message);
    if (!del.data || !del.data.length) throw new Error('Drawing was not deleted (not found or no permission)');
    forget(row);
    if (!row.storage_path) return;
    // copied projects share the same storage object — keep it while another row still points at it
    var others = await client.from('estimate_drawings').select('id', { count: 'exact', head: true }).eq('storage_path', row.storage_path);
    if (!others.error && (others.count || 0) > 0) return;
    var rm = await client.storage.from(BUCKET).remove([row.storage_path]);
    if (rm.error) console.warn('est-drawings: storage remove', rm.error.message);
  }
  async function rename(id, filename) {
    filename = String(filename || '').trim();
    if (!id || !filename) throw new Error('rename: id and filename required');
    if (!/\.pdf$/i.test(filename)) filename += '.pdf';
    var r = await sb().from('estimate_drawings').update({ filename: filename }).eq('id', id).select().single();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  async function download(row) {
    var url = await signedUrl(row.storage_path, { download: row.filename || true });
    var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = row.filename || '';
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.EstDrawings = {
    BUCKET: BUCKET, SHEET_RE: SHEET_RE, SCALE_RE: SCALE_RE, PDFJS_VERSION: PDFJS_VERSION,
    ensurePdfjs: ensurePdfjs,
    list: list, pages: pages, upload: upload,
    detectPage: detectPage, detectSheets: detectSheets,
    signedUrl: signedUrl, doc: doc, thumbnail: thumbnail, forget: forget,
    remove: remove, rename: rename, download: download,
    scaleLabel: scaleLabel, scaleToPpf: scaleToPpf, sanitizeName: sanitizeName, storagePath: storagePath, pageCount: pageCount
  };
})();
